import { describe, it, expect } from "vitest";
import { rollUpAdStatusToCampaign } from "./metaApi";

/**
 * Phase 3C — Part A: roll-up ad-level → campaign-level (pure function)
 *
 * ⚠️ จุด 2 (แยก 2 layer): test นี้เป็น layer ของ pure function — ป้อน status ใดก็ได้
 * (รวม ACTIVE) เพื่อทดสอบกฎ roll-up เต็มรูปแบบ. ใน production จริง filtering จะตัด
 * ad ACTIVE ทิ้งก่อนถึงฟังก์ชันนี้ (เห็นแค่ reject/wait) — นั่นเป็น layer ของ
 * fetchAdStatuses (รอ verify หลังปลด token) คนละชุดกับ test pure นี้.
 */
describe("Phase 3C/A — rollUpAdStatusToCampaign (pure)", () => {
  it("reject ชนะ: มี ad reject 1 ตัว (ที่เหลือ active) → campaign = DISAPPROVED", () => {
    const ads = [
      { campaignId: "c1", effectiveStatus: "ACTIVE" },
      { campaignId: "c1", effectiveStatus: "DISAPPROVED" },
      { campaignId: "c1", effectiveStatus: "ACTIVE" },
    ];
    const m = rollUpAdStatusToCampaign(ads);
    expect(m.get("c1")).toBe("DISAPPROVED");
  });

  it("reject ชนะ: WITH_ISSUES / ADSET_DISAPPROVED / CAMPAIGN_DISAPPROVED ก็นับ reject", () => {
    expect(
      rollUpAdStatusToCampaign([
        { campaignId: "c1", effectiveStatus: "WITH_ISSUES" },
      ]).get("c1"),
    ).toBe("DISAPPROVED");
    expect(
      rollUpAdStatusToCampaign([
        { campaignId: "c2", effectiveStatus: "ADSET_DISAPPROVED" },
      ]).get("c2"),
    ).toBe("DISAPPROVED");
    expect(
      rollUpAdStatusToCampaign([
        { campaignId: "c3", effectiveStatus: "CAMPAIGN_DISAPPROVED" },
      ]).get("c3"),
    ).toBe("DISAPPROVED");
  });

  it("ทุก ad active → campaign = ACTIVE (layer pure; production filtering จะตัด active ทิ้ง)", () => {
    const ads = [
      { campaignId: "c1", effectiveStatus: "ACTIVE" },
      { campaignId: "c1", effectiveStatus: "ACTIVE" },
    ];
    expect(rollUpAdStatusToCampaign(ads).get("c1")).toBe("ACTIVE");
  });

  it("มีแต่ wait (ไม่มี reject/active) → campaign = PENDING_REVIEW", () => {
    const ads = [
      { campaignId: "c1", effectiveStatus: "PENDING_REVIEW" },
      { campaignId: "c1", effectiveStatus: "IN_PROCESS" },
    ];
    expect(rollUpAdStatusToCampaign(ads).get("c1")).toBe("PENDING_REVIEW");
  });

  it("active ชนะ wait: มี active + wait (ไม่มี reject) → ACTIVE", () => {
    const ads = [
      { campaignId: "c1", effectiveStatus: "PENDING_REVIEW" },
      { campaignId: "c1", effectiveStatus: "ACTIVE" },
    ];
    expect(rollUpAdStatusToCampaign(ads).get("c1")).toBe("ACTIVE");
  });

  it("mix reject + wait → reject ชนะ", () => {
    const ads = [
      { campaignId: "c1", effectiveStatus: "PENDING_REVIEW" },
      { campaignId: "c1", effectiveStatus: "DISAPPROVED" },
    ];
    expect(rollUpAdStatusToCampaign(ads).get("c1")).toBe("DISAPPROVED");
  });

  it("จุด 1 — ทุก ad เป็น closed (PAUSED/ARCHIVED) → ไม่ set → fallback (no entry)", () => {
    const ads = [
      { campaignId: "c1", effectiveStatus: "PAUSED" },
      { campaignId: "c1", effectiveStatus: "ARCHIVED" },
    ];
    const m = rollUpAdStatusToCampaign(ads);
    expect(m.has("c1")).toBe(false); // ไม่ set → caller ใช้ค่า campaign-level เดิม
  });

  it("จุด 1 — closed + reject → reject ชนะ (closed ไม่บัง reject)", () => {
    const ads = [
      { campaignId: "c1", effectiveStatus: "PAUSED" },
      { campaignId: "c1", effectiveStatus: "DISAPPROVED" },
    ];
    expect(rollUpAdStatusToCampaign(ads).get("c1")).toBe("DISAPPROVED");
  });

  it("ads ว่าง (graceful fail) → Map ว่าง → fallback campaign-level เดิมทุกตัว", () => {
    const m = rollUpAdStatusToCampaign([]);
    expect(m.size).toBe(0);
  });

  it("ข้าม ad ที่ไม่มี campaignId (ป้องกัน key ว่าง)", () => {
    const ads = [
      { campaignId: "", effectiveStatus: "DISAPPROVED" },
      { campaignId: "c1", effectiveStatus: "DISAPPROVED" },
    ];
    const m = rollUpAdStatusToCampaign(ads);
    expect(m.has("")).toBe(false);
    expect(m.get("c1")).toBe("DISAPPROVED");
  });

  it("หลาย campaign แยกกันถูกต้อง", () => {
    const ads = [
      { campaignId: "c1", effectiveStatus: "DISAPPROVED" },
      { campaignId: "c2", effectiveStatus: "ACTIVE" },
      { campaignId: "c3", effectiveStatus: "PENDING_REVIEW" },
    ];
    const m = rollUpAdStatusToCampaign(ads);
    expect(m.get("c1")).toBe("DISAPPROVED");
    expect(m.get("c2")).toBe("ACTIVE");
    expect(m.get("c3")).toBe("PENDING_REVIEW");
  });
});
