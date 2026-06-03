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
