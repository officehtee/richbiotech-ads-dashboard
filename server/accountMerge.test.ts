import { describe, expect, it } from "vitest";
import { decideAccountMerge } from "./accountMerge";

describe("decideAccountMerge — Auto-Merge decision (ตัวเลือก C)", () => {
  const BM_ID = 42;

  it("คืน 'create' เมื่อไม่เจอแถวเดิม (null)", () => {
    expect(decideAccountMerge(null, BM_ID)).toBe("create");
  });

  it("คืน 'create' เมื่อ existing เป็น undefined", () => {
    expect(decideAccountMerge(undefined, BM_ID)).toBe("create");
  });

  it("คืน 'convert' เมื่อแถวเดิมเป็นบัญชีเดี่ยว (bmId = null) → merge เข้า BM", () => {
    expect(decideAccountMerge({ id: 7, bmId: null }, BM_ID)).toBe("convert");
  });

  it("คืน 'noop' เมื่อแถวเดิมผูกกับ BM นี้อยู่แล้ว (bmId === bmDbId)", () => {
    expect(decideAccountMerge({ id: 7, bmId: BM_ID }, BM_ID)).toBe("noop");
  });

  it("คืน 'conflict' เมื่อแถวเดิมผูกกับ BM อื่น (bmId !== bmDbId) → ไม่แย่งมา", () => {
    expect(decideAccountMerge({ id: 7, bmId: 999 }, BM_ID)).toBe("conflict");
  });

  it("ปฏิบัติกับ bmId = 0 อย่างถูกต้อง (ไม่สับสนกับ null)", () => {
    // bmId = 0 ไม่ใช่ null → ถือว่าผูก BM อื่น (conflict กับ BM 42)
    expect(decideAccountMerge({ id: 7, bmId: 0 }, BM_ID)).toBe("conflict");
  });
});
