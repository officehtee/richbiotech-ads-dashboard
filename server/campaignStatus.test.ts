import { describe, expect, it } from "vitest";
import {
  classifyMetaStatus,
  computeBadge,
  daysSince,
  isNewBadge,
  reconcileStatus,
  shouldHardDelete,
  shouldShowRejectRow,
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
    expect(classifyMetaStatus("PAUSED")).toBe("other");
    expect(classifyMetaStatus(null)).toBe("other");
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

  it("เคส 2: ถูกปฏิเสธ จด rejectedAt; ครบ 5 วัน → hard_delete + expired", () => {
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

    // วันที่ 8 (ครบ 5 วัน) → ลบ + mark expired
    const del = reconcileStatus({
      effectiveStatus: "DISAPPROVED",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      today: "2026-06-08",
    });
    expect(del.action).toBe("hard_delete");
    expect(del.rejectedExpired).toBe(true);
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

describe("todayString", () => {
  it("formats UTC date as YYYY-MM-DD", () => {
    expect(todayString(D("2026-06-03"))).toBe("2026-06-03");
  });
});
