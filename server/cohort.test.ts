import { describe, expect, it } from "vitest";
import {
  aggregateDailyInsights,
  groupByWeekStart,
  indexByDayN,
  roasBucket,
} from "./aggregator";
import type { DailyInsight } from "./metaApi";

const d = (date: string, spend: number, purchase_value: number): DailyInsight => ({
  date,
  spend,
  messaging: 0,
  purchases: 0,
  purchase_value,
  impressions: spend * 100,
  clicks: spend,
});

describe("aggregateDailyInsights", () => {
  it("aggregates ROAS and CTR correctly", () => {
    const rows = [d("2026-05-20", 100, 250), d("2026-05-21", 200, 400)];
    const tot = aggregateDailyInsights(rows);
    expect(tot.spend).toBe(300);
    expect(tot.purchaseValue).toBe(650);
    expect(tot.roas).toBeCloseTo(650 / 300, 4);
    expect(tot.ctr).toBeCloseTo(1, 4); // clicks/impressions = 300/30000 = 0.01 → *100 = 1
  });
  it("returns 0 ROAS when spend == 0", () => {
    const tot = aggregateDailyInsights([d("2026-05-20", 0, 0)]);
    expect(tot.roas).toBe(0);
    expect(tot.ctr).toBe(0);
  });
});

describe("groupByWeekStart", () => {
  it("groups dates into Monday-anchored weeks", () => {
    // 2026-05-25 = Monday, 2026-05-26 = Tuesday, 2026-05-31 = Sunday → all same week
    const rows = [
      d("2026-05-25", 1, 2),
      d("2026-05-26", 1, 2),
      d("2026-05-31", 1, 2),
      d("2026-06-01", 1, 2), // next Monday
    ];
    const g = groupByWeekStart(rows);
    expect(g.size).toBe(2);
    expect(g.get("2026-05-25")?.length).toBe(3);
    expect(g.get("2026-06-01")?.length).toBe(1);
  });
});

describe("indexByDayN", () => {
  it("fills missing days with null and respects ordering", () => {
    const rows = [d("2026-05-25", 100, 200), d("2026-05-27", 50, 100)];
    const out = indexByDayN(rows, "2026-05-25", 5);
    expect(out).toHaveLength(5);
    expect(out[0].dayN).toBe(0);
    expect(out[0].insight?.spend).toBe(100);
    expect(out[1].insight).toBeNull(); // 2026-05-26 missing
    expect(out[2].insight?.spend).toBe(50);
    expect(out[4].dayN).toBe(4);
  });
});

describe("roasBucket", () => {
  it("maps ROAS to color buckets with default target=2", () => {
    expect(roasBucket(3.5)).toBe("great"); // >= 3.0
    expect(roasBucket(2.5)).toBe("good"); // >= 2.0
    expect(roasBucket(1.5)).toBe("ok"); // >= 1.4
    expect(roasBucket(1.0)).toBe("warn"); // >= 0.8
    expect(roasBucket(0.5)).toBe("bad"); // < 0.8
    expect(roasBucket(0)).toBe("bad");
  });
  it("respects custom target", () => {
    expect(roasBucket(5, 3)).toBe("great"); // >= 4.5
    expect(roasBucket(3, 3)).toBe("good");
  });
});
