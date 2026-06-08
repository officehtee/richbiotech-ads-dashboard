import { describe, it, expect } from "vitest";

/**
 * Logic การแสดง "ชื่อเล่น" ในหน้า Profile (read-only)
 * จำลองนิพจน์ที่ใช้จริงใน Profile.tsx:
 *   {user.nickname?.trim() ? user.nickname : "—"}
 */
function displayNickname(nickname: string | null | undefined): string {
  return nickname?.trim() ? nickname : "—";
}

describe("Profile — การแสดงชื่อเล่น (read-only)", () => {
  it("แสดงชื่อเล่นเมื่อมีค่า", () => {
    expect(displayNickname("บอส")).toBe("บอส");
  });

  it("แสดง — เมื่อ nickname เป็น null", () => {
    expect(displayNickname(null)).toBe("—");
  });

  it("แสดง — เมื่อ nickname เป็น undefined", () => {
    expect(displayNickname(undefined)).toBe("—");
  });

  it("แสดง — เมื่อ nickname เป็นสตริงว่าง", () => {
    expect(displayNickname("")).toBe("—");
  });

  it("แสดง — เมื่อ nickname มีแต่ช่องว่าง", () => {
    expect(displayNickname("   ")).toBe("—");
  });

  it("คงค่าเดิม (ไม่ trim) เมื่อมีตัวอักษรจริงปนช่องว่าง", () => {
    expect(displayNickname("  บอส  ")).toBe("  บอส  ");
  });
});
