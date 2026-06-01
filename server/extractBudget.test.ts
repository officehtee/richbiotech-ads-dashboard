import { describe, it, expect } from "vitest";
import { extractBudgetFromMetaObject } from "./metaApi";

/**
 * Round 7.28 — Meta budget pulls daily_budget first, lifetime_budget as fallback.
 * Meta returns budgets in cents → values must come back in baht.
 */
describe("extractBudgetFromMetaObject", () => {
  it("returns daily_budget converted from cents to baht", () => {
    expect(extractBudgetFromMetaObject({ daily_budget: 50000 })).toBe(500);
  });

  it("falls back to lifetime_budget when daily_budget is missing", () => {
    expect(extractBudgetFromMetaObject({ lifetime_budget: 250000 })).toBe(2500);
  });

  it("prefers daily_budget over lifetime_budget when both exist", () => {
    expect(
      extractBudgetFromMetaObject({
        daily_budget: 30000,
        lifetime_budget: 250000,
      }),
    ).toBe(300);
  });

  it("treats string-typed numbers correctly (Meta returns strings)", () => {
    expect(
      extractBudgetFromMetaObject({ daily_budget: "12500" }),
    ).toBe(125);
    expect(
      extractBudgetFromMetaObject({ lifetime_budget: "75000" }),
    ).toBe(750);
  });

  it("returns null when both budgets are zero / missing / null", () => {
    expect(extractBudgetFromMetaObject({})).toBeNull();
    expect(
      extractBudgetFromMetaObject({ daily_budget: 0, lifetime_budget: 0 }),
    ).toBeNull();
    expect(
      extractBudgetFromMetaObject({
        daily_budget: null,
        lifetime_budget: null,
      }),
    ).toBeNull();
  });

  it("ignores non-numeric / negative values", () => {
    expect(
      extractBudgetFromMetaObject({ daily_budget: "abc" }),
    ).toBeNull();
    expect(
      extractBudgetFromMetaObject({ daily_budget: -100 }),
    ).toBeNull();
  });

  it("handles undefined input safely", () => {
    expect(extractBudgetFromMetaObject(undefined)).toBeNull();
    expect(extractBudgetFromMetaObject(null)).toBeNull();
  });
});
