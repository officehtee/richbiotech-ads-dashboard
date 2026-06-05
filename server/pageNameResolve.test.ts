import { describe, it, expect } from "vitest";
import { shouldUpdatePageName, resolvePageName } from "./deepAdsSync";

/**
 * Round 7.48 — คอลัมน์ "Page" แสดง "—"
 * ต้นเหตุ: sync เขียน pageName=null ลงทุกแถว + query ดึงจาก adInsightsDaily.pageName ตรง ๆ
 * แก้: (1) ไม่ clobber pageName เดิมด้วย null (2) query ใช้ COALESCE fallback กับ adAccounts.pageName
 */
describe("shouldUpdatePageName — ไม่เขียนทับด้วยค่าว่าง", () => {
  it("เขียนทับเมื่อได้ชื่อจริง", () => {
    expect(shouldUpdatePageName("ISURE PLUS")).toBe(true);
    expect(shouldUpdatePageName("เจ้าขุน")).toBe(true);
  });

  it("ไม่เขียนทับเมื่อเป็น null/undefined", () => {
    expect(shouldUpdatePageName(null)).toBe(false);
    expect(shouldUpdatePageName(undefined)).toBe(false);
  });

  it("ไม่เขียนทับเมื่อเป็นสตริงว่างหรือมีแต่ช่องว่าง", () => {
    expect(shouldUpdatePageName("")).toBe(false);
    expect(shouldUpdatePageName("   ")).toBe(false);
  });
});

describe("resolvePageName — COALESCE fallback (แถว → บัญชี → null)", () => {
  it("ใช้ชื่อระดับแถวเมื่อมี", () => {
    expect(resolvePageName("Row Page", "Account Page")).toBe("Row Page");
  });

  it("fallback ไปชื่อระดับบัญชีเมื่อแถวเป็น null", () => {
    expect(resolvePageName(null, "Account Page")).toBe("Account Page");
  });

  it("fallback ไปชื่อระดับบัญชีเมื่อแถวเป็นสตริงว่าง", () => {
    expect(resolvePageName("", "Account Page")).toBe("Account Page");
  });

  it("คืน null เมื่อทั้งสองระดับไม่มีค่า", () => {
    expect(resolvePageName(null, null)).toBe(null);
    expect(resolvePageName(undefined, undefined)).toBe(null);
    expect(resolvePageName("", "")).toBe(null);
  });

  it("ชื่อระดับแถวมาก่อนเสมอแม้บัญชีจะมีค่า", () => {
    expect(resolvePageName("เจ้าขุน", "ISURE PLUS")).toBe("เจ้าขุน");
  });
});
