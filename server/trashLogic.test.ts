import { describe, expect, it } from "vitest";
import { reconcileStatus } from "./campaignStatus";

/**
 * Phase 4 — ระบบถังขยะ (soft delete + กู้กลับ)
 * ครอบ logic ของ reconcileStatus ในมุมใหม่:
 *   - REJECT ครบ 5 วัน → action "move_to_trash" (ไม่ใช่ hard_delete)
 *   - trashed=true → ไม่ reconcile (คงค่าไว้, action none) ไม่ว่าจะ status อะไร
 *   - restored=true (A2) → กันเด้งเข้าถังซ้ำจนกว่า status กลับ active
 *   - restored + active → action "clear_restored" + เริ่มนับ approvedAt ใหม่
 */

describe("Phase 4: move_to_trash เมื่อ REJECT ครบ 5 วัน", () => {
  it("วันที่ 4 (ยังไม่ครบ) → none", () => {
    const r = reconcileStatus({
      effectiveStatus: "DISAPPROVED",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      today: "2026-06-06", // 3 วัน
    });
    expect(r.action).toBe("none");
  });

  it("ครบ 5 วันพอดี → move_to_trash", () => {
    const r = reconcileStatus({
      effectiveStatus: "DISAPPROVED",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      today: "2026-06-08", // 5 วัน
    });
    expect(r.action).toBe("move_to_trash");
    // ไม่ set rejectedExpired อีกต่อไป (Phase 4 ใช้ trashedAt เป็น guard)
    expect(r.rejectedExpired).toBe(false);
  });

  it("เกิน 5 วัน → ยัง move_to_trash", () => {
    const r = reconcileStatus({
      effectiveStatus: "CAMPAIGN_DISAPPROVED",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      today: "2026-06-20",
    });
    expect(r.action).toBe("move_to_trash");
  });
});

describe("Phase 4: trashed=true → ไม่ reconcile (คงค่า, action none)", () => {
  it("อยู่ในถัง + ยัง reject → none และคงค่า rejectedAt เดิม", () => {
    const r = reconcileStatus({
      effectiveStatus: "DISAPPROVED",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      trashed: true,
      today: "2026-06-30",
    });
    expect(r.action).toBe("none");
    expect(r.rejectedAt).toBe("2026-06-03");
  });

  it("อยู่ในถัง + status กลับ active → ยังไม่ทำอะไร (ออกจากถังผ่าน restore เท่านั้น)", () => {
    const r = reconcileStatus({
      effectiveStatus: "ACTIVE",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      trashed: true,
      today: "2026-06-30",
    });
    expect(r.action).toBe("none");
    // ไม่จด approvedAt เพราะยังอยู่ในถัง
    expect(r.approvedAt).toBeNull();
  });
});

describe("Phase 4 (A2): restored=true กันเด้งเข้าถังซ้ำ", () => {
  it("กู้คืนแล้วแต่ Meta ยัง reject → ไม่เด้งเข้าถังซ้ำ (action none)", () => {
    const r = reconcileStatus({
      effectiveStatus: "DISAPPROVED",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      restored: true,
      today: "2026-06-20", // เกิน 5 วันแล้วก็ตาม
    });
    expect(r.action).toBe("none");
  });

  it("กู้คืนแล้วและ Meta กลับเป็น active → clear_restored + จด approvedAt ใหม่ + เคลียร์ rejectedAt", () => {
    const r = reconcileStatus({
      effectiveStatus: "ACTIVE",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      restored: true,
      today: "2026-06-15",
    });
    expect(r.action).toBe("clear_restored");
    expect(r.approvedAt).toBe("2026-06-15");
    expect(r.rejectedAt).toBeNull();
  });

  it("กู้คืนแล้ว + status wait → คงอยู่ตารางหลัก ไม่เด้งเข้าถัง", () => {
    const r = reconcileStatus({
      effectiveStatus: "PENDING_REVIEW",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      restored: true,
      today: "2026-06-15",
    });
    expect(r.action).toBe("none");
  });
});

describe("Phase 4: trashed มาก่อน restored (priority)", () => {
  it("ถ้าทั้ง trashed และ restored เป็น true → trashed ชนะ (ไม่ควรเกิดจริง แต่กันไว้)", () => {
    const r = reconcileStatus({
      effectiveStatus: "ACTIVE",
      approvedAt: null,
      rejectedAt: "2026-06-03",
      rejectedExpired: false,
      trashed: true,
      restored: true,
      today: "2026-06-15",
    });
    expect(r.action).toBe("none");
  });
});
