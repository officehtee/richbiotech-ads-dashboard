/**
 * Round 7.26 — verifies the new DD/MM/YYYY numeric date formatter
 * used in the "วิเคราะห์แอดเชิงลึก" table date column.
 *
 * Lives in /server/ so it picks up the existing vitest config without
 * needing a JSDOM environment.
 */
import { describe, expect, it } from "vitest";
import { formatDateNumeric } from "../client/src/lib/format";

describe("formatDateNumeric (Round 7.26)", () => {
  it("formats a standard ISO date as DD/MM/YYYY using the Gregorian year", () => {
    expect(formatDateNumeric("2026-06-01")).toBe("01/06/2026");
  });

  it("keeps the year exactly as given (no BE conversion)", () => {
    // 2026 AD must stay 2026 — must NOT become 2569 (BE)
    const out = formatDateNumeric("2026-12-31");
    expect(out).toBe("31/12/2026");
    expect(out).not.toContain("2569");
  });

  it("preserves zero-padding for single-digit day and month", () => {
    expect(formatDateNumeric("2026-01-09")).toBe("09/01/2026");
  });

  it("returns the original string for malformed input", () => {
    expect(formatDateNumeric("not-a-date")).toBe("not-a-date");
    expect(formatDateNumeric("2026/06/01")).toBe("2026/06/01");
    expect(formatDateNumeric("")).toBe("");
  });

  it("does not shift by timezone (does not depend on Date parsing)", () => {
    // The May→April shift bug from Round 7.10 used toISOString() which is
    // timezone-sensitive. The numeric formatter uses a regex on the raw
    // YYYY-MM-DD string, so it must return the same day every time
    // regardless of local timezone.
    const original = process.env.TZ;
    try {
      process.env.TZ = "UTC";
      expect(formatDateNumeric("2026-05-27")).toBe("27/05/2026");
      process.env.TZ = "Asia/Bangkok";
      expect(formatDateNumeric("2026-05-27")).toBe("27/05/2026");
      process.env.TZ = "America/Los_Angeles";
      expect(formatDateNumeric("2026-05-27")).toBe("27/05/2026");
    } finally {
      process.env.TZ = original;
    }
  });
});
