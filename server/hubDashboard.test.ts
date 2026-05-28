/**
 * Hub Dashboard 2.0 pure helper tests.
 *
 * Verifies: urgency badge, today hourly bars, weekly heatmap, current-hour
 * baseline computation, and 5-step funnel construction.
 */
import { describe, expect, it } from "vitest";
import {
  buildFunnel,
  buildTodayHourlyBars,
  buildWeeklyHeatmap,
  computeCurrentHourBaseline,
  computeUrgency,
} from "./aggregator";
import type { HourlyInsight } from "./metaApi";

const mkRow = (date: string, hour: number, messaging: number, spend = 0): HourlyInsight => ({
  date,
  hour,
  messaging,
  spend,
  impressions: 0,
  clicks: 0,
});

describe("Hub 2.0 — computeUrgency", () => {
  it("returns peak when ratio >= 1.5", () => {
    const u = computeUrgency(30, 10);
    expect(u.level).toBe("peak");
    expect(u.color).toBe("danger");
    expect(u.iconName).toBe("Flame");
  });

  it("returns rising for 1.2-1.5", () => {
    expect(computeUrgency(13, 10).level).toBe("rising");
  });

  it("returns normal for 0.7-1.2", () => {
    expect(computeUrgency(10, 10).level).toBe("normal");
  });

  it("returns quiet below 0.7", () => {
    expect(computeUrgency(3, 10).level).toBe("quiet");
  });

  it("handles zero baseline without dividing by zero", () => {
    const u = computeUrgency(5, 0);
    expect(Number.isFinite(u.ratio)).toBe(true);
  });
});

describe("Hub 2.0 — buildTodayHourlyBars", () => {
  it("emits exactly 24 buckets in order 0..23", () => {
    const bars = buildTodayHourlyBars([], "2026-05-28");
    expect(bars).toHaveLength(24);
    expect(bars[0].hour).toBe(0);
    expect(bars[23].hour).toBe(23);
  });

  it("aggregates only rows from the given date", () => {
    const rows = [
      mkRow("2026-05-28", 10, 5),
      mkRow("2026-05-27", 10, 99), // wrong day — must be ignored
      mkRow("2026-05-28", 10, 3),
    ];
    const bars = buildTodayHourlyBars(rows, "2026-05-28");
    expect(bars[10].messaging).toBe(8);
  });
});

describe("Hub 2.0 — buildWeeklyHeatmap", () => {
  it("produces 7×24 = 168 cells", () => {
    expect(buildWeeklyHeatmap([])).toHaveLength(168);
  });

  it("maps Monday as weekday 0 and Sunday as weekday 6", () => {
    // 2026-05-25 is a Monday (UTC)
    const monday = mkRow("2026-05-25", 9, 3);
    // 2026-05-24 is a Sunday
    const sunday = mkRow("2026-05-24", 14, 7);
    const grid = buildWeeklyHeatmap([monday, sunday]);
    const monCell = grid.find((c) => c.weekday === 0 && c.hour === 9);
    const sunCell = grid.find((c) => c.weekday === 6 && c.hour === 14);
    expect(monCell?.messaging).toBe(3);
    expect(sunCell?.messaging).toBe(7);
  });
});

describe("Hub 2.0 — computeCurrentHourBaseline", () => {
  it("returns 0% delta with no baseline", () => {
    const { deltaPct } = computeCurrentHourBaseline([], "2026-05-28", 10);
    expect(deltaPct).toBe(0);
  });

  it("averages prior days and computes positive delta", () => {
    const rows = [
      mkRow("2026-05-28", 10, 20), // current
      mkRow("2026-05-27", 10, 10),
      mkRow("2026-05-26", 10, 10),
      mkRow("2026-05-25", 10, 10),
    ];
    const { current, baseline, deltaPct } = computeCurrentHourBaseline(rows, "2026-05-28", 10);
    expect(current).toBe(20);
    expect(baseline).toBeCloseTo(10);
    expect(deltaPct).toBeCloseTo(100);
  });
});

describe("Hub 2.0 — buildFunnel", () => {
  it("returns 5 steps and 4 drops", () => {
    const f = buildFunnel({
      impressions: 1000,
      clicks: 100,
      messaging: 30,
      purchases: 6,
      purchaseValue: 1200,
    });
    expect(f.steps).toHaveLength(5);
    expect(f.drops).toHaveLength(4);
  });

  it("computes CTR, msg→buy, and AOV correctly", () => {
    const f = buildFunnel({
      impressions: 1000,
      clicks: 100,
      messaging: 30,
      purchases: 6,
      purchaseValue: 1200,
    });
    const ctr = f.drops.find((d) => d.label === "CTR");
    const msgBuy = f.drops.find((d) => d.label === "msg → buy");
    const aov = f.drops.find((d) => d.label === "AOV");
    expect(ctr?.rate).toBeCloseTo(10);
    expect(msgBuy?.rate).toBeCloseTo(20);
    expect(aov?.rate).toBeCloseTo(200);
  });

  it("guards against zero divisions", () => {
    const f = buildFunnel({ impressions: 0, clicks: 0, messaging: 0, purchases: 0, purchaseValue: 0 });
    for (const d of f.drops) expect(Number.isFinite(d.rate)).toBe(true);
  });
});
