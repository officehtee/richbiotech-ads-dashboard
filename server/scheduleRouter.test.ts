import { describe, it, expect } from "vitest";
import { AUTOSYNC_JOBS } from "./scheduleRouter";

/**
 * Round 7.40: ตรวจความถูกต้องของนิยาม Auto-sync cron jobs
 */
describe("AUTOSYNC_JOBS definitions", () => {
  it("มี 3 jobs ครบ: syncAdInsights, syncBM, checkAlerts", () => {
    const keys = AUTOSYNC_JOBS.map((j) => j.key).sort();
    expect(keys).toEqual(["checkAlerts", "syncAdInsights", "syncBM"]);
  });

  it("ทุก callback path ขึ้นต้นด้วย /api/scheduled/", () => {
    for (const job of AUTOSYNC_JOBS) {
      expect(job.path.startsWith("/api/scheduled/")).toBe(true);
    }
  });

  it("ทุก cron เป็น 6-field และรันทุกชั่วโมง (field ชั่วโมง = *)", () => {
    for (const job of AUTOSYNC_JOBS) {
      const fields = job.cron.trim().split(/\s+/);
      expect(fields).toHaveLength(6);
      const [sec, , hour, dom, mon, dow] = fields;
      // วินาที = 0 (ยิงที่ต้นนาที)
      expect(sec).toBe("0");
      // ชั่วโมง = * (ทุกชั่วโมง)
      expect(hour).toBe("*");
      // ทุกวัน/เดือน/วันในสัปดาห์
      expect(dom).toBe("*");
      expect(mon).toBe("*");
      expect(dow).toBe("*");
    }
  });

  it("นาทีของแต่ละ job เหลื่อมกันเพื่อกัน API burst", () => {
    const minutes = AUTOSYNC_JOBS.map((j) => j.cron.trim().split(/\s+/)[1]);
    const unique = new Set(minutes);
    // ทั้ง 3 job ต้องมีนาทีต่างกันทั้งหมด
    expect(unique.size).toBe(AUTOSYNC_JOBS.length);
  });

  it("ทุก job name ไม่ซ้ำกัน และมี prefix richbiotech-", () => {
    const names = AUTOSYNC_JOBS.map((j) => j.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
    for (const name of names) {
      expect(name.startsWith("richbiotech-")).toBe(true);
    }
  });

  it("ทุก job มี label และ description ภาษาไทยที่ไม่ว่าง", () => {
    for (const job of AUTOSYNC_JOBS) {
      expect(job.label.length).toBeGreaterThan(0);
      expect(job.description.length).toBeGreaterThan(0);
    }
  });
});
