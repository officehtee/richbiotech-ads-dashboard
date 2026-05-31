/**
 * Round 7.23 Phase 4 — bmSync helpers
 *
 * \u0e15\u0e23\u0e27\u0e08 logic \u0e02\u0e2d\u0e07 shouldNotifyOwner + summarizeOutcome
 *   - \u0e08\u0e30\u0e44\u0e21\u0e48\u0e41\u0e08\u0e49\u0e07\u0e16\u0e49\u0e32 sync \u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08\u0e41\u0e15\u0e48\u0e44\u0e21\u0e48\u0e21\u0e35 diff (idempotent run)
 *   - \u0e41\u0e08\u0e49\u0e07\u0e40\u0e2a\u0e21\u0e2d\u0e40\u0e21\u0e37\u0e48\u0e2d sync \u0e25\u0e49\u0e21\u0e40\u0e2b\u0e25\u0e27 (token expired/blocked)
 *   - \u0e41\u0e08\u0e49\u0e07\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e21\u0e35\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e43\u0e2b\u0e21\u0e48 \u0e2b\u0e23\u0e37\u0e2d\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e16\u0e39\u0e01\u0e16\u0e2d\u0e14
 */
import { describe, expect, it } from "vitest";
import { shouldNotifyOwner, summarizeOutcome, type SyncOutcome } from "./bmSync";
import type { BusinessManager } from "../drizzle/schema";

const fakeBm = (overrides: Partial<BusinessManager> = {}): BusinessManager =>
  ({
    id: 1,
    bmId: "1234567890",
    name: "Test BM",
    userId: 99,
    accountGroupId: 5,
    accessTokenEncrypted: "abc",
    tokenExpiresAt: null,
    lastSyncAt: null,
    status: "active",
    createdBy: 1,
    createdAt: new Date(),
    ...overrides,
  }) as any;

describe("shouldNotifyOwner", () => {
  it("ไม่ notify ถ้า sync ปกติแต่ไม่มี diff", () => {
    const outcome: SyncOutcome = {
      ok: true,
      bmId: 1,
      newCount: 0,
      existingCount: 5,
      removedCount: 0,
      totalFound: 5,
    };
    expect(shouldNotifyOwner(outcome)).toBe(false);
  });

  it("notify ถ้ามีบัญชีใหม่", () => {
    const outcome: SyncOutcome = {
      ok: true,
      bmId: 1,
      newCount: 2,
      existingCount: 3,
      removedCount: 0,
      totalFound: 5,
    };
    expect(shouldNotifyOwner(outcome)).toBe(true);
  });

  it("notify ถ้ามีบัญชีถูกถอด", () => {
    const outcome: SyncOutcome = {
      ok: true,
      bmId: 1,
      newCount: 0,
      existingCount: 5,
      removedCount: 1,
      totalFound: 5,
    };
    expect(shouldNotifyOwner(outcome)).toBe(true);
  });

  it("notify เสมอเมื่อ sync error (token_expired/blocked)", () => {
    const outcome: SyncOutcome = {
      ok: false,
      bmId: 1,
      error: { category: "token_expired", title: "Token หมดอายุ", message: "..." },
    };
    expect(shouldNotifyOwner(outcome)).toBe(true);
  });
});

describe("summarizeOutcome", () => {
  it("สรุปกรณี sync ผิดพลาด", () => {
    const out = summarizeOutcome(fakeBm({ name: "BM A", bmId: "111" }), {
      ok: false,
      bmId: 1,
      error: { category: "token_expired", title: "Token หมดอายุ", message: "Re-authorize required" },
    });
    expect(out.title).toContain("ล้มเหลว");
    expect(out.title).toContain("BM A");
    expect(out.content).toContain("Token หมดอายุ");
    expect(out.content).toContain("Re-authorize");
  });

  it("สรุปกรณีเจอบัญชีใหม่", () => {
    const out = summarizeOutcome(fakeBm({ name: "BM B" }), {
      ok: true,
      bmId: 1,
      newCount: 2,
      existingCount: 3,
      removedCount: 0,
      totalFound: 5,
    });
    expect(out.content).toContain("พบบัญชีใหม่ 2 บัญชี");
    expect(out.content).toContain("รวมบัญชีใน BM ตอนนี้: 5");
    expect(out.content).not.toContain("ถอด");
  });

  it("สรุปกรณีถอดบัญชีออก", () => {
    const out = summarizeOutcome(fakeBm({ name: "BM C" }), {
      ok: true,
      bmId: 1,
      newCount: 0,
      existingCount: 4,
      removedCount: 1,
      totalFound: 4,
    });
    expect(out.content).toContain("ถอดบัญชี 1 บัญชี");
  });

  it("สรุปกรณีทั้งเพิ่มและถอด", () => {
    const out = summarizeOutcome(fakeBm({ name: "BM D" }), {
      ok: true,
      bmId: 1,
      newCount: 1,
      existingCount: 2,
      removedCount: 1,
      totalFound: 3,
    });
    expect(out.content).toContain("พบบัญชีใหม่ 1");
    expect(out.content).toContain("ถอดบัญชี 1");
  });
});
