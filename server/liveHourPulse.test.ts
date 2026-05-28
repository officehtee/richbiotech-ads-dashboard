import { describe, it, expect } from "vitest";
import { buildLiveHourPulse } from "./aggregator";
import type { HourlyInsight } from "./metaApi";

const TODAY_ISO = "2026-05-28";
const NOW = new Date(`${TODAY_ISO}T11:30:00.000Z`); // 11:30 UTC, currentHour = 11

function row(date: string, hour: number, messaging: number): HourlyInsight {
  return { date, hour, spend: 0, messaging, impressions: 0, clicks: 0 };
}

describe("Round 7.18 — buildLiveHourPulse", () => {
  it("คืน 24 bars เสมอ และระบุ isCurrent ถูกชั่วโมง", () => {
    const r = buildLiveHourPulse([], NOW);
    expect(r.todayBars).toHaveLength(24);
    expect(r.todayBars.find((b) => b.isCurrent)?.hour).toBe(11);
    expect(r.todayBars.filter((b) => b.isFuture).map((b) => b.hour)).toEqual([
      12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    ]);
  });

  it("รวม messaging ในชั่วโมงปัจจุบัน (currentHour) ถูก", () => {
    const rows: HourlyInsight[] = [
      row(TODAY_ISO, 11, 20),
      row(TODAY_ISO, 11, 16), // multiple accounts → ต้องรวม
      row(TODAY_ISO, 10, 18),
      row(TODAY_ISO, 9, 12),
    ];
    const r = buildLiveHourPulse(rows, NOW);
    expect(r.currentHour).toBe(36);
    expect(r.todayCumulative).toBe(20 + 16 + 18 + 12);
  });

  it("คำนวณ baselineSameHour จาก 7 วันก่อนหน้า (ไม่นับวันนี้)", () => {
    const rows: HourlyInsight[] = [
      row(TODAY_ISO, 11, 36),
      row("2026-05-27", 11, 30),
      row("2026-05-26", 11, 32),
      row("2026-05-25", 11, 34),
      // วันก่อน ๆ
      row("2026-05-21", 11, 28),
    ];
    const r = buildLiveHourPulse(rows, NOW);
    // baseline = (30+32+34+28)/4 = 31
    expect(r.baselineSameHour).toBe(31);
  });

  it("คำนวณ deltaVsYesterdayPct ถูก", () => {
    const rows: HourlyInsight[] = [
      row(TODAY_ISO, 11, 36),
      row("2026-05-27", 11, 33), // เมื่อวานเวลาเดียวกัน
    ];
    const r = buildLiveHourPulse(rows, NOW);
    expect(r.deltaVsYesterdayPct).toBeCloseTo(((36 - 33) / 33) * 100, 1);
  });

  it("urgency = peak เมื่อ ratio >= 1.5", () => {
    const rows: HourlyInsight[] = [
      row(TODAY_ISO, 11, 60), // current
      row("2026-05-27", 11, 30), // baseline ~30
      row("2026-05-26", 11, 30),
      row("2026-05-25", 11, 30),
    ];
    const r = buildLiveHourPulse(rows, NOW);
    expect(r.urgency.level).toBe("peak");
    expect(r.motivation.tone).toBe("fire");
    expect(r.motivation.text).toMatch(/พีค|รีบ/);
  });

  it("urgency = quiet + motivation = wake เมื่อ current = 0 และมี baseline", () => {
    const rows: HourlyInsight[] = [
      row("2026-05-27", 11, 30),
      row("2026-05-26", 11, 28),
    ];
    const r = buildLiveHourPulse(rows, NOW);
    expect(r.currentHour).toBe(0);
    expect(r.urgency.level).toBe("quiet");
    expect(r.motivation.tone).toBe("wake");
  });

  it("urgency = rising + motivation = push เมื่อ ratio อยู่ระหว่าง 1.2–1.5", () => {
    const rows: HourlyInsight[] = [
      row(TODAY_ISO, 11, 36),
      row("2026-05-27", 11, 30),
      row("2026-05-26", 11, 30),
      row("2026-05-25", 11, 30),
    ];
    const r = buildLiveHourPulse(rows, NOW);
    // ratio = 36/30 = 1.2 → rising
    expect(r.urgency.level).toBe("rising");
    expect(r.motivation.tone).toBe("push");
  });

  it("คำนวณ avg7Days ถูกต้องจาก daily totals", () => {
    const rows: HourlyInsight[] = [
      // วันนี้ไม่นับ
      row(TODAY_ISO, 9, 50),
      // 7 วันย้อน — รวมต่อวัน
      row("2026-05-27", 10, 100),
      row("2026-05-27", 11, 50),
      row("2026-05-26", 9, 80),
    ];
    const r = buildLiveHourPulse(rows, NOW);
    // sortedDays = [(2026-05-27, 150), (2026-05-26, 80)]
    expect(r.avg7Days).toBe((150 + 80) / 2);
  });
});

describe("Round 7.18 — LiveHourPulse component requirements", () => {
  it("HubDashboard render LiveHourPulse เฉพาะตอน persona === sales", () => {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "..", "client/src/pages/HubDashboard.tsx"),
      "utf8",
    );
    expect(src).toMatch(/persona === "sales"\s*&&\s*<LiveHourPulse\s*\/>/);
  });

  it("trpc.dashboard.liveHourPulse procedure registered", () => {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "routers.ts"),
      "utf8",
    );
    expect(src).toMatch(/liveHourPulse:\s*protectedProcedure/);
  });

  it("LiveHourPulse component แสดง 'LIVE · 1 ชม.ล่าสุด' label + 24 bars", () => {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const src = fs.readFileSync(
      path.resolve(__dirname, "..", "client/src/pages/HubDashboard.tsx"),
      "utf8",
    );
    expect(src).toMatch(/LIVE · 1 ชม\.ล่าสุด/);
    expect(src).toMatch(/data\.todayBars\.map/);
    expect(src).toMatch(/vs เมื่อวานเวลาเดียวกัน/);
  });
});
