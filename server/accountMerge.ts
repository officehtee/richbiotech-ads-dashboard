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

/**
 * Auto-Reactivate decision (pure) — ใช้ตอน BM sync "ล้มเหลว"
 *
 * เมื่อ BM sync ล้มเหลว ระบบจะนับ fail streak สะสม เมื่อถึง threshold
 * → ควรพลิกบัญชีที่เคยถูก merge กลับเป็นบัญชีเดี่ยว (ใช้ token ส่วนตัวเดิม)
 * เพื่อให้ข้อมูลไหลต่อระหว่าง BM ถูกบล็อค
 *
 * @param prevFailStreak  fail streak เดิมก่อนรอบนี้ (0 = เพิ่งสำเร็จล่าสุด)
 * @param threshold       จำนวนครั้งล้มเหลวติดต่อกันก่อน trigger (ดีฟอลต์ 1)
 * @returns               true ถ้ารอบนี้ควร trigger auto-reactivate
 */
export function shouldAutoReactivate(
  prevFailStreak: number,
  threshold: number,
): boolean {
  const newStreak = (prevFailStreak ?? 0) + 1;
  return newStreak >= threshold;
}
