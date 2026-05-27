import { describe, expect, it } from "vitest";
import { autoPreviousRange, computeDelta, shiftRangeBack } from "./aggregator";

describe("computeDelta (Performance Comparison)", () => {
  it("returns 0 when both values are 0", () => {
    expect(computeDelta(0, 0)).toBe(0);
  });

  it("returns +100 when previous is 0 and current is positive", () => {
    expect(computeDelta(5, 0)).toBe(100);
  });

  it("returns -100 when previous is 0 and current is negative", () => {
    expect(computeDelta(-5, 0)).toBe(-100);
  });

  it("calculates positive delta", () => {
    // 110 vs 100 -> +10%
    expect(computeDelta(110, 100)).toBeCloseTo(10, 5);
  });

  it("calculates negative delta", () => {
    // 80 vs 100 -> -20%
    expect(computeDelta(80, 100)).toBeCloseTo(-20, 5);
  });

  it("handles non-finite inputs as 0", () => {
    expect(computeDelta(Number.NaN, 100)).toBe(0);
    expect(computeDelta(100, Number.NaN)).toBe(0);
    expect(computeDelta(Infinity, 100)).toBe(0);
  });
});

describe("shiftRangeBack (previous-period derivation)", () => {
  it("derives a same-length previous window ending the day before", () => {
    const prev = shiftRangeBack({ since: "2026-05-10", until: "2026-05-16" }); // 7 days
    expect(prev.until).toBe("2026-05-09");
    expect(prev.since).toBe("2026-05-03"); // 7 days earlier
  });

  it("handles a single-day window", () => {
    const prev = shiftRangeBack({ since: "2026-05-10", until: "2026-05-10" });
    expect(prev.since).toBe("2026-05-09");
    expect(prev.until).toBe("2026-05-09");
  });
});

describe("autoPreviousRange (DateRangeInput → previous DateRangeInput)", () => {
  it("returns a custom-preset previous range for a 7d input", () => {
    const prev = autoPreviousRange({ preset: "7d" });
    expect(prev.preset).toBe("custom");
    expect(prev.since).toBeDefined();
    expect(prev.until).toBeDefined();
  });
});
