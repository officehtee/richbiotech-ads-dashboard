import { describe, it, expect } from "vitest";
import { isCampaignNew } from "../client/src/pages/AdIntelligence";

/**
 * Round 7.27 — NEW badge ผูกกับ "วันแรกที่แคมเปญเริ่มยิง" เทียบกับ "วันนี้จริง"
 * ไม่ขึ้นกับช่วงวันที่กรอง (dateFrom/dateTo) อีกต่อไป
 *
 * เงื่อนไข NEW: today − campaignFirstDate ≤ 3 วัน
 */

describe("isCampaignNew", () => {
  // ─────────────────────────────────────────────
  // เคสตามโจทย์ผู้ใช้
  // ─────────────────────────────────────────────
  it("วันนี้ 5 มิ.ย. / แคมเปญ A เริ่มยิง 1 มิ.ย. → ผ่าน 4 วัน → ไม่ NEW", () => {
    const today = new Date(2026, 5, 5); // 2026-06-05 (month is 0-indexed)
    expect(isCampaignNew("2026-06-01", today)).toBe(false);
  });

  it("วันนี้ 5 มิ.ย. / แคมเปญ B เริ่มยิง 4 มิ.ย. → ผ่าน 1 วัน → NEW", () => {
    const today = new Date(2026, 5, 5);
    expect(isCampaignNew("2026-06-04", today)).toBe(true);
  });

  // ─────────────────────────────────────────────
  // ขอบเขตวันที่
  // ─────────────────────────────────────────────
  it("เริ่มวันนี้เป๊ะ (0 วัน) → NEW", () => {
    const today = new Date(2026, 5, 5);
    expect(isCampaignNew("2026-06-05", today)).toBe(true);
  });

  it("ผ่านมาพอดี 3 วัน → ยัง NEW (≤ 3)", () => {
    const today = new Date(2026, 5, 5);
    expect(isCampaignNew("2026-06-02", today)).toBe(true);
  });

  it("ผ่านมา 4 วัน → ไม่ NEW", () => {
    const today = new Date(2026, 5, 5);
    expect(isCampaignNew("2026-06-01", today)).toBe(false);
  });

  // ─────────────────────────────────────────────
  // กรณีไม่ปกติ
  // ─────────────────────────────────────────────
  it("campaignFirstDate เป็น null → ไม่ NEW", () => {
    expect(isCampaignNew(null, new Date(2026, 5, 5))).toBe(false);
  });

  it("campaignFirstDate เป็น undefined → ไม่ NEW", () => {
    expect(isCampaignNew(undefined, new Date(2026, 5, 5))).toBe(false);
  });

  it("รูปแบบวันที่ผิด → ไม่ NEW", () => {
    expect(isCampaignNew("01/06/2026", new Date(2026, 5, 5))).toBe(false);
    expect(isCampaignNew("2026-6-1", new Date(2026, 5, 5))).toBe(false);
    expect(isCampaignNew("", new Date(2026, 5, 5))).toBe(false);
  });

  it("first date อยู่ในอนาคต → ไม่ NEW (กันข้อมูลผิด)", () => {
    const today = new Date(2026, 5, 5);
    expect(isCampaignNew("2026-06-10", today)).toBe(false);
  });

  // ─────────────────────────────────────────────
  // การกรองช่วงวันที่ต้องไม่กระทบ logic — สื่อด้วยว่าใช้แค่ today
  // ─────────────────────────────────────────────
  it("ผู้ใช้กรองดู 29 พ.ค. วันเดียว → NEW ขึ้นกับวันนี้จริง ไม่ใช่ 29 พ.ค.", () => {
    // วันนี้จริง = 5 มิ.ย. แม้ผู้ใช้กรอง dateTo เป็น 29 พ.ค.
    const today = new Date(2026, 5, 5);
    // แคมเปญที่เริ่มยิง 28 พ.ค. → ผ่าน 8 วัน → ต้องไม่ NEW
    expect(isCampaignNew("2026-05-28", today)).toBe(false);
    // แคมเปญที่เริ่มยิง 4 มิ.ย. → ผ่าน 1 วัน → ต้อง NEW
    expect(isCampaignNew("2026-06-04", today)).toBe(true);
  });

  it("ใช้ default (new Date()) เมื่อไม่ส่ง today: ผ่าน 100 วัน → ไม่ NEW", () => {
    const longAgo = new Date();
    longAgo.setDate(longAgo.getDate() - 100);
    const y = longAgo.getFullYear();
    const m = String(longAgo.getMonth() + 1).padStart(2, "0");
    const d = String(longAgo.getDate()).padStart(2, "0");
    expect(isCampaignNew(`${y}-${m}-${d}`)).toBe(false);
  });

  it("ใช้ default (new Date()) เมื่อไม่ส่ง today: วันนี้เริ่ม → NEW", () => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    expect(isCampaignNew(`${y}-${m}-${d}`)).toBe(true);
  });

  // ─────────────────────────────────────────────
  // ปลายปี / ต้นปี (ข้ามเดือน/ข้ามปี)
  // ─────────────────────────────────────────────
  it("ข้ามเดือน: today 02 มิ.ย. / first 30 พ.ค. → 3 วัน → NEW", () => {
    const today = new Date(2026, 5, 2);
    expect(isCampaignNew("2026-05-30", today)).toBe(true);
  });

  it("ข้ามปี: today 02 ม.ค. 2027 / first 31 ธ.ค. 2026 → 2 วัน → NEW", () => {
    const today = new Date(2027, 0, 2);
    expect(isCampaignNew("2026-12-31", today)).toBe(true);
  });
});
