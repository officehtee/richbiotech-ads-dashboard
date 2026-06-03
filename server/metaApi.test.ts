import { describe, it, expect } from "vitest";
import { dateRangeFromPreset } from "./metaApi";

describe("dateRangeFromPreset", () => {
  it("returns 7-day range for '7d' preset", () => {
    const r = dateRangeFromPreset("7d");
    expect(r.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.until).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const since = new Date(r.since);
    const until = new Date(r.until);
    const diffDays = Math.round((until.getTime() - since.getTime()) / 86400000);
    expect(diffDays).toBe(6); // 7 days inclusive
  });

  it("returns 30-day range for '30d' preset", () => {
    const r = dateRangeFromPreset("30d");
    const diffDays = Math.round((new Date(r.until).getTime() - new Date(r.since).getTime()) / 86400000);
    expect(diffDays).toBe(29);
  });

  it("returns 3-day range for '3d' preset", () => {
    const r = dateRangeFromPreset("3d");
    const diffDays = Math.round((new Date(r.until).getTime() - new Date(r.since).getTime()) / 86400000);
    expect(diffDays).toBe(2);
  });
});


import {
  extractPurchases,
  extractCostPerMessage,
  extractPurchaseRoas,
} from "./metaApi";

describe("Round 7.36 — extractPurchases (omni_purchase เดี่ยว กัน double count)", () => {
  it("ใช้ omni_purchase ตัวเดียว ไม่บวกซ้ำกับ fb_pixel_purchase", () => {
    const actions = [
      { action_type: "omni_purchase", value: "1" },
      { action_type: "offsite_conversion.fb_pixel_purchase", value: "1" },
      { action_type: "purchase", value: "1" },
    ];
    // เดิมบวก 3 ตัว = 3 (double count) → ตอนนี้ต้องได้ 1
    expect(extractPurchases(actions)).toBe(1);
  });

  it("fallback ไป purchase เมื่อไม่มี omni_purchase", () => {
    const actions = [{ action_type: "purchase", value: "2" }];
    expect(extractPurchases(actions)).toBe(2);
  });

  it("fallback ไป fb_pixel_purchase เมื่อไม่มี omni/purchase", () => {
    const actions = [
      { action_type: "offsite_conversion.fb_pixel_purchase", value: "5" },
    ];
    expect(extractPurchases(actions)).toBe(5);
  });

  it("คืน 0 เมื่อไม่มี action หรือ undefined", () => {
    expect(extractPurchases(undefined)).toBe(0);
    expect(extractPurchases([])).toBe(0);
  });
});

describe("Round 7.36 — extractCostPerMessage (cost_per_action_type)", () => {
  it("ดึงต้นทุนต่อการเริ่มสนทนาจาก cost_per_action_type", () => {
    const cpa = [
      {
        action_type: "onsite_conversion.messaging_conversation_started_7d",
        value: "33.5",
      },
    ];
    expect(extractCostPerMessage(cpa)).toBeCloseTo(33.5, 5);
  });

  it("คืน null เมื่อไม่พบ action type ที่ต้องการ", () => {
    const cpa = [{ action_type: "link_click", value: "5" }];
    expect(extractCostPerMessage(cpa)).toBeNull();
    expect(extractCostPerMessage(undefined)).toBeNull();
  });
});

describe("Round 7.36 — extractPurchaseRoas (purchase_roas)", () => {
  it("ดึง ROAS จาก omni_purchase ก่อน", () => {
    const roas = [
      { action_type: "omni_purchase", value: "0.61" },
      { action_type: "purchase", value: "0.5" },
    ];
    expect(extractPurchaseRoas(roas)).toBeCloseTo(0.61, 5);
  });

  it("รองรับ element เดียวที่ไม่ระบุ action_type", () => {
    const roas = [{ value: "2.34" }];
    expect(extractPurchaseRoas(roas)).toBeCloseTo(2.34, 5);
  });

  it("คืน null เมื่อไม่มีข้อมูล", () => {
    expect(extractPurchaseRoas(undefined)).toBeNull();
    expect(extractPurchaseRoas([])).toBeNull();
  });
});
