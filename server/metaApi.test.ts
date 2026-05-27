import { describe, it, expect } from "vitest";
import { dateRangeFromPreset } from "./metaApi";

describe("dateRangeFromPreset", () => {
  it("returns 7-day range for '7d' preset", () => {
    const r = dateRangeFromPreset("7d");
    expect(r.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.until).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const since = new Date(r.since);
    const until = new Date(r.until);
    const diffDays = Math.round((until.getTime() - since.getTime()) / 86400000);
    expect(diffDays).toBe(6); // 7 days inclusive
  });

  it("returns 30-day range for '30d' preset", () => {
    const r = dateRangeFromPreset("30d");
    const diffDays = Math.round((new Date(r.until).getTime() - new Date(r.since).getTime()) / 86400000);
    expect(diffDays).toBe(29);
  });

  it("returns 3-day range for '3d' preset", () => {
    const r = dateRangeFromPreset("3d");
    const diffDays = Math.round((new Date(r.until).getTime() - new Date(r.since).getTime()) / 86400000);
    expect(diffDays).toBe(2);
  });
});
