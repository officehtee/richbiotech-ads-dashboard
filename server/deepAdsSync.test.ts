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
