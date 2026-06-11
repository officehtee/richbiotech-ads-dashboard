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

import { shouldAutoReactivate } from "./accountMerge";

describe("shouldAutoReactivate — Auto-Reactivate decision", () => {
  it("threshold = 1 → ล้มเหลวครั้งแรก (streak เดิม 0) ก็ reactivate ทันที", () => {
    expect(shouldAutoReactivate(0, 1)).toBe(true);
  });

  it("threshold = 3 → streak เดิม 0 (รอบนี้เป็นครั้งที่ 1) ยังไม่ reactivate", () => {
    expect(shouldAutoReactivate(0, 3)).toBe(false);
  });

  it("threshold = 3 → streak เดิม 1 (รอบนี้เป็นครั้งที่ 2) ยังไม่ reactivate", () => {
    expect(shouldAutoReactivate(1, 3)).toBe(false);
  });

  it("threshold = 3 → streak เดิม 2 (รอบนี้เป็นครั้งที่ 3) → reactivate", () => {
    expect(shouldAutoReactivate(2, 3)).toBe(true);
  });

  it("streak เดิมเกิน threshold แล้ว → ยังคง reactivate (idempotent)", () => {
    expect(shouldAutoReactivate(5, 3)).toBe(true);
  });

  it("รองรับ NaN/undefined-ish (ส่ง 0) อย่างปลอดภัย", () => {
    // @ts-expect-error ทดสอบ runtime กับค่าที่อาจ undefined
    expect(shouldAutoReactivate(undefined, 1)).toBe(true);
  });
});
