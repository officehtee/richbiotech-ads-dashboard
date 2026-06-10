import { describe, it, expect } from "vitest";
import {
  getDisplayStatus,
  getStatusCsvText,
  STATUS_MAP,
} from "@shared/statusLabels";

/**
 * Phase 3A — unit test mapping effective_status → ไทย + สี (pure)
 * เทสต์ได้เลย ไม่พึ่ง network/DB
 */
describe("getDisplayStatus — known statuses (ไทย + สี)", () => {
  it("ACTIVE → ใช้งานอยู่ เขียว", () => {
    expect(getDisplayStatus("ACTIVE")).toMatchObject({
      label: "ใช้งานอยู่",
      tone: "green",
      known: true,
      empty: false,
    });
  });

  it("DISAPPROVED → ถูกปฏิเสธ แดง", () => {
    expect(getDisplayStatus("DISAPPROVED")).toMatchObject({
      label: "ถูกปฏิเสธ",
      tone: "red",
      known: true,
    });
  });

  it("ADSET_DISAPPROVED / CAMPAIGN_DISAPPROVED → ถูกปฏิเสธ แดง", () => {
    expect(getDisplayStatus("ADSET_DISAPPROVED").tone).toBe("red");
    expect(getDisplayStatus("CAMPAIGN_DISAPPROVED").label).toBe("ถูกปฏิเสธ");
  });

  it("PAUSED / CAMPAIGN_PAUSED / ADSET_PAUSED → ปิดอยู่ เทา", () => {
    expect(getDisplayStatus("PAUSED")).toMatchObject({ label: "ปิดอยู่", tone: "gray", known: true });
    expect(getDisplayStatus("CAMPAIGN_PAUSED").tone).toBe("gray");
    expect(getDisplayStatus("ADSET_PAUSED").label).toBe("ปิดอยู่");
  });

  it("ARCHIVED → เก็บถาวร / DELETED → ถูกลบ (เทา)", () => {
    expect(getDisplayStatus("ARCHIVED")).toMatchObject({ label: "เก็บถาวร", tone: "gray" });
    expect(getDisplayStatus("DELETED")).toMatchObject({ label: "ถูกลบ", tone: "gray" });
  });

  it("PENDING_REVIEW → กำลังตรวจสอบ เหลือง", () => {
    expect(getDisplayStatus("PENDING_REVIEW")).toMatchObject({ label: "กำลังตรวจสอบ", tone: "yellow", known: true });
  });

  it("IN_PROCESS เหลือง / PENDING_BILLING_INFO เหลือง", () => {
    expect(getDisplayStatus("IN_PROCESS").tone).toBe("yellow");
    expect(getDisplayStatus("PENDING_BILLING_INFO")).toMatchObject({
      label: "รอข้อมูลการเรียกเก็บเงิน",
      tone: "yellow",
    });
  });

  it("WITH_ISSUES → มีปัญหา ส้ม", () => {
    expect(getDisplayStatus("WITH_ISSUES")).toMatchObject({ label: "มีปัญหา", tone: "orange", known: true });
  });

  it("case-insensitive + ตัดช่องว่าง", () => {
    expect(getDisplayStatus("active").label).toBe("ใช้งานอยู่");
    expect(getDisplayStatus("Disapproved").tone).toBe("red");
    expect(getDisplayStatus(" ACTIVE ").label).toBe("ใช้งานอยู่");
  });
});

describe("getDisplayStatus — fallback ค่าไม่รู้จัก (สำคัญ)", () => {
  it("ค่าใหม่ที่ไม่อยู่ใน map → แสดงค่าดิบ + เทากลาง + known=false", () => {
    expect(getDisplayStatus("SOME_NEW_STATUS")).toMatchObject({
      label: "SOME_NEW_STATUS",
      tone: "gray",
      known: false,
      empty: false,
    });
  });

  it("UNKNOWN → แสดงดิบ ไม่หายเงียบ", () => {
    expect(getDisplayStatus("UNKNOWN")).toMatchObject({ label: "UNKNOWN", tone: "gray", known: false });
  });
});

describe("getDisplayStatus — null/ว่าง → '—'", () => {
  it("null → '—' + empty=true", () => {
    expect(getDisplayStatus(null)).toMatchObject({ label: "—", tone: "gray", empty: true });
  });
  it("undefined → '—'", () => {
    expect(getDisplayStatus(undefined).label).toBe("—");
  });
  it("string ว่าง → '—'", () => {
    expect(getDisplayStatus("   ").empty).toBe(true);
  });
});

describe("getStatusCsvText", () => {
  it("known → ไทย / unknown → ดิบ / null → '—'", () => {
    expect(getStatusCsvText("ACTIVE")).toBe("ใช้งานอยู่");
    expect(getStatusCsvText("FOO_BAR")).toBe("FOO_BAR");
    expect(getStatusCsvText(null)).toBe("—");
  });
});

describe("STATUS_MAP integrity", () => {
  it("ทุก entry มี label + tone ที่ถูกต้อง", () => {
    const validTones = new Set(["green", "red", "yellow", "orange", "gray"]);
    for (const [k, v] of Object.entries(STATUS_MAP)) {
      expect(v.label.length, k).toBeGreaterThan(0);
      expect(validTones.has(v.tone), `${k}:${v.tone}`).toBe(true);
    }
  });
});
