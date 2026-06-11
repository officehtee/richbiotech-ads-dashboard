/**
 * Auto-Merge decision (ตัวเลือก C) — pure function, ทดสอบง่าย
 *
 * เมื่อ BM sync เจอ adAccountId ที่มีแถวอยู่แล้วใน DB ฟังก์ชันนี้จะตัดสินว่า
 * ควรทำอะไรกับแถวเดิม:
 *
 *   - "create"  : ไม่เจอแถวเดิมเลย → สร้างใหม่ผูก BM
 *   - "convert" : เจอแถวเดิมที่เป็น "บัญชีเดี่ยว" (bmId == null)
 *                 → แปลงให้ผูก BM นี้ (merge) + อัปเดต token เป็นของ BM
 *   - "relink"  : เจอแถวเดิมที่เคยผูก BM นี้อยู่แล้ว แต่ bmId อาจ null ชั่วคราว
 *                 (เผื่ออนาคต) — ปัจจุบันรวมกับ convert
 *   - "noop"    : เจอแถวเดิมที่ผูก BM นี้อยู่แล้ว (bmId === bmDbId) → ไม่ต้องแปลง
 *   - "conflict": เจอแถวเดิมที่ผูกกับ BM "อื่น" (bmId !== bmDbId) → ไม่แตะ (กันแย่ง)
 */
export type AccountMergeAction = "create" | "convert" | "noop" | "conflict";

export interface ExistingAccountLike {
  id: number;
  bmId: number | null;
}

export function decideAccountMerge(
  existing: ExistingAccountLike | null | undefined,
  bmDbId: number,
): AccountMergeAction {
  if (!existing) return "create";
  if (existing.bmId == null) return "convert";
  if (existing.bmId === bmDbId) return "noop";
  return "conflict";
}
