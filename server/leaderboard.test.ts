import { describe, expect, it } from "vitest";

/**
 * Pure helpers that mirror the sorting logic of the Leaderboard page,
 * so we can regression-test ranking behavior without touching the UI.
 */
type Row = {
  id: string;
  spend: number;
  roas: number;
  purchases: number;
};

function rank<T extends Row>(rows: T[], metric: keyof Row, direction: "top" | "bottom", limit: number): T[] {
  const filtered = metric === "roas" ? rows.filter((r) => r.spend > 0) : rows;
  const sorted = [...filtered].sort((a, b) => {
    const av = (a[metric] as number) ?? 0;
    const bv = (b[metric] as number) ?? 0;
    return direction === "top" ? bv - av : av - bv;
  });
  return sorted.slice(0, limit);
}

const sample: Row[] = [
  { id: "A", spend: 1000, roas: 3.5, purchases: 10 },
  { id: "B", spend: 2000, roas: 0.5, purchases: 2 },
  { id: "C", spend: 0, roas: 0, purchases: 0 }, // No spend, should be excluded for ROAS
  { id: "D", spend: 500, roas: 5.0, purchases: 4 },
  { id: "E", spend: 3000, roas: 1.2, purchases: 8 },
];

describe("Leaderboard ranking logic", () => {
  it("ranks top by ROAS and excludes zero-spend rows", () => {
    const result = rank(sample, "roas", "top", 3);
    expect(result.map((r) => r.id)).toEqual(["D", "A", "E"]);
    expect(result.find((r) => r.id === "C")).toBeUndefined();
  });

  it("ranks bottom by ROAS (worst first), still excludes zero spend", () => {
    const result = rank(sample, "roas", "bottom", 3);
    expect(result.map((r) => r.id)).toEqual(["B", "E", "A"]);
  });

  it("ranks top by Spend (no zero-spend filter for non-ROAS metrics)", () => {
    const result = rank(sample, "spend", "top", 3);
    expect(result.map((r) => r.id)).toEqual(["E", "B", "A"]);
  });

  it("ranks bottom by Spend (includes zero-spend rows)", () => {
    const result = rank(sample, "spend", "bottom", 2);
    expect(result.map((r) => r.id)).toEqual(["C", "D"]);
  });

  it("respects limit (Top 1)", () => {
    expect(rank(sample, "purchases", "top", 1)).toHaveLength(1);
    expect(rank(sample, "purchases", "top", 1)[0].id).toBe("A");
  });

  it("returns empty when all rows filtered out (ROAS with all zero spend)", () => {
    const allZero = [{ id: "X", spend: 0, roas: 5, purchases: 0 }];
    expect(rank(allZero, "roas", "top", 5)).toEqual([]);
  });
});
