/**
 * Phase 3A — Mapping effective_status (ดิบจาก Meta) → ภาษาไทย + โทนสี
 * (pure logic, ไม่มี dependency UI — ใช้ได้ทั้ง client + server, unit test ได้ครบ)
 *
 * หลักการ:
 *   - ค่าที่ "รู้จัก" → แปลไทย + ใส่โทนสี (เขียว/แดง/เหลือง/ส้ม/เทา)
 *   - ค่าที่ "ไม่รู้จัก" (Meta ส่งค่าใหม่/UNKNOWN) → แสดงค่าดิบ + เทากลาง (ไม่ซ่อน)
 *   - null/undefined/ว่าง (ไม่มี campaignStatus) → "—"
 */

/** กลุ่มสีของสถานะ */
export type StatusTone = "green" | "red" | "yellow" | "orange" | "gray";

export type DisplayStatus = {
  /** ป้ายภาษาไทย (หรือค่าดิบเมื่อไม่รู้จัก / "—" เมื่อ null) */
  label: string;
  /** โทนสีของ badge */
  tone: StatusTone;
  /** true = ค่าที่ระบบรู้จัก / false = ค่าไม่รู้จัก (fallback แสดงดิบ) */
  known: boolean;
  /** true = ไม่มีค่า (null) → แสดง "—" */
  empty: boolean;
};

/**
 * Mapping ค่าดิบ (uppercase) → { ไทย, โทนสี }
 * อ้างอิงชุดสถานะจาก server/campaignStatus.ts (WAIT/REJECT/ACTIVE/CLOSED) + ค่าเสริม
 */
export const STATUS_MAP: Record<string, { label: string; tone: StatusTone }> = {
  // เขียว — ใช้งานอยู่
  ACTIVE: { label: "ใช้งานอยู่", tone: "green" },
  // เทา — ปิด/หยุด/เก็บถาวร/ลบ
  PAUSED: { label: "ปิดอยู่", tone: "gray" },
  CAMPAIGN_PAUSED: { label: "ปิดอยู่", tone: "gray" },
  ADSET_PAUSED: { label: "ปิดอยู่", tone: "gray" },
  ARCHIVED: { label: "เก็บถาวร", tone: "gray" },
  DELETED: { label: "ถูกลบ", tone: "gray" },
  // แดง — ถูกปฏิเสธ
  DISAPPROVED: { label: "ถูกปฏิเสธ", tone: "red" },
  ADSET_DISAPPROVED: { label: "ถูกปฏิเสธ", tone: "red" },
  CAMPAIGN_DISAPPROVED: { label: "ถูกปฏิเสธ", tone: "red" },
  // ส้ม — มีปัญหา
  WITH_ISSUES: { label: "มีปัญหา", tone: "orange" },
  // เหลือง — รอ/กำลังดำเนินการ
  PENDING_REVIEW: { label: "กำลังตรวจสอบ", tone: "yellow" },
  IN_PROCESS: { label: "กำลังดำเนินการ", tone: "yellow" },
  PENDING_BILLING_INFO: { label: "รอข้อมูลการเรียกเก็บเงิน", tone: "yellow" },
};

/**
 * แปลง effective_status ดิบ → ข้อมูลสำหรับแสดงผล
 * @param raw ค่าดิบจาก Meta (อาจเป็น null/undefined)
 */
export function getDisplayStatus(
  raw: string | null | undefined,
): DisplayStatus {
  // null/undefined/ว่าง → "—"
  if (raw == null || String(raw).trim() === "") {
    return { label: "—", tone: "gray", known: false, empty: true };
  }
  const rawStr = String(raw).trim();
  const key = rawStr.toUpperCase();
  const hit = STATUS_MAP[key];
  if (hit) {
    return { label: hit.label, tone: hit.tone, known: true, empty: false };
  }
  // fallback ค่าไม่รู้จัก → แสดงค่าดิบ + เทากลาง (ไม่ซ่อน)
  return { label: rawStr, tone: "gray", known: false, empty: false };
}

/** ค่าข้อความสำหรับ CSV (ไทยเมื่อรู้จัก / ดิบเมื่อไม่รู้จัก / "—" เมื่อ null) */
export function getStatusCsvText(raw: string | null | undefined): string {
  return getDisplayStatus(raw).label;
}
