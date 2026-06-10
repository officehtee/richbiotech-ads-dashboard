import { describe, it, expect } from "vitest";
import { decideAdStatusActions } from "./deepAdsSync";

/**
 * Phase 3C — จุด 3 ⭐ (สำคัญสุด): กัน clear ตอน fetchAdStatuses fail
 *
 * แยก 2 เคสให้ชัด:
 *   - ok=false (ดึงไม่ได้/network error) → ห้าม clearStale + ห้าม override + ห้าม write
 *     (ไม่งั้นลบ issues ทิ้งหมดทั้งบัญชี เพราะเข้าใจผิดว่า ad หายหมด)
 *   - ok=true แต่ ads ว่าง (ดึงได้จริง ไม่มี ad ผิดเลย) → clearStale ได้ (ล้าง issues เก่าถูกต้อง)
 *   - ok=true มี ads → ทำครบ A+B
 */
describe("Phase 3C — decideAdStatusActions (กัน clear ตอน fail)", () => {
  it("ok=false (ดึงไม่ได้) → ไม่ทำอะไรเลย (ห้าม clear/override/write)", () => {
    const d = decideAdStatusActions({ ok: false });
    expect(d.clearStale).toBe(false);
    expect(d.applyRollup).toBe(false);
    expect(d.writeIssues).toBe(false);
  });

  it("ok=true (ดึงได้ มี/ไม่มี ad ผิด) → ทำครบ (clearStale=true ล้าง snapshot ได้)", () => {
    const d = decideAdStatusActions({ ok: true });
    expect(d.clearStale).toBe(true);
    expect(d.applyRollup).toBe(true);
    expect(d.writeIssues).toBe(true);
  });

  it("จุด 3 ⭐ ยืนยัน: fail แล้วต้องไม่ clear (กัน data loss)", () => {
    // simulate fetchAdStatuses fail
    const failResult = { ok: false, ads: [] as unknown[] };
    const d = decideAdStatusActions(failResult);
    // ads ว่างเหมือน empty แต่ ok=false → ต้องไม่ clear (ต่างจาก empty ที่ ok=true)
    expect(d.clearStale).toBe(false);
  });
});
