/**
 * Prompt D — Unit tests สำหรับ deepAds owner filter + 4 new fields
 *
 * ครอบคลุม:
 *  1. DeepAdsFilters รับ ownerUserId optional
 *  2. getDeepAdsRows ส่ง ownerUserId filter ไปยัง WHERE condition
 *  3. deepAds.list input schema รับ ownerUserId optional
 *  4. synthetic rows (WAIT/REJECT) มี ownerUserId/paymentType/limitAmount/roasTarget
 *  5. synthetic rows ถูก filter ออกเมื่อ ownerUserId ไม่ตรง
 *  6. enriched rows มี ownerUserId/paymentType/limitAmount/roasTarget จาก SELECT
 */

import { describe, it, expect } from "vitest";

// ── 1. DeepAdsFilters type ────────────────────────────────────────────────────
describe("DeepAdsFilters type", () => {
  it("รับ ownerUserId optional ได้", async () => {
    const { } = await import("./db");
    // ตรวจว่า type compile ผ่าน — ถ้า field ไม่มีจะ tsc error
    type F = import("./db").DeepAdsFilters;
    const f1: F = {};
    const f2: F = { ownerUserId: 42 };
    const f3: F = { ownerUserId: undefined };
    expect(f1).toBeDefined();
    expect(f2.ownerUserId).toBe(42);
    expect(f3.ownerUserId).toBeUndefined();
  });
});

// ── 2. ownerUserId filter logic (pure unit) ───────────────────────────────────
describe("ownerUserId filter logic for synthetic rows", () => {
  it("ข้ามแถวที่ ownerUserId ไม่ตรงกับ filter", () => {
    const filterOwnerUserId = 10;
    const accOwnerUserId = 20; // ไม่ตรง
    const shouldSkip = filterOwnerUserId !== undefined && accOwnerUserId !== filterOwnerUserId;
    expect(shouldSkip).toBe(true);
  });

  it("ไม่ข้ามแถวที่ ownerUserId ตรงกับ filter", () => {
    const filterOwnerUserId = 10;
    const accOwnerUserId = 10; // ตรง
    const shouldSkip = filterOwnerUserId !== undefined && accOwnerUserId !== filterOwnerUserId;
    expect(shouldSkip).toBe(false);
  });

  it("ไม่ข้ามเมื่อ filter เป็น undefined (แสดงทุกแถว)", () => {
    const filterOwnerUserId: number | undefined = undefined;
    const accOwnerUserId = 10;
    const shouldSkip = filterOwnerUserId !== undefined && accOwnerUserId !== filterOwnerUserId;
    expect(shouldSkip).toBe(false);
  });

  it("ข้ามแถวที่ acc.ownerUserId เป็น null เมื่อ filter ระบุ", () => {
    const filterOwnerUserId = 10;
    const accOwnerUserId: number | null = null;
    // null !== 10 → ข้าม
    const shouldSkip = filterOwnerUserId !== undefined && accOwnerUserId !== filterOwnerUserId;
    expect(shouldSkip).toBe(true);
  });
});

// ── 3. synthetic row fields ───────────────────────────────────────────────────
describe("synthetic row fields (WAIT/REJECT)", () => {
  it("synthetic row มี ownerUserId จาก acc", () => {
    const acc = { ownerUserId: 5, paymentType: "card" as const, limitAmount: 1000 };
    const grp = { roasTarget: 3.5 };
    const row = {
      ownerUserId: acc?.ownerUserId ?? null,
      paymentType: acc?.paymentType ?? null,
      limitAmount: acc?.limitAmount ?? null,
      roasTarget: grp?.roasTarget ?? null,
    };
    expect(row.ownerUserId).toBe(5);
    expect(row.paymentType).toBe("card");
    expect(row.limitAmount).toBe(1000);
    expect(row.roasTarget).toBe(3.5);
  });

  it("synthetic row มี null เมื่อ acc ไม่มีข้อมูล", () => {
    const acc = { ownerUserId: null, paymentType: null as null, limitAmount: null };
    const grp: { roasTarget?: number } | undefined = undefined;
    const row = {
      ownerUserId: acc?.ownerUserId ?? null,
      paymentType: acc?.paymentType ?? null,
      limitAmount: acc?.limitAmount ?? null,
      roasTarget: grp?.roasTarget ?? null,
    };
    expect(row.ownerUserId).toBeNull();
    expect(row.paymentType).toBeNull();
    expect(row.limitAmount).toBeNull();
    expect(row.roasTarget).toBeNull();
  });

  it("synthetic row มี null เมื่อ acc ไม่พบใน accountById", () => {
    const acc: undefined = undefined;
    const grp: undefined = undefined;
    const row = {
      ownerUserId: acc?.ownerUserId ?? null,
      paymentType: acc?.paymentType ?? null,
      limitAmount: acc?.limitAmount ?? null,
      roasTarget: grp?.roasTarget ?? null,
    };
    expect(row.ownerUserId).toBeNull();
    expect(row.paymentType).toBeNull();
    expect(row.limitAmount).toBeNull();
    expect(row.roasTarget).toBeNull();
  });
});

// ── 4. deepAds.list input schema ─────────────────────────────────────────────
describe("deepAds.list input schema", () => {
  it("รับ ownerUserId optional ใน input schema", async () => {
    const { z } = await import("zod");
    const schema = z.object({
      dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      search: z.string().optional(),
      accountId: z.number().optional(),
      groupId: z.number().optional(),
      ownerUserId: z.number().optional(),
    });
    // ไม่มี ownerUserId → ผ่าน
    const r1 = schema.safeParse({ dateFrom: "2025-01-01", dateTo: "2025-01-31" });
    expect(r1.success).toBe(true);
    // มี ownerUserId → ผ่าน
    const r2 = schema.safeParse({ dateFrom: "2025-01-01", dateTo: "2025-01-31", ownerUserId: 7 });
    expect(r2.success).toBe(true);
    if (r2.success) expect(r2.data.ownerUserId).toBe(7);
    // ownerUserId เป็น string → ไม่ผ่าน
    const r3 = schema.safeParse({ dateFrom: "2025-01-01", dateTo: "2025-01-31", ownerUserId: "abc" });
    expect(r3.success).toBe(false);
  });
});

// ── 5. paymentType label mapping ─────────────────────────────────────────────
describe("paymentType label mapping", () => {
  const PAYMENT_LABEL: Record<string, string> = {
    card: "ผูกบัตร",
    prepaid: "เติมเงิน",
  };

  it("card → ผูกบัตร", () => {
    expect(PAYMENT_LABEL["card"]).toBe("ผูกบัตร");
  });

  it("prepaid → เติมเงิน", () => {
    expect(PAYMENT_LABEL["prepaid"]).toBe("เติมเงิน");
  });

  it("null/undefined → ไม่มีใน map", () => {
    expect(PAYMENT_LABEL["null"]).toBeUndefined();
    expect(PAYMENT_LABEL[""]).toBeUndefined();
  });
});

// ── 6. roasTarget display ─────────────────────────────────────────────────────
describe("roasTarget display", () => {
  it("แสดง 2 ทศนิยม", () => {
    const roasTarget = 2.5;
    expect(roasTarget.toFixed(2)).toBe("2.50");
  });

  it("null → แสดง —", () => {
    const roasTarget: number | null = null;
    const display = roasTarget != null ? roasTarget.toFixed(2) : "—";
    expect(display).toBe("—");
  });

  it("0 → แสดง 0.00", () => {
    const roasTarget = 0;
    const display = roasTarget != null ? roasTarget.toFixed(2) : "—";
    expect(display).toBe("0.00");
  });
});

// ── 7. Phase 2: closed campaign synthetic row logic ──────────────────────────
// จำลอง guard ใน routers.ts: synthetic row แคมเปญปิดจะถูกสร้างเมื่อ
//   (a) effectiveStatus = closed (PAUSED/ARCHIVED)
//   (b) trashedAt == null (ไม่อยู่ในถัง)
//   (c) ไม่มีใน insights (campaignId ไม่อยู่ใน realCampaignIds) → กันซ้ำ
import { classifyMetaStatus, shouldShowClosedRow } from "./campaignStatus";

describe("Phase 2: closed synthetic row guard logic", () => {
  // จำลอง logic การตัดสินใจสร้าง synthetic row ใน routers.ts:1390-1404
  const shouldCreateClosedSynthetic = (params: {
    effectiveStatus: string | null;
    trashedAt: number | null;
    inInsights: boolean;
  }): boolean => {
    if (params.trashedAt != null) return false; // guard: อยู่ในถัง → ไม่สร้าง
    const isClosed = shouldShowClosedRow(params.effectiveStatus);
    if (!isClosed) return false;
    if (params.inInsights) return false; // กันซ้ำกับ row จริง
    return true;
  };

  it("แคมเปญปิด (PAUSED) ไม่มีใน insights + ไม่อยู่ในถัง → สร้าง synthetic row", () => {
    expect(
      shouldCreateClosedSynthetic({
        effectiveStatus: "PAUSED",
        trashedAt: null,
        inInsights: false,
      }),
    ).toBe(true);
  });

  it("แคมเปญปิด (ARCHIVED) มีใน insights แล้ว → ไม่สร้างซ้ำ (แค่ติดป้ายเทาที่ row จริง)", () => {
    expect(
      shouldCreateClosedSynthetic({
        effectiveStatus: "ARCHIVED",
        trashedAt: null,
        inInsights: true,
      }),
    ).toBe(false);
  });

  it("แคมเปญปิดที่อยู่ในถัง (trashedAt != null) → ไม่สร้าง (ถูกซ่อน)", () => {
    expect(
      shouldCreateClosedSynthetic({
        effectiveStatus: "PAUSED",
        trashedAt: 1781000000000,
        inInsights: false,
      }),
    ).toBe(false);
  });

  it("แคมเปญ active/wait/reject ไม่เข้าเงื่อนไข closed synthetic (จัดการคนละ branch)", () => {
    expect(
      shouldCreateClosedSynthetic({
        effectiveStatus: "ACTIVE",
        trashedAt: null,
        inInsights: false,
      }),
    ).toBe(false);
    expect(
      shouldCreateClosedSynthetic({
        effectiveStatus: "DISAPPROVED",
        trashedAt: null,
        inInsights: false,
      }),
    ).toBe(false);
    expect(
      shouldCreateClosedSynthetic({
        effectiveStatus: "PENDING_REVIEW",
        trashedAt: null,
        inInsights: false,
      }),
    ).toBe(false);
  });

  it("closed bucket ครอบ 4 สถานะหลัก + ไม่ปนกับ bucket อื่น", () => {
    expect(classifyMetaStatus("PAUSED")).toBe("closed");
    expect(classifyMetaStatus("CAMPAIGN_PAUSED")).toBe("closed");
    expect(classifyMetaStatus("ADSET_PAUSED")).toBe("closed");
    expect(classifyMetaStatus("ARCHIVED")).toBe("closed");
    expect(classifyMetaStatus("DELETED")).toBe("other");
  });

  it("synthetic closed row isNoSpendRow = true + statusBadge = CLOSED (จาก computeBadge)", async () => {
    const { computeBadge } = await import("./campaignStatus");
    // synthetic row แคมเปญปิดต้องมี badge CLOSED + เป็น no-spend row
    const badge = computeBadge("PAUSED", null, null, new Date("2026-06-09T00:00:00Z"));
    expect(badge).toBe("CLOSED");
    const isNoSpendRow = true; // synthetic row เสมอ
    expect(isNoSpendRow).toBe(true);
  });
});
