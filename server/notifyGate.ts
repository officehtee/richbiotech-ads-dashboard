/**
 * notifyGate — ชั้นควบคุมการ "ดัน" แจ้งเตือนส่วนตัวออกนอกแอป (Manus push / manus_owner)
 *
 * นโยบายหลัก (ตามที่เจ้าของระบุ):
 *   - ค่าเริ่มต้นต้อง "ปิด" — ถ้าเจ้าของยังไม่เปิด masterEnabled ด้วยตัวเอง
 *     ระบบจะ "ไม่ส่ง" แจ้งเตือนส่วนตัวไปหาใครเด็ดขาด
 *   - เมื่อเปิด master แล้ว ยังกรองรายประเภทได้อีกชั้น (sync สำเร็จ/ล้มเหลว/token/alert ระดับต่าง ๆ)
 *
 * หมายเหตุ: การบันทึก event ลงฐานข้อมูล (กระดิ่งในแอป / Web channel) ไม่ได้ถูก gate ที่นี่
 * — ผู้ใช้ยังเปิดเข้ามาดูรายงานย้อนหลังในแอปได้เสมอ gate นี้คุมเฉพาะ push ออกนอกแอป
 */
import { getNotificationPref, getOwnerUserId } from "./db";
import { notifyOwner, type NotificationPayload } from "./_core/notification";

/** ประเภทเหตุการณ์ที่แม็พกับ toggle ใน notificationPrefs */
export type NotifyEventType =
  | "syncSuccess"
  | "syncFailed"
  | "tokenIssue"
  | "alertCritical"
  | "alertWarning"
  | "alertInfo";

/**
 * ตรวจว่าเจ้าของระบบเปิดรับแจ้งเตือนประเภทนี้หรือไม่
 * - master ปิด → false เสมอ (ไม่รบกวน)
 * - master เปิด → ดู toggle รายประเภท
 */
export async function shouldPushToOwner(eventType: NotifyEventType): Promise<boolean> {
  const ownerId = await getOwnerUserId();
  if (ownerId == null) return false;
  const pref = await getNotificationPref(ownerId);
  if (!pref.masterEnabled) return false;
  return pref[eventType] === true;
}

/**
 * ส่งแจ้งเตือนหาเจ้าของแบบ "ผ่าน gate" — ตรวจ preference ก่อนเสมอ
 * คืน:
 *   - "sent"     ส่งสำเร็จ
 *   - "failed"   อนุญาตให้ส่งแต่ upstream ล้มเหลว
 *   - "muted"    ถูกปิดโดย preference (ไม่ได้ส่ง) — กรณีปกติเมื่อ master ปิด
 */
export async function notifyOwnerGated(
  eventType: NotifyEventType,
  payload: NotificationPayload,
): Promise<"sent" | "failed" | "muted"> {
  const allowed = await shouldPushToOwner(eventType);
  if (!allowed) return "muted";
  const ok = await notifyOwner(payload).catch(() => false);
  return ok ? "sent" : "failed";
}
