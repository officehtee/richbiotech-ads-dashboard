import { describe, it, expect } from "vitest";

/**
 * Helper functions แบบเดียวกับใน DateRangePicker.tsx
 * Local-date format ที่ไม่ shift ตาม timezone
 */
function fmtLocalDate(d?: Date): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(s?: string): Date | undefined {
  if (!s) return undefined;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date(s);
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

describe("DateRangePicker local-date helpers", () => {
  it("fmtLocalDate ส่งคืนวัน-เดือน-ปีตามเขตเวลาท้องถิ่น (ไม่ shift เป็น UTC)", () => {
    // เลือก 27 พ.ค. 2026 ในเขตเวลาท้องถิ่น
    const d = new Date(2026, 4, 27); // month index 4 = พ.ค.
    expect(fmtLocalDate(d)).toBe("2026-05-27");
  });

  it("fmtLocalDate ส่งคืน '' เมื่อ input เป็น undefined", () => {
    expect(fmtLocalDate(undefined)).toBe("");
  });

  it("fmtLocalDate รองรับวันสิ้นปี (31 ธ.ค.)", () => {
    const d = new Date(2026, 11, 31);
    expect(fmtLocalDate(d)).toBe("2026-12-31");
  });

  it("fmtLocalDate รองรับวันต้นปี (1 ม.ค.)", () => {
    const d = new Date(2027, 0, 1);
    expect(fmtLocalDate(d)).toBe("2027-01-01");
  });

  it("parseLocalDate แปลง YYYY-MM-DD เป็น Date ในเขตเวลาท้องถิ่น", () => {
    const d = parseLocalDate("2026-05-27");
    expect(d).toBeDefined();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(4);
    expect(d!.getDate()).toBe(27);
  });

  it("parseLocalDate ส่งคืน undefined เมื่อ input ว่าง", () => {
    expect(parseLocalDate(undefined)).toBeUndefined();
    expect(parseLocalDate("")).toBeUndefined();
  });

  it("round-trip: fmt → parse → fmt ได้ค่าเดิม", () => {
    const original = "2026-05-28";
    const parsed = parseLocalDate(original);
    expect(fmtLocalDate(parsed)).toBe(original);
  });

  it("regression: ป้องกันบั๊กที่เลือก 27-28 พ.ค. แล้วกลายเป็น 23-24 พ.ค.", () => {
    // จำลองสถานการณ์: ผู้ใช้เลือก 27 และ 28 พ.ค. 2026
    const from = new Date(2026, 4, 27);
    const to = new Date(2026, 4, 28);
    expect(fmtLocalDate(from)).toBe("2026-05-27"); // ไม่ใช่ 2026-05-23
    expect(fmtLocalDate(to)).toBe("2026-05-28"); // ไม่ใช่ 2026-05-24
  });
});
