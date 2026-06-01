import { describe, expect, it } from "vitest";
import {
  computeExplodeOffset,
  truncateLabel,
} from "../client/src/lib/donutExplode";

describe("Round 7.33 — donutExplode helpers", () => {
  describe("computeExplodeOffset", () => {
    it("0° (right) → push purely along +X", () => {
      const o = computeExplodeOffset(0, 10);
      expect(o.dx).toBeCloseTo(10, 5);
      expect(o.dy).toBeCloseTo(0, 5);
    });

    it("90° (up in Recharts) → push purely along -Y (visual up)", () => {
      const o = computeExplodeOffset(90, 10);
      expect(o.dx).toBeCloseTo(0, 5);
      expect(o.dy).toBeCloseTo(-10, 5);
    });

    it("180° (left) → push purely along -X", () => {
      const o = computeExplodeOffset(180, 10);
      expect(o.dx).toBeCloseTo(-10, 5);
      expect(o.dy).toBeCloseTo(0, 5);
    });

    it("270° (down) → push purely along +Y (visual down)", () => {
      const o = computeExplodeOffset(270, 10);
      expect(o.dx).toBeCloseTo(0, 5);
      expect(o.dy).toBeCloseTo(10, 5);
    });

    it("distance = 0 → no offset", () => {
      const o = computeExplodeOffset(45, 0);
      expect(o.dx).toBeCloseTo(0, 5);
      expect(o.dy).toBeCloseTo(0, 5);
    });

    it("scales linearly with distance", () => {
      const a = computeExplodeOffset(45, 10);
      const b = computeExplodeOffset(45, 20);
      expect(b.dx).toBeCloseTo(a.dx * 2, 5);
      expect(b.dy).toBeCloseTo(a.dy * 2, 5);
    });
  });

  describe("truncateLabel", () => {
    it("returns original when shorter than max", () => {
      expect(truncateLabel("hello", 10)).toBe("hello");
    });

    it("truncates with ellipsis when longer than max", () => {
      const r = truncateLabel("hello world long text", 10);
      expect(r.length).toBe(10);
      expect(r.endsWith("…")).toBe(true);
    });

    it("handles exactly max length", () => {
      expect(truncateLabel("0123456789", 10)).toBe("0123456789");
    });

    it("handles empty string", () => {
      expect(truncateLabel("", 5)).toBe("");
    });

    it("handles null/undefined safely", () => {
      // @ts-expect-error testing falsy
      expect(truncateLabel(undefined, 5)).toBe("");
      // @ts-expect-error testing falsy
      expect(truncateLabel(null, 5)).toBe("");
    });
  });
});
