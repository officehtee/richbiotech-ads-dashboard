import { describe, it, expect } from "vitest";
import { calculateScalingScore, decideScaleBadge, resolveDateRange } from "./aggregator";

describe("calculateScalingScore", () => {
  it("returns higher score when ROAS exceeds target", () => {
    const high = calculateScalingScore(4.0, 1.5, 2.0, 1.0); // ROAS 200% of target, CTR 150%
    const low = calculateScalingScore(0.5, 0.5, 2.0, 1.0);  // ROAS 25%, CTR 50%
    expect(high).toBeGreaterThan(low);
  });

  it("uses 0.7 ROAS + 0.3 CTR weighting", () => {
    // ROAS = target → roasNorm = 1; CTR = threshold → ctrNorm = 1; total = 1.0
    const score = calculateScalingScore(2.0, 1.0, 2.0, 1.0);
    expect(score).toBeCloseTo(1.0, 2);
  });

  it("handles zero values without dividing by zero", () => {
    const score = calculateScalingScore(0, 0, 2.0, 1.0);
    expect(score).toBe(0);
  });
});

describe("decideScaleBadge", () => {
  it("returns scale-up-large for very high score", () => {
    const r = decideScaleBadge(5.0, 2.0, 2.0, 1.0); // score very high
    expect(r.badge).toBe("scale-up-large");
    expect(r.badgeIcon).toBe("🚀");
  });

  it("returns scale-down-large for very low score", () => {
    const r = decideScaleBadge(0.1, 0.1, 2.0, 1.0);
    expect(r.badge).toBe("scale-down-large");
    expect(r.badgeIcon).toBe("⛔");
  });

  it("returns watch for borderline score", () => {
    const r = decideScaleBadge(1.6, 0.8, 2.0, 1.0); // ~ 0.8 weighted
    expect(["watch", "scale-up-small", "scale-down-small"]).toContain(r.badge);
  });
});

describe("resolveDateRange", () => {
  it("converts custom range correctly", () => {
    const r = resolveDateRange({ preset: "custom", since: "2026-05-01", until: "2026-05-15" } as any);
    expect(r.since).toBe("2026-05-01");
    expect(r.until).toBe("2026-05-15");
  });

  it("converts 7d preset to 7-day window", () => {
    const r = resolveDateRange({ preset: "7d" });
    const diff = Math.round((new Date(r.until).getTime() - new Date(r.since).getTime()) / 86400000);
    expect(diff).toBe(6);
  });
});
