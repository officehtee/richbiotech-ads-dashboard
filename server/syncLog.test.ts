import { describe, it, expect } from "vitest";

/**
 * Round 7.44 — Sync Log status logic
 * จำลอง logic การตัดสิน status ที่ใช้ใน syncAdInsights handler:
 *   status = failed === 0 ? "success" : rows > 0 ? "partial" : "failed"
 */
function decideSyncStatus(failed: number, rows: number): "success" | "partial" | "failed" {
  return failed === 0 ? "success" : rows > 0 ? "partial" : "failed";
}

describe("decideSyncStatus", () => {
  it("ไม่มี failed → success", () => {
    expect(decideSyncStatus(0, 1200)).toBe("success");
  });

  it("ไม่มี failed แม้ rows = 0 → success (ไม่มีข้อมูลให้ดึงก็ถือว่าสำเร็จ)", () => {
    expect(decideSyncStatus(0, 0)).toBe("success");
  });

  it("มี failed แต่ยังดึง rows ได้บางส่วน → partial", () => {
    expect(decideSyncStatus(2, 500)).toBe("partial");
  });

  it("มี failed และดึง rows ไม่ได้เลย → failed", () => {
    expect(decideSyncStatus(3, 0)).toBe("failed");
  });

  it("failed = 1, rows = 1 → partial (ขอบเขตต่ำสุดของ partial)", () => {
    expect(decideSyncStatus(1, 1)).toBe("partial");
  });
});

/**
 * จำลองการนับ newAccounts/existingAccounts จาก flags รายบัญชี
 * (logic เดียวกับใน handler: active.filter((_, i) => !flags[i]))
 */
function splitAccounts(flags: boolean[]) {
  const total = flags.length;
  const existing = flags.filter((f) => f).length;
  const fresh = total - existing;
  return { fresh, existing };
}

describe("splitAccounts (per-account new vs existing)", () => {
  it("ทุกบัญชีมีข้อมูลแล้ว → existing ทั้งหมด", () => {
    expect(splitAccounts([true, true, true])).toEqual({ fresh: 0, existing: 3 });
  });

  it("ทุกบัญชีใหม่ → fresh ทั้งหมด", () => {
    expect(splitAccounts([false, false])).toEqual({ fresh: 2, existing: 0 });
  });

  it("ผสม: 1 ใหม่ + 2 เก่า", () => {
    expect(splitAccounts([false, true, true])).toEqual({ fresh: 1, existing: 2 });
  });

  it("ไม่มีบัญชี → 0/0", () => {
    expect(splitAccounts([])).toEqual({ fresh: 0, existing: 0 });
  });
});
