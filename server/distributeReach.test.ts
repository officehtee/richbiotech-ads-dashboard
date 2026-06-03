import { describe, it, expect } from "vitest";
import { distributeReachIntoDaily } from "./metaApi";

type Row = {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  messages: number;
  purchases: number;
  purchase_value: number;
  reach: number;
  cost_per_message: number | null;
  purchase_roas: number | null;
};

function makeRow(partial: Partial<Row>): Row {
  return {
    ad_id: "ad1",
    ad_name: "Ad 1",
    adset_id: "as1",
    adset_name: "Adset 1",
    campaign_id: "c1",
    campaign_name: "Campaign 1",
    date: "2026-06-01",
    spend: 100,
    impressions: 1000,
    clicks: 10,
    ctr: 1,
    messages: 5,
    purchases: 0,
    purchase_value: 0,
    reach: 0,
    cost_per_message: null,
    purchase_roas: null,
    ...partial,
  };
}

describe("distributeReachIntoDaily", () => {
  it("เฉลี่ย reach รวมตามสัดส่วน impressions ของแต่ละวัน", () => {
    const rows = [
      makeRow({ ad_id: "ad1", date: "2026-06-01", impressions: 600, reach: 0 }),
      makeRow({ ad_id: "ad1", date: "2026-06-02", impressions: 400, reach: 0 }),
    ];
    const reachMap = new Map<string, number>([["ad1", 1000]]);
    const out = distributeReachIntoDaily(rows, reachMap);
    expect(out[0].reach).toBe(600); // 600/1000 * 1000
    expect(out[1].reach).toBe(400); // 400/1000 * 1000
  });

  it("เฉลี่ยเท่ากันทุกวันเมื่อ impressions รวม = 0", () => {
    const rows = [
      makeRow({ ad_id: "ad1", date: "2026-06-01", impressions: 0, reach: 0 }),
      makeRow({ ad_id: "ad1", date: "2026-06-02", impressions: 0, reach: 0 }),
    ];
    const reachMap = new Map<string, number>([["ad1", 200]]);
    const out = distributeReachIntoDaily(rows, reachMap);
    expect(out[0].reach).toBe(100);
    expect(out[1].reach).toBe(100);
  });

  it("ไม่ override เมื่อมีแถวที่ reach > 0 อยู่แล้ว", () => {
    const rows = [
      makeRow({ ad_id: "ad1", date: "2026-06-01", impressions: 600, reach: 555 }),
      makeRow({ ad_id: "ad1", date: "2026-06-02", impressions: 400, reach: 0 }),
    ];
    const reachMap = new Map<string, number>([["ad1", 1000]]);
    const out = distributeReachIntoDaily(rows, reachMap);
    expect(out[0].reach).toBe(555);
    expect(out[1].reach).toBe(0);
  });

  it("ข้าม ad_id ที่ไม่มีใน reachMap", () => {
    const rows = [makeRow({ ad_id: "ad99", reach: 0 })];
    const reachMap = new Map<string, number>([["ad1", 1000]]);
    const out = distributeReachIntoDaily(rows, reachMap);
    expect(out[0].reach).toBe(0);
  });

  it("ข้ามเมื่อ totalReach <= 0", () => {
    const rows = [makeRow({ ad_id: "ad1", reach: 0 })];
    const reachMap = new Map<string, number>([["ad1", 0]]);
    const out = distributeReachIntoDaily(rows, reachMap);
    expect(out[0].reach).toBe(0);
  });

  it("แยกการกระจายแต่ละ ad_id เป็นอิสระ", () => {
    const rows = [
      makeRow({ ad_id: "ad1", date: "2026-06-01", impressions: 500, reach: 0 }),
      makeRow({ ad_id: "ad1", date: "2026-06-02", impressions: 500, reach: 0 }),
      makeRow({ ad_id: "ad2", date: "2026-06-01", impressions: 1000, reach: 0 }),
    ];
    const reachMap = new Map<string, number>([
      ["ad1", 800],
      ["ad2", 1500],
    ]);
    const out = distributeReachIntoDaily(rows, reachMap);
    expect(out[0].reach).toBe(400);
    expect(out[1].reach).toBe(400);
    expect(out[2].reach).toBe(1500);
  });

  it("คืน reference เดิม (mutate in place)", () => {
    const rows = [makeRow({ ad_id: "ad1", impressions: 100, reach: 0 })];
    const reachMap = new Map<string, number>([["ad1", 50]]);
    const out = distributeReachIntoDaily(rows, reachMap);
    expect(out).toBe(rows);
    expect(rows[0].reach).toBe(50);
  });
});
