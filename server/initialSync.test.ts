/**
 * Round 7.42 — Initial sync logic tests
 *
 * ทดสอบ logic ที่ว่า:
 * - ถ้า tenant ยังไม่มีข้อมูลใน DB → ดึง 90 วัน (initial sync)
 * - ถ้ามีข้อมูลแล้ว → ดึง 7 วัน (normal sync)
 *
 * เนื่องจาก handler อยู่ใน express app (index.ts) ซึ่ง test ยาก
 * เราจึง extract logic การตัดสินใจ days ออกมาเป็น pure function
 * แล้วทดสอบ pure function นั้นโดยตรง
 */
import { describe, it, expect } from "vitest";
import { dateOffsetString } from "./deepAdsSync";

/** Pure function ที่ extract มาจาก handler logic */
export function decideSyncDays(hasData: boolean): number {
  return hasData ? 7 : 90;
}

describe("decideSyncDays — initial vs normal sync", () => {
  it("คืน 90 เมื่อยังไม่มีข้อมูล (initial sync)", () => {
    expect(decideSyncDays(false)).toBe(90);
  });

  it("คืน 7 เมื่อมีข้อมูลแล้ว (normal sync)", () => {
    expect(decideSyncDays(true)).toBe(7);
  });

  it("initial sync: since ต้องย้อนหลัง 89 วัน (days-1)", () => {
    const days = decideSyncDays(false); // 90
    const base = new Date("2025-06-04T00:00:00Z");
    const since = dateOffsetString(days - 1, base);
    expect(since).toBe("2025-03-07"); // 89 วันก่อน 4 มิ.ย. = 7 มี.ค.
  });

  it("normal sync: since ต้องย้อนหลัง 6 วัน (days-1)", () => {
    const days = decideSyncDays(true); // 7
    const base = new Date("2025-06-04T00:00:00Z");
    const since = dateOffsetString(days - 1, base);
    expect(since).toBe("2025-05-29"); // 6 วันก่อน 4 มิ.ย. = 29 พ.ค.
  });

  it("until ต้องเป็นวันนี้เสมอ (offset 0)", () => {
    const base = new Date("2025-06-04T00:00:00Z");
    const until = dateOffsetString(0, base);
    expect(until).toBe("2025-06-04");
  });

  it("initial sync ครอบคลุม 90 วัน (since → until)", () => {
    const days = decideSyncDays(false);
    const base = new Date("2025-06-04T00:00:00Z");
    const since = new Date(dateOffsetString(days - 1, base));
    const until = new Date(dateOffsetString(0, base));
    const diffDays = Math.round((until.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(89); // 90 วัน = 89 วันระหว่าง since และ until
  });
});

/**
 * Round 7.43 — Per-account split logic
 *
 * แยกบัญชี active เป็น 2 กลุ่มจาก flags (hasData รายบัญชี):
 *  - บัญชีใหม่ (flag = false) → initial sync 90 วัน
 *  - บัญชีเก่า (flag = true)  → normal sync 7 วัน
 *
 * extract logic เดียวกับใน handler ออกมาเป็น pure function เพื่อทดสอบ
 */
type Acct = { id: number };

export function splitAccountsByData<T extends Acct>(
  accounts: T[],
  flags: boolean[],
): { newAccounts: T[]; existingAccounts: T[] } {
  const newAccounts = accounts.filter((_, i) => !flags[i]);
  const existingAccounts = accounts.filter((_, i) => flags[i]);
  return { newAccounts, existingAccounts };
}

describe("splitAccountsByData — per-account initial vs normal", () => {
  it("บัญชีใหม่ทั้งหมด → อยู่ใน newAccounts (90 วัน)", () => {
    const accts = [{ id: 1 }, { id: 2 }];
    const { newAccounts, existingAccounts } = splitAccountsByData(accts, [false, false]);
    expect(newAccounts.map((a) => a.id)).toEqual([1, 2]);
    expect(existingAccounts).toEqual([]);
  });

  it("บัญชีเก่าทั้งหมด → อยู่ใน existingAccounts (7 วัน)", () => {
    const accts = [{ id: 1 }, { id: 2 }];
    const { newAccounts, existingAccounts } = splitAccountsByData(accts, [true, true]);
    expect(newAccounts).toEqual([]);
    expect(existingAccounts.map((a) => a.id)).toEqual([1, 2]);
  });

  it("ผสม: บัญชีเก่า 2 + บัญชีใหม่ 1 → แยกถูกกลุ่ม", () => {
    // workspace มีบัญชี A,B (เก่า) อยู่แล้ว และเพิ่งเพิ่ม C (ใหม่)
    const accts = [{ id: 10 }, { id: 11 }, { id: 99 }];
    const flags = [true, true, false]; // A,B มีข้อมูล / C ยังไม่มี
    const { newAccounts, existingAccounts } = splitAccountsByData(accts, flags);
    expect(newAccounts.map((a) => a.id)).toEqual([99]); // C → 90 วัน
    expect(existingAccounts.map((a) => a.id)).toEqual([10, 11]); // A,B → 7 วัน
  });

  it("บัญชีใหม่ใช้ since ของ 90 วัน, บัญชีเก่าใช้ 7 วัน", () => {
    const base = new Date("2025-06-04T00:00:00Z");
    const sinceNew = dateOffsetString(89, base);
    const sinceOld = dateOffsetString(6, base);
    expect(sinceNew).toBe("2025-03-07");
    expect(sinceOld).toBe("2025-05-29");
  });

  it("ไม่มีบัญชี → ทั้งสองกลุ่มว่าง", () => {
    const { newAccounts, existingAccounts } = splitAccountsByData([], []);
    expect(newAccounts).toEqual([]);
    expect(existingAccounts).toEqual([]);
  });
});
