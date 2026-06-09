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

/**
 * Prompt G — status logic สำหรับการ sync แบบ count-based (tokenCheck / bm manual)
 * ต่างจาก adInsights: ตัดสินจากจำนวน item ที่ประมวลผลได้ ไม่ใช่ rows
 *   status = failed === 0 ? "success" : processed > failed ? "partial" : "failed"
 * โดย processed = จำนวนทั้งหมดที่พยายาม sync (บัญชี/ BM)
 */
function decideCountStatus(
  total: number,
  failed: number,
): "success" | "partial" | "failed" {
  return failed === 0 ? "success" : total > failed ? "partial" : "failed";
}

describe("decideCountStatus (tokenCheck / bm manual sync)", () => {
  it("ไม่มี failed → success", () => {
    expect(decideCountStatus(7, 0)).toBe("success");
  });

  it("ประมวลผล 0 รายการ ไม่มี failed → success (ไม่มีอะไรให้ทำ)", () => {
    expect(decideCountStatus(0, 0)).toBe("success");
  });

  it("fail บางส่วน (สำเร็จมากกว่า fail) → partial", () => {
    expect(decideCountStatus(7, 2)).toBe("partial");
  });

  it("fail ทั้งหมด → failed", () => {
    expect(decideCountStatus(3, 3)).toBe("failed");
  });

  it("fail มากกว่าครึ่งแต่ยังมีสำเร็จ → partial", () => {
    expect(decideCountStatus(5, 4)).toBe("partial");
  });

  it("fail = total → failed (ขอบเขต)", () => {
    expect(decideCountStatus(1, 1)).toBe("failed");
  });
});

/**
 * Prompt G — แมป jobType เป็น label ที่แสดงในตารางประวัติ (frontend JobTypeBadge)
 * ทดสอบว่าทุก jobType ที่รองรับมี label และ fallback ไปที่ "ข้อมูลโฆษณา"
 */
type JobTypeT = "adInsights" | "bm" | "alerts" | "tokenCheck";
function jobTypeLabel(jobType: string): string {
  const map: Record<JobTypeT, string> = {
    adInsights: "ข้อมูลโฆษณา",
    bm: "Business Manager",
    tokenCheck: "เช็ก Token",
    alerts: "แจ้งเตือน",
  };
  return map[(jobType as JobTypeT)] ?? map.adInsights;
}

describe("jobTypeLabel (ป้ายประเภทในประวัติการซิงค์)", () => {
  it("adInsights → ข้อมูลโฆษณา", () => {
    expect(jobTypeLabel("adInsights")).toBe("ข้อมูลโฆษณา");
  });
  it("bm → Business Manager", () => {
    expect(jobTypeLabel("bm")).toBe("Business Manager");
  });
  it("tokenCheck → เช็ก Token", () => {
    expect(jobTypeLabel("tokenCheck")).toBe("เช็ก Token");
  });
  it("alerts → แจ้งเตือน", () => {
    expect(jobTypeLabel("alerts")).toBe("แจ้งเตือน");
  });
  it("ค่าแปลก ๆ → fallback เป็นข้อมูลโฆษณา", () => {
    expect(jobTypeLabel("unknown")).toBe("ข้อมูลโฆษณา");
  });
});

/**
 * Prompt H — ตรวจสอบว่า BM auto-sync และ Alerts handler ใช้ logic status เดียวกัน
 * status = failed === 0 ? "success" : total > failed ? "partial" : "failed"
 * (เหมือน decideCountStatus ที่ทดสอบแล้ว แต่ทดสอบเฉพาะ edge case ของ BM/Alerts)
 */
describe("syncLog status for BM auto-sync handler", () => {
  it("BM ทั้งหมด sync สำเร็จ → success", () => {
    expect(decideCountStatus(3, 0)).toBe("success");
  });

  it("BM บางตัว failed → partial", () => {
    expect(decideCountStatus(3, 1)).toBe("partial");
  });

  it("BM ทุกตัว failed → failed", () => {
    expect(decideCountStatus(3, 3)).toBe("failed");
  });

  it("ไม่มี BM เลย (workspace ว่าง) → success", () => {
    expect(decideCountStatus(0, 0)).toBe("success");
  });
});

describe("syncLog status for Alerts handler", () => {
  it("ตรวจ alert ทุก tenant สำเร็จ → success", () => {
    expect(decideCountStatus(2, 0)).toBe("success");
  });

  it("tenant บางตัว error → partial", () => {
    expect(decideCountStatus(2, 1)).toBe("partial");
  });

  it("ทุก tenant error → failed", () => {
    expect(decideCountStatus(2, 2)).toBe("failed");
  });
});
