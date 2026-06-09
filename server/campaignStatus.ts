/**
 * Campaign Status pure helpers (Round 7.35)
 *
 * จัดการ logic สถานะแคมเปญ WAIT / NEW / REJECT แบบ pure functions
 * (ไม่แตะ DB / network) เพื่อให้ unit test ได้ครบทุก edge case
 *
 * นิยามจาก effective_status ของ Meta:
 *   WAIT   = PENDING_REVIEW / IN_PROCESS / PENDING_BILLING_INFO
 *   NEW    = ACTIVE และผ่านมา ≤ 2 วันจาก approved_at (รวมวันอนุมัติ = 3 วัน)
 *   REJECT = DISAPPROVED / ADSET_DISAPPROVED / CAMPAIGN_DISAPPROVED / WITH_ISSUES
 *
 * การนับวัน (inclusive):
 *   NEW:   today - approved_at ≤ 2  → แสดง NEW (วันอนุมัติ + 2 วัน = 3 วัน)
 *   REJECT: today - rejected_at ≥ 5 → ลบจริง (แสดงวันถูกปฏิเสธ + 4 วัน = 5 วัน)
 */

export type StatusKind = "WAIT" | "NEW" | "REJECT" | "NORMAL";

/** สถานะ Meta ที่ถือว่า "รออนุมัติ" */
export const WAIT_STATUSES = new Set([
  "PENDING_REVIEW",
  "IN_PROCESS",
  "PENDING_BILLING_INFO",
]);

/** สถานะ Meta ที่ถือว่า "ถูกปฏิเสธ" */
export const REJECT_STATUSES = new Set([
  "DISAPPROVED",
  "ADSET_DISAPPROVED",
  "CAMPAIGN_DISAPPROVED",
  "WITH_ISSUES",
]);

/** สถานะ Meta ที่ถือว่า "อนุมัติ/ทำงานอยู่" */
export const ACTIVE_STATUSES = new Set(["ACTIVE"]);

/** แปลง effective_status → กลุ่มหยาบ (เพื่อใช้ใน reconcile) */
export function classifyMetaStatus(
  effectiveStatus: string | null | undefined,
): "wait" | "active" | "reject" | "other" {
  if (!effectiveStatus) return "other";
  const s = effectiveStatus.toUpperCase();
  if (WAIT_STATUSES.has(s)) return "wait";
  if (REJECT_STATUSES.has(s)) return "reject";
  if (ACTIVE_STATUSES.has(s)) return "active";
  return "other";
}

/**
 * แปลง "YYYY-MM-DD" → epoch (UTC midnight) ms. คืน null ถ้ารูปแบบผิด
 */
export function parseDateUtc(date: string | null | undefined): number | null {
  if (!date) return null;
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return Date.UTC(
    parseInt(m[1], 10),
    parseInt(m[2], 10) - 1,
    parseInt(m[3], 10),
  );
}

/** today (Date) → "YYYY-MM-DD" (UTC) */
export function todayString(today: Date = new Date()): string {
  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10);
}

/** จำนวนวันเต็มระหว่าง from → today (UTC, inclusive-aware). คืน null ถ้า parse ไม่ได้ */
export function daysSince(
  from: string | null | undefined,
  today: Date = new Date(),
): number | null {
  const f = parseDateUtc(from);
  if (f == null) return null;
  const t = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return Math.floor((t - f) / 86_400_000);
}

/**
 * NEW badge: ACTIVE และ (today - approvedAt) อยู่ในช่วง 0..2 วัน (รวม = 3 วัน)
 */
export function isNewBadge(
  effectiveStatus: string | null | undefined,
  approvedAt: string | null | undefined,
  today: Date = new Date(),
): boolean {
  if (classifyMetaStatus(effectiveStatus) !== "active") return false;
  const d = daysSince(approvedAt, today);
  return d != null && d >= 0 && d <= 2;
}

/**
 * คำนวณป้ายที่ควรแสดงสำหรับแถวหนึ่ง
 * - REJECT มาก่อน (สำคัญสุด, ต้องโชว์ค้าง 5 วัน)
 * - WAIT ถ้ารออนุมัติ
 * - NEW ถ้า active + ≤ 3 วันจากอนุมัติ
 * - NORMAL กรณีอื่น (ไม่มีป้าย)
 */
export function computeBadge(
  effectiveStatus: string | null | undefined,
  approvedAt: string | null | undefined,
  rejectedAt: string | null | undefined,
  today: Date = new Date(),
): StatusKind {
  const kind = classifyMetaStatus(effectiveStatus);
  if (kind === "reject") {
    // ยังอยู่ในช่วง 5 วัน → REJECT, เกินก็ยัง REJECT (จะถูกลบโดย shouldHardDelete)
    return "REJECT";
  }
  if (kind === "wait") return "WAIT";
  if (kind === "active" && isNewBadge(effectiveStatus, approvedAt, today)) {
    return "NEW";
  }
  return "NORMAL";
}

/**
 * REJECT ครบ 5 วันแล้วหรือยัง → ควรย้ายเข้าถังขยะ (Phase 4: เดิมชื่อ shouldHardDelete — คงชื่อไว้เพื่อ backward-compat)
 * เงื่อนไข: ยังเป็น reject status + (today - rejectedAt) ≥ 5
 */
export function shouldHardDelete(
  effectiveStatus: string | null | undefined,
  rejectedAt: string | null | undefined,
  today: Date = new Date(),
): boolean {
  if (classifyMetaStatus(effectiveStatus) !== "reject") return false;
  const d = daysSince(rejectedAt, today);
  return d != null && d >= 5;
}

/**
 * REJECT ที่ยังอยู่ในช่วง 5 วัน → ควรแสดงในตาราง (spend=0)
 */
export function shouldShowRejectRow(
  effectiveStatus: string | null | undefined,
  rejectedAt: string | null | undefined,
  today: Date = new Date(),
): boolean {
  if (classifyMetaStatus(effectiveStatus) !== "reject") return false;
  const d = daysSince(rejectedAt, today);
  // ถ้ายังไม่ได้จด rejectedAt (เพิ่งเจอรอบนี้) → แสดง (d อาจเป็น 0)
  if (d == null) return true;
  return d < 5;
}

export type ReconcileInput = {
  /** สถานะปัจจุบันจาก Meta */
  effectiveStatus: string | null | undefined;
  /** ค่าที่เก็บใน DB ปัจจุบัน (อาจ null) */
  approvedAt: string | null | undefined;
  rejectedAt: string | null | undefined;
  rejectedExpired: boolean;
  /** Phase 4: อยู่ในถังขยะแล้วหรือยัง (trashedAt IS NOT NULL) */
  trashed?: boolean;
  /** Phase 4 (A2): ถูกกู้คืนแล้วหรือยัง (restoredAt IS NOT NULL) — กันย้ายเข้าถังซ้ำจนกว่า status เปลี่ยน */
  restored?: boolean;
  /** วันนี้ (string YYYY-MM-DD) */
  today: string;
};

export type ReconcileOutput = {
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectedExpired: boolean;
  /**
   * action ที่ต้องทำเพิ่ม
   * - move_to_trash: REJECT ครบ 5 วัน → ย้ายเข้าถังขยะ (soft delete) — Phase 4 แทน hard_delete
   * - revive: แก้จนผ่าน (ACTIVE) → ดึงกลับ (ใช้กับ expired เก่า, คงไว้ backward-compat)
   * - clear_restored: status เปลี่ยนไป active → clear restoredAt (เริ่มนับใหม่ได้)
   */
  action: "none" | "move_to_trash" | "revive" | "clear_restored";
};

/**
 * Reconcile สถานะหนึ่งแคมเปญตอน sync (pure)
 *
 * กติกา (อิงสเปค):
 *  1) ACTIVE + approvedAt ว่าง → จด approvedAt = today (จดครั้งเดียว)
 *  2) REJECT + rejectedAt ว่าง → จด rejectedAt = today (จดครั้งเดียว)
 *  3) ไม่ใช่ REJECT อีกต่อไป → clear rejectedAt (หยุดนับ 5 วัน)
 *  4) อยู่ใน rejected_expired:
 *       - ยัง REJECT → คงไว้ (action none, caller จะข้ามไม่แสดง)
 *       - กลายเป็น ACTIVE → revive: clear expired + clear rejectedAt + จด approvedAt=today
 *  5) REJECT ครบ 5 วัน (shouldHardDelete) และยังไม่ expired → action hard_delete + set expired
 */
export function reconcileStatus(input: ReconcileInput): ReconcileOutput {
  const kind = classifyMetaStatus(input.effectiveStatus);
  const today = input.today;
  let approvedAt = input.approvedAt ?? null;
  let rejectedAt = input.rejectedAt ?? null;
  let rejectedExpired = input.rejectedExpired;
  let action: ReconcileOutput["action"] = "none";

  // Phase 4 กรณีอยู่ในถังขยะ (trashed): ถ้ายังอยู่ในถัง ไม่ต้อง reconcile — คงค่าไว้
  // (การออกจากถังทำผ่าน restoreCampaign เท่านั้น)
  if (input.trashed) {
    return { approvedAt, rejectedAt, rejectedExpired, action: "none" };
  }

  // Phase 4 (A2) กรณีถูกกู้คืน (restored): กันไม่ให้เด้งเข้าถังซ้ำ
  if (input.restored) {
    if (kind === "active") {
      // status เปลี่ยนเป็น active → รีเซ็ตการกู้คืน + เริ่มนับ NEW ใหม่
      if (!approvedAt) approvedAt = today;
      if (rejectedAt) rejectedAt = null;
      action = "clear_restored";
      return { approvedAt, rejectedAt, rejectedExpired, action };
    }
    // ยัง reject/wait/other เหมือนตอนกู้ → คงอยู่ในตารางหลัก ไม่เด้งเข้าถัง (A2)
    return { approvedAt, rejectedAt, rejectedExpired, action: "none" };
  }

  // กรณี 4 (เดิม): เคยถูกลบ (rejected_expired) — คง backward-compat สำหรับ row เก่าที่ยัง expired → active
  if (rejectedExpired) {
    if (kind === "active") {
      // revive: แก้จนผ่าน → ดึงกลับ + ขึ้น NEW นับจากวันนี้
      rejectedExpired = false;
      rejectedAt = null;
      approvedAt = today;
      action = "revive";
      return { approvedAt, rejectedAt, rejectedExpired, action };
    }
    // ยัง REJECT (หรือสถานะอื่น) → คงไว้ ไม่ดึงกลับ
    return { approvedAt, rejectedAt, rejectedExpired, action: "none" };
  }

  // กรณี 1: ACTIVE → จด approvedAt ครั้งเดียว
  if (kind === "active") {
    if (!approvedAt) approvedAt = today;
    // ออกจากสถานะ reject → เคลียร์ rejectedAt
    if (rejectedAt) rejectedAt = null;
  }

  // กรณี 2: REJECT → จด rejectedAt ครั้งเดียว
  if (kind === "reject") {
    if (!rejectedAt) rejectedAt = today;
    // กรณี 5: ครบ 5 วัน → ย้ายเข้าถังขยะ (Phase 4: move_to_trash แทน hard_delete) — ไม่ set rejectedExpired อีกต่อไป
    const d = daysSince(rejectedAt, new Date(`${today}T00:00:00Z`));
    if (d != null && d >= 5) {
      action = "move_to_trash";
    }
  }

  // กรณี 3: สถานะ wait/other (ไม่ใช่ reject) → เคลียร์ rejectedAt ถ้ามีค้าง
  if (kind === "wait" || kind === "other") {
    if (rejectedAt) rejectedAt = null;
  }

  return { approvedAt, rejectedAt, rejectedExpired, action };
}
