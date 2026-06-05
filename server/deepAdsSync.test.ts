/**
 * Unit tests for Round 7.24 Deep Ads Sync
 * - Pure-function tests (no DB / no network)
 */
import { describe, expect, it } from "vitest";
import {
  pickBudgetForInsight,
  dateOffsetString,
  type BudgetMap,
} from "./deepAdsSync";
import { isPreviewFresh } from "./previewCache";

describe("pickBudgetForInsight (CBO fallback)", () => {
  const budgets: BudgetMap = {
    adset: { "111": 500, "222": 1000 },
    campaign: { "C-1": 2000, "C-2": 0 },
  };

  it("returns adset budget when adsetId is present", () => {
    const r = pickBudgetForInsight("111", "C-1", budgets);
    expect(r.value).toBe(500);
    expect(r.source).toBe("adset");
  });

  it("falls back to campaign budget when adset has none (CBO)", () => {
    const r = pickBudgetForInsight("999", "C-1", budgets);
    expect(r.value).toBe(2000);
    expect(r.source).toBe("campaign");
  });

  it("returns none when neither has budget", () => {
    const r = pickBudgetForInsight("999", "C-999", budgets);
    expect(r.value).toBeNull();
    expect(r.source).toBe("none");
  });

  it("handles missing adsetId (CBO ad)", () => {
    const r = pickBudgetForInsight(undefined, "C-1", budgets);
    expect(r.value).toBe(2000);
    expect(r.source).toBe("campaign");
  });

  it("handles 0-value budget as a valid value (NOT falsy fallback)", () => {
    // campaign 'C-2' explicitly set to 0 → 0 is still a value
    const r = pickBudgetForInsight(undefined, "C-2", budgets);
    expect(r.value).toBe(0);
    expect(r.source).toBe("campaign");
  });
});

describe("dateOffsetString", () => {
  it("returns YYYY-MM-DD format for today", () => {
    const r = dateOffsetString(0, new Date("2026-05-15T12:00:00Z"));
    expect(r).toBe("2026-05-15");
  });

  it("offsets backward by N days", () => {
    const r = dateOffsetString(7, new Date("2026-05-15T12:00:00Z"));
    expect(r).toBe("2026-05-08");
  });

  it("handles month/year rollover", () => {
    const r = dateOffsetString(7, new Date("2026-01-03T12:00:00Z"));
    expect(r).toBe("2025-12-27");
  });
});

describe("isPreviewFresh (7-day cache)", () => {
  const now = new Date("2026-05-15T12:00:00Z");

  it("returns false for null cachedAt", () => {
    expect(isPreviewFresh(null, now)).toBe(false);
    expect(isPreviewFresh(undefined, now)).toBe(false);
  });

  it("returns true if cached < 7 days ago", () => {
    const cached = new Date("2026-05-10T12:00:00Z"); // 5 days ago
    expect(isPreviewFresh(cached, now)).toBe(true);
  });

  it("returns false if cached >= 7 days ago", () => {
    const cached = new Date("2026-05-08T11:00:00Z"); // > 7 days ago
    expect(isPreviewFresh(cached, now)).toBe(false);
  });

  it("returns true for very recent cache (1 min ago)", () => {
    const cached = new Date(now.getTime() - 60 * 1000);
    expect(isPreviewFresh(cached, now)).toBe(true);
  });
});

/* Round 7.46 — Re-sync ย้อนหลัง (manual backfill) range helpers */
import { clampResyncDays, resolveResyncRange } from "./deepAdsSync";

describe("clampResyncDays (1–90 guard)", () => {
  it("keeps valid values within range", () => {
    expect(clampResyncDays(7)).toBe(7);
    expect(clampResyncDays(30)).toBe(30);
    expect(clampResyncDays(90)).toBe(90);
  });

  it("clamps values above 90 down to 90", () => {
    expect(clampResyncDays(120)).toBe(90);
    expect(clampResyncDays(9999)).toBe(90);
  });

  it("clamps values below 1 up to 1", () => {
    expect(clampResyncDays(0)).toBe(1);
    expect(clampResyncDays(-5)).toBe(1);
  });

  it("floors fractional values", () => {
    expect(clampResyncDays(30.9)).toBe(30);
  });

  it("falls back to 7 for non-finite input", () => {
    expect(clampResyncDays(NaN)).toBe(7);
    expect(clampResyncDays(Infinity)).toBe(7); // Number.isFinite(Infinity) === false → fallback 7
  });
});

describe("resolveResyncRange (since/until window)", () => {
  const base = new Date("2026-05-15T12:00:00Z");

  it("90 days → since 89 days back, until today (90-day inclusive window)", () => {
    const r = resolveResyncRange(90, base);
    expect(r.until).toBe("2026-05-15");
    expect(r.since).toBe("2026-02-15"); // 89 days before 2026-05-15
    expect(r.days).toBe(90);
  });

  it("7 days → since 6 days back, until today", () => {
    const r = resolveResyncRange(7, base);
    expect(r.until).toBe("2026-05-15");
    expect(r.since).toBe("2026-05-09");
    expect(r.days).toBe(7);
  });

  it("30 days window", () => {
    const r = resolveResyncRange(30, base);
    expect(r.until).toBe("2026-05-15");
    expect(r.since).toBe("2026-04-16");
    expect(r.days).toBe(30);
  });

  it("clamps over-limit days before computing range", () => {
    const r = resolveResyncRange(365, base);
    expect(r.days).toBe(90);
    expect(r.since).toBe("2026-02-15");
  });

  it("since is always <= until", () => {
    const r = resolveResyncRange(60, base);
    expect(r.since <= r.until).toBe(true);
  });
});
