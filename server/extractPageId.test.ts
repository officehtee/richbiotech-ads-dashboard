import { describe, it, expect } from "vitest";
import { extractPageId } from "./metaApi";

/**
 * Round 7.49 — ดึงชื่อเพจ Facebook ที่ใช้ยิงไม่ได้
 * ต้นเหตุ: แคมเปญ click-to-messenger / Advantage+ ไม่มี effective_object_story_id
 * page_id ที่ถูกต้องอยู่ใน object_story_spec.page_id
 */
describe("extractPageId — ครอบคลุม creative ทุกรูปแบบ", () => {
  it("ดึงจาก object_story_spec.page_id (messaging ad) เป็นอันดับแรก", () => {
    const creative = {
      object_story_spec: { page_id: "111222333" },
      effective_object_story_id: "999888777_555",
    };
    expect(extractPageId(creative)).toBe("111222333");
  });

  it("messaging ad ที่ไม่มี effective_object_story_id ยังดึง page_id ได้", () => {
    const creative = {
      object_story_spec: { page_id: "111222333", instagram_user_id: "ig_1" },
    };
    expect(extractPageId(creative)).toBe("111222333");
  });

  it("fallback ไป effective_object_story_id prefix (page post ทั่วไป)", () => {
    const creative = {
      effective_object_story_id: "444555666_789",
    };
    expect(extractPageId(creative)).toBe("444555666");
  });

  it("fallback ไป object_id เมื่อไม่มี spec/eosi", () => {
    const creative = { object_id: "777888999" };
    expect(extractPageId(creative)).toBe("777888999");
  });

  it("คืน null เมื่อไม่มีข้อมูลเลย", () => {
    expect(extractPageId({})).toBe(null);
    expect(extractPageId(null)).toBe(null);
    expect(extractPageId(undefined)).toBe(null);
  });

  it("คืน page_id เป็น string เสมอแม้ Meta คืนเป็น number", () => {
    const creative = { object_story_spec: { page_id: 123456 } };
    expect(extractPageId(creative)).toBe("123456");
  });

  it("ไม่ใช้ effective_object_story_id ที่ไม่มี underscore", () => {
    const creative = { effective_object_story_id: "nounderscore" };
    expect(extractPageId(creative)).toBe(null);
  });
});
