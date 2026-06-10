import { describe, expect, it } from "vitest";
import {
  classifyMetaStatus,
  computeBadge,
  daysSince,
  isNewBadge,
  reconcileStatus,
  shouldHardDelete,
  shouldShowRejectRow,
  shouldShowClosedRow,
  todayString,
} from "./campaignStatus";

const D = (s: string) => new Date(`${s}T00:00:00Z`);

describe("classifyMetaStatus", () => {
  it("maps wait statuses", () => {
    expect(classifyMetaStatus("PENDING_REVIEW")).toBe("wait");
    expect(classifyMetaStatus("IN_PROCESS")).toBe("wait");
    expect(classifyMetaStatus("PENDING_BILLING_INFO")).toBe("wait");
  });
  it("maps reject statuses", () => {
    expect(classifyMetaStatus("DISAPPROVED")).toBe("reject");
    expect(classifyMetaStatus("CAMPAIGN_DISAPPROVED")).toBe("reject");
    expect(classifyMetaStatus("ADSET_DISAPPROVED")).toBe("reject");
    expect(classifyMetaStatus("WITH_ISSUES")).toBe("reject");
  });
  it("maps active + other", () => {
    expect(classifyMetaStatus("ACTIVE")).toBe("active");
    expect(classifyMetaStatus(null)).toBe("other");
    expect(classifyMetaStatus("DELETED")).toBe("other");
  });
  // Phase 2: closed bucket
  it("maps closed statuses (PAUSED/CAMPAIGN_PAUSED/ADSET_PAUSED/ARCHIVED)", () => {
    expect(classifyMetaStatus("PAUSED")).toBe("closed");
    expect(classifyMetaStatus("CAMPAIGN_PAUSED")).toBe("closed");
    expect(classifyMetaStatus("ADSET_PAUSED")).toBe("closed");
    expect(classifyMetaStatus("ARCHIVED")).toBe("closed");
    // case-insensitive
    expect(classifyMetaStatus("paused")).toBe("closed");
  });
  it("closed ไม่ปนกับ wait/reject/active", () => {
    expect(classifyMetaStatus("PENDING_REVIEW")).toBe("wait");
    expect(classifyMetaStatus("DISAPPROVED")).toBe("reject");
    expect(classifyMetaStatus("ACTIVE")).toBe("active");
  });
});

describe("daysSince (inclusive aware)", () => {
  it("computes whole-day diffs in UTC", () => {
    expect(daysSince("2026-06-03", D("2026-06-03"))).toBe(0);
    expect(daysSince("2026-06-03", D("2026-06-05"))).toBe(2);
    expect(daysSince("2026-06-03", D("2026-06-08"))).toBe(5);
    expect(daysSince(null, D("2026-06-08"))).toBeNull();
  });
});

describe("isNewBadge — NEW = ACTIVE และ ≤ 2 วันจากอนุมัติ (รวม 3 วัน)", () => {
  it("shows on approval day and next 2 days, hides on day 4", () => {
    // approved 3 มิ.ย.
    expect(isNewBadge("ACTIVE", "2026-06-03", D("2026-06-03"))).toBe(true);
    expect(isNewBadge("ACTIVE", "2026-06-03", D("2026-06-04"))).toBe(true);
    expect(isNewBadge("ACTIVE", "2026-06-03", D("2026-06-05"))).toBe(true);
    expect(isNewBadge("ACTIVE", "2026-06-03", D("2026-06-06"))).toBe(false);
  });
  it("no NEW when not active or no approvedAt", () => {
    expect(isNewBadge("PENDING_REVIEW", "2026-06-03", D("2026-06-03"))).toBe(
      false,
    );
    expect(isNewBadge("ACTIVE", null, D("2026-06-03"))).toBe(false);
  });
});

describe("computeBadge priority", () => {
  it("REJECT wins, then WAIT, then NEW", () => {
    expect(computeBadge("DISAPPROVED", null, "2026-06-03", D("2026-06-04"))).toBe(
      "REJECT",
    );
    expect(computeBadge("PENDING_REVIEW", null, null, D("2026-06-04"))).toBe(
      "WAIT",
    );
    expect(computeBadge("ACTIVE", "2026-06-03", null, D("2026-06-04"))).toBe(
      "NEW",
    );
    expect(computeBadge("ACTIVE", "2026-06-01", null, D("2026-06-10"))).toBe(
      "NORMAL",
    );
  });
});

// Phase 2: ป้าย CLOSED + priority + shouldShowClosedRow
describe("Phase 2: computeBadge CLOSED + priority", () => {
  it("closed (PAUSED/ARCHIVED) → CLOSED", () => {
    expect(computeBadge("PAUSED", null, null, D("2026-06-04"))).toBe("CLOSED");
    expect(computeBadge("ARCHIVED", null, null, D("2026-06-04"))).toBe("CLOSED");
    expect(computeBadge("CAMPAIGN_PAUSED", null, null, D("2026-06-04"))).toBe(
      "CLOSED",
    );
  });
  it("priority: reject(แดง) มาก่อน closed(เทา) — ถ้า Meta ยัง reject อยู่ = REJECT", () => {
    // สถานะปัจจุบัน reject → REJECT (ไม่ใช่ closed) ถึงจะมี rejectedAt ค้าง
    expect(
      computeBadge("DISAPPROVED", null, "2026-06-01", D("2026-06-04")),
    ).toBe("REJECT");
    // สถานะปัจจุบัน PAUSED (ปิดจริง) แม้จะเคย reject (มี rejectedAt ค้าง) → CLOSED
    expect(
      computeBadge("PAUSED", null, "2026-06-01", D("2026-06-04")),
    ).toBe("CLOSED");
  });
  it("closed ไม่ไปรบกวน WAIT/NEW", () => {
    expect(computeBadge("PENDING_REVIEW", null, null, D("2026-06-04"))).toBe(
      "WAIT",
    );
    expect(computeBadge("ACTIVE", "2026-06-03", null, D("2026-06-04"))).toBe(
      "NEW",
    );
  });
  it("shouldShowClosedRow: true เฉพาะ closed", () => {
    expect(shouldShowClosedRow("PAUSED")).toBe(true);
    expect(shouldShowClosedRow("ARCHIVED")).toBe(true);
    expect(shouldShowClosedRow("ACTIVE")).toBe(false);
    expect(shouldShowClosedRow("DISAPPROVED")).toBe(false);
    expect(shouldShowClosedRow("PENDING_REVIEW")).toBe(false);
    expect(shouldShowClosedRow(null)).toBe(false);
  });
});

describe("shouldShowRejectRow / shouldHardDelete — REJECT นับ 5 วัน", () => {
  it("rejected 3 มิ.ย. → แสดง 3-7, ลบ 8", () => {
    for (const day of ["2026-06-03", "2026-06-04", "2026-06-05", "2026-06-06", "2026-06-07"]) {
      expect(shouldShowRejectRow("DISAPPROVED", "2026-06-03", D(day))).toBe(true);
      expect(shouldHardDelete("DISAPPROVED", "2026-06-03", D(day))).toBe(false);
    }
    expect(shouldShowRejectRow("DISAPPROVED", "2026-06-03", D("2026-06-08"))).toBe(
      false,
    );
    expect(shouldHardDelete("DISAPPROVED", "2026-06-03", D("2026-06-08"))).toBe(
      true,
    );
  });
});

describe("reconcileStatus — auto date stamping", () => {
  it("เคส 1: WAIT → ACTIVE จด approvedAt ครั้งเดียว", () => {
    // วันที่ 3: เพิ่ง active → จด approvedAt = today
    const r1 = reconcileStatus({
      effectiveStatus: "ACTIVE",
      approvedAt: null,
      rejectedAt: null,
      rejectedExpired: false,
      today: "2026-06-03",
    });
    expect(r1.approvedAt).toBe("2026-06-03");
    expect(r1.action).toBe("none");
    // วันถัดมา active ต่อ → ไม่จดซ้ำ
    const r2 = reconcileStatus({
      effectiveStatus: "ACTIVE",
      approvedAt: "2026-06-03",
      rejectedAt: null,
      rejectedExpired: false,
      today: "2026-06-04",
    });
    expect(r2.approvedAt).toBe("2026-06-03");
  });

  it("เคส 2 (Phase 4): ถูกปฏิเสธ จด rejectedAt; ครบ 5 วัน → move_to_trash (ไม่ set expired อีกต่อไป)", () => {
    const stamp = reconcileStatus({
      effectiveStatus: "DISAPPROVED",
      approvedAt: null,
      rejectedAt: null,
      rejectedExpired: false,
      today: "2026-06-03",
    });
    expect(stamp.rejectedAt).toBe("2026-06-03");
    expect(stamp.action).toBe("none");
    expect(stamp.rejectedExpired).toBe(false);

    // วันที่ 8 (ครบ 5 วัน) → ย้ายเข้าถังขยะ (soft delete) ไม่ set expired
    const del = reconcileStatus({
      effectiveStatus: "DISAPPROVED",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      today: "2026-06-08",
    });
    expect(del.action).toBe("move_to_trash");
    expect(del.rejectedExpired).toBe(false);
  });

  it("เคส 3: ถูกลบแล้ว (expired) → ยัง reject ข้ามไป / กลับ active → revive เป็น NEW", () => {
    // วันที่ 9: ยัง reject → คงไว้ ไม่ดึงกลับ
    const still = reconcileStatus({
      effectiveStatus: "DISAPPROVED",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: true,
      today: "2026-06-09",
    });
    expect(still.action).toBe("none");
    expect(still.rejectedExpired).toBe(true);

    // วันที่ 10: แก้จนผ่าน (ACTIVE) → revive
    const revive = reconcileStatus({
      effectiveStatus: "ACTIVE",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: true,
      today: "2026-06-10",
    });
    expect(revive.action).toBe("revive");
    expect(revive.rejectedExpired).toBe(false);
    expect(revive.rejectedAt).toBeNull();
    expect(revive.approvedAt).toBe("2026-06-10");
    // และต้องโชว์ NEW นับจากวันนี้
    expect(
      computeBadge("ACTIVE", revive.approvedAt, revive.rejectedAt, D("2026-06-10")),
    ).toBe("NEW");
    expect(
      computeBadge("ACTIVE", revive.approvedAt, revive.rejectedAt, D("2026-06-13")),
    ).toBe("NORMAL");
  });

  it("clear rejectedAt เมื่อออกจากสถานะ reject (แก้จนผ่านก่อนครบ 5 วัน)", () => {
    const r = reconcileStatus({
      effectiveStatus: "ACTIVE",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      today: "2026-06-04",
    });
    expect(r.rejectedAt).toBeNull();
    expect(r.approvedAt).toBe("2026-06-04");
  });
});

// Phase 2: reconcile closed — ต้องไม่ clear rejectedAt/approvedAt + action none + ไม่กระทบ REJECT/NEW
describe("Phase 2: reconcileStatus — closed เป็นสถานะอิสระ", () => {
  it("closed (PAUSED) → action none + ไม่ clear rejectedAt (จุดสำคัญ ⭐)", () => {
    const r = reconcileStatus({
      effectiveStatus: "PAUSED",
      approvedAt: "2026-06-01",
      rejectedAt: "2026-06-02",
      rejectedExpired: false,
      today: "2026-06-09",
    });
    expect(r.action).toBe("none");
    // closed ต้องไม่แตะ rejectedAt/approvedAt (ต่างจาก other ที่จะ clear rejectedAt)
    expect(r.rejectedAt).toBe("2026-06-02");
    expect(r.approvedAt).toBe("2026-06-01");
    expect(r.rejectedExpired).toBe(false);
  });

  it("ARCHIVED ไม่มี rejectedAt/approvedAt → คง null ไว้ action none", () => {
    const r = reconcileStatus({
      effectiveStatus: "ARCHIVED",
      approvedAt: null,
      rejectedAt: null,
      rejectedExpired: false,
      today: "2026-06-09",
    });
    expect(r.action).toBe("none");
    expect(r.rejectedAt).toBeNull();
    expect(r.approvedAt).toBeNull();
  });

  it("closed ไม่กระทบ logic REJECT 5 วัน (DISAPPROVED ยัง move_to_trash ตามเดิม)", () => {
    const del = reconcileStatus({
      effectiveStatus: "DISAPPROVED",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      today: "2026-06-08",
    });
    expect(del.action).toBe("move_to_trash");
  });

  it("closed ไม่กระทบ logic NEW 3 วัน (ACTIVE ยังจด approvedAt ตามเดิม)", () => {
    const r = reconcileStatus({
      effectiveStatus: "ACTIVE",
      approvedAt: null,
      rejectedAt: null,
      rejectedExpired: false,
      today: "2026-06-03",
    });
    expect(r.approvedAt).toBe("2026-06-03");
    expect(computeBadge("ACTIVE", r.approvedAt, r.rejectedAt, D("2026-06-03"))).toBe(
      "NEW",
    );
  });

  it("reject → closed: แคมเปญเคย reject แล้วถูกปิด (PAUSED) → คง rejectedAt ไว้ (ไม่ clear)", () => {
    const r = reconcileStatus({
      effectiveStatus: "PAUSED",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      today: "2026-06-05",
    });
    expect(r.rejectedAt).toBe("2026-06-03");
    expect(r.action).toBe("none");
  });

  it("closed + trashed → คงอยู่ในถัง (action none, ไม่ revive เพราะยังไม่ active)", () => {
    const r = reconcileStatus({
      effectiveStatus: "PAUSED",
      approvedAt: null,
      rejectedAt: null,
      rejectedExpired: false,
      trashed: true,
      today: "2026-06-09",
    });
    expect(r.action).toBe("none");
  });
});

describe("reconcileStatus — Phase 4.1: auto-revive from trash", () => {
  it("trashed + ACTIVE → revive_from_trash + clear reject/expired + จด approvedAt=today", () => {
    const r = reconcileStatus({
      effectiveStatus: "ACTIVE",
      approvedAt: null,
      rejectedAt: "2026-06-01",
      rejectedExpired: false,
      trashed: true,
      today: "2026-06-09",
    });
    expect(r.action).toBe("revive_from_trash");
    expect(r.approvedAt).toBe("2026-06-09");
    expect(r.rejectedAt).toBeNull();
    expect(r.rejectedExpired).toBe(false);
    // หลัง revive ต้องขึ้น NEW นับจากวันนี้
    expect(
      computeBadge("ACTIVE", r.approvedAt, r.rejectedAt, D("2026-06-09")),
    ).toBe("NEW");
  });

  it("trashed + ยัง DISAPPROVED → คงอยู่ในถัง (action none, ไม่แตะค่า)", () => {
    const r = reconcileStatus({
      effectiveStatus: "DISAPPROVED",
      approvedAt: null,
      rejectedAt: "2026-06-01",
      rejectedExpired: false,
      trashed: true,
      today: "2026-06-09",
    });
    expect(r.action).toBe("none");
    expect(r.rejectedAt).toBe("2026-06-01");
  });

  it("trashed + WAIT (PENDING_REVIEW) → คงอยู่ในถัง (ยังไม่ active → ไม่ revive)", () => {
    const r = reconcileStatus({
      effectiveStatus: "PENDING_REVIEW",
      approvedAt: null,
      rejectedAt: null,
      rejectedExpired: false,
      trashed: true,
      today: "2026-06-09",
    });
    expect(r.action).toBe("none");
  });

  it("trashed มาก่อน restored: ถ้า trashed=true ให้หลุด revive_from_trash ก่อน restored guard", () => {
    // กรณี trashed และ restored ถูกตั้งพร้อมกัน (ไม่ควรเกิด) → trashed มาก่อน
    const r = reconcileStatus({
      effectiveStatus: "ACTIVE",
      approvedAt: null,
      rejectedAt: null,
      rejectedExpired: false,
      trashed: true,
      restored: true,
      today: "2026-06-09",
    });
    expect(r.action).toBe("revive_from_trash");
  });
});

describe("todayString", () => {
  it("formats UTC date as YYYY-MM-DD", () => {
    expect(todayString(D("2026-06-03"))).toBe("2026-06-03");
  });
});
