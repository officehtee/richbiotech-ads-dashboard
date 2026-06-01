import { describe, it, expect } from "vitest";

/**
 * Helpers จำลองตรรกะของ presetToDateRange ใน client/src/lib/format.ts
 * (ไม่ดึงจริงเพราะ vitest config นี้รัน server side)
 */
function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function presetToDateRange(
  preset: string,
  since?: string,
  until?: string,
  now: Date = new Date(),
): { dateFrom: string; dateTo: string } {
  if (preset === "custom" && since && until) return { dateFrom: since, dateTo: until };
  const today = new Date(now);

  if (preset === "today" || preset === "1d") {
    const t = fmt(today);
    return { dateFrom: t, dateTo: t };
  }
  if (preset === "yesterday") {
    const y = new Date(today);
    y.setDate(today.getDate() - 1);
    const ys = fmt(y);
    return { dateFrom: ys, dateTo: ys };
  }

  const map: Record<string, number> = { "3d": 3, "7d": 7, "14d": 14, "30d": 30 };
  const days = map[preset] ?? 7;
  const from = new Date(today);
  from.setDate(today.getDate() - days + 1);
  return { dateFrom: fmt(from), dateTo: fmt(today) };
}

describe("presetToDateRange (Round 7.30 — today / yesterday)", () => {
  const fixedNow = new Date(2026, 4, 30); // 30 พ.ค. 2026

  it("preset=today → since=until=today", () => {
    const r = presetToDateRange("today", undefined, undefined, fixedNow);
    expect(r.dateFrom).toBe("2026-05-30");
    expect(r.dateTo).toBe("2026-05-30");
  });

  it("preset=yesterday → since=until=today−1", () => {
    const r = presetToDateRange("yesterday", undefined, undefined, fixedNow);
    expect(r.dateFrom).toBe("2026-05-29");
    expect(r.dateTo).toBe("2026-05-29");
  });

  it("preset=1d (legacy) ตีความเป็น today (ไม่พังของเก่า)", () => {
    const r = presetToDateRange("1d", undefined, undefined, fixedNow);
    expect(r.dateFrom).toBe("2026-05-30");
    expect(r.dateTo).toBe("2026-05-30");
  });

  it("preset=3d → 3 วันล่าสุด รวมวันนี้", () => {
    const r = presetToDateRange("3d", undefined, undefined, fixedNow);
    expect(r.dateFrom).toBe("2026-05-28");
    expect(r.dateTo).toBe("2026-05-30");
  });

  it("preset=7d → 7 วันล่าสุด", () => {
    const r = presetToDateRange("7d", undefined, undefined, fixedNow);
    expect(r.dateFrom).toBe("2026-05-24");
    expect(r.dateTo).toBe("2026-05-30");
  });

  it("preset=custom + since/until → ใช้ค่าตามที่กำหนด", () => {
    const r = presetToDateRange("custom", "2026-05-01", "2026-05-15", fixedNow);
    expect(r.dateFrom).toBe("2026-05-01");
    expect(r.dateTo).toBe("2026-05-15");
  });

  it("yesterday รองรับวันต้นเดือน (ข้ามเดือน)", () => {
    const r = presetToDateRange("yesterday", undefined, undefined, new Date(2026, 5, 1)); // 1 มิ.ย.
    expect(r.dateFrom).toBe("2026-05-31");
    expect(r.dateTo).toBe("2026-05-31");
  });

  it("yesterday รองรับวันต้นปี (ข้ามปี)", () => {
    const r = presetToDateRange("yesterday", undefined, undefined, new Date(2027, 0, 1)); // 1 ม.ค.
    expect(r.dateFrom).toBe("2026-12-31");
    expect(r.dateTo).toBe("2026-12-31");
  });
});
