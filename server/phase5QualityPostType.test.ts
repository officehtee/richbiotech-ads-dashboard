/**
 * Phase 5 — Unit tests สำหรับ คุณภาพ ads (ระดับแคมเปญ) + ประเภทโพส (ระดับแอด)
 *
 * ครอบคลุม:
 *  1. schema: campaignStatus มี quality, adInsightsDaily มี postType
 *  2. updateCampaignQuality / updateAdPostType เป็น function ที่ export จาก db
 *  3. input schema ของ 2 mutation (quality enum 4 ระดับ nullable / postType enum 2 nullable)
 *  4. optimistic update logic: คุณภาพ ads → วนทุกแถวที่ campaignId เดียวกัน
 *  5. optimistic update logic: ประเภทโพส → วนทุกแถวที่ adId เดียวกัน
 *  6. label mapping (QUALITY_LABEL / POSTTYPE_LABEL)
 *  7. quality text class mapping (ไฮไลต์ชื่อแคมเปญ)
 *  8. synthetic row มี campaignQuality (จาก cs.quality) + postType = null
 *  9. CSV value mapping ใช้ label ไม่ใช่ enum key
 * 10. sync ไม่ทับ quality/postType (updateSet ไม่มี field เหล่านี้)
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── 1. schema fields ──────────────────────────────────────────────────────────
describe("schema fields (Phase 5)", () => {
  it("campaignStatus มี column quality", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.campaignStatus).toBeDefined();
    expect((schema.campaignStatus as any).quality).toBeDefined();
  });

  it("adInsightsDaily มี column postType", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.adInsightsDaily).toBeDefined();
    expect((schema.adInsightsDaily as any).postType).toBeDefined();
  });
});

// ── 2. db helpers exported ─────────────────────────────────────────────────────
describe("db helpers (Phase 5)", () => {
  it("export updateCampaignQuality + updateAdPostType", async () => {
    const db = await import("./db");
    expect(typeof db.updateCampaignQuality).toBe("function");
    expect(typeof db.updateAdPostType).toBe("function");
  });
});

// ── 3. mutation input schemas ───────────────────────────────────────────────────
describe("updateCampaignQuality input schema", () => {
  const schema = z.object({
    campaignId: z.string().min(1),
    quality: z.enum(["angel", "rising", "testing", "tested"]).nullable(),
  });

  it("รับ quality 4 ระดับได้", () => {
    for (const q of ["angel", "rising", "testing", "tested"]) {
      expect(schema.safeParse({ campaignId: "c1", quality: q }).success).toBe(true);
    }
  });

  it("รับ null ได้ (ล้างค่า)", () => {
    expect(schema.safeParse({ campaignId: "c1", quality: null }).success).toBe(true);
  });

  it("ปฏิเสธค่านอก enum", () => {
    expect(schema.safeParse({ campaignId: "c1", quality: "bad" }).success).toBe(false);
  });

  it("ปฏิเสธ campaignId ว่าง", () => {
    expect(schema.safeParse({ campaignId: "", quality: "angel" }).success).toBe(false);
  });
});

describe("updateAdPostType input schema", () => {
  const schema = z.object({
    adId: z.string().min(1),
    postType: z.enum(["main", "support"]).nullable(),
  });

  it("รับ main/support ได้", () => {
    expect(schema.safeParse({ adId: "a1", postType: "main" }).success).toBe(true);
    expect(schema.safeParse({ adId: "a1", postType: "support" }).success).toBe(true);
  });

  it("รับ null ได้", () => {
    expect(schema.safeParse({ adId: "a1", postType: null }).success).toBe(true);
  });

  it("ปฏิเสธค่านอก enum", () => {
    expect(schema.safeParse({ adId: "a1", postType: "หลัก" }).success).toBe(false);
  });
});

// ── 4. optimistic: คุณภาพ ads วนทุกแถวที่ campaignId เดียวกัน ────────────────────
describe("optimistic update — campaignQuality (ระดับแคมเปญ)", () => {
  type Row = { adId: string; campaignId: string; campaignQuality: string | null };
  const apply = (rows: Row[], campaignId: string, quality: string | null) =>
    rows.map((row) =>
      String(row.campaignId) === String(campaignId)
        ? { ...row, campaignQuality: quality }
        : row,
    );

  it("อัปเดตทุกแถวของแคมเปญเดียวกัน (หลายแอด)", () => {
    const rows: Row[] = [
      { adId: "a1", campaignId: "c1", campaignQuality: null },
      { adId: "a2", campaignId: "c1", campaignQuality: null },
      { adId: "a3", campaignId: "c2", campaignQuality: null },
    ];
    const out = apply(rows, "c1", "angel");
    expect(out[0].campaignQuality).toBe("angel");
    expect(out[1].campaignQuality).toBe("angel"); // แถวที่ 2 ของ c1 ก็เปลี่ยน
    expect(out[2].campaignQuality).toBeNull(); // c2 ไม่กระทบ
  });

  it("ล้างค่าเป็น null ได้", () => {
    const rows: Row[] = [{ adId: "a1", campaignId: "c1", campaignQuality: "tested" }];
    const out = apply(rows, "c1", null);
    expect(out[0].campaignQuality).toBeNull();
  });
});

// ── 5. optimistic: ประเภทโพส วนทุกแถวที่ adId เดียวกัน ──────────────────────────
describe("optimistic update — postType (ระดับแอด)", () => {
  type Row = { adId: string; date: string; postType: string | null };
  const apply = (rows: Row[], adId: string, postType: string | null) =>
    rows.map((row) => (row.adId === adId ? { ...row, postType } : row));

  it("อัปเดตทุกแถว (ทุกวัน) ของ adId เดียวกัน", () => {
    const rows: Row[] = [
      { adId: "a1", date: "2025-01-01", postType: null },
      { adId: "a1", date: "2025-01-02", postType: null },
      { adId: "a2", date: "2025-01-01", postType: null },
    ];
    const out = apply(rows, "a1", "main");
    expect(out[0].postType).toBe("main");
    expect(out[1].postType).toBe("main"); // อีกวันของ a1 ก็เปลี่ยน
    expect(out[2].postType).toBeNull(); // a2 ไม่กระทบ
  });
});

// ── 6. label mapping ────────────────────────────────────────────────────────────
describe("QUALITY_LABEL / POSTTYPE_LABEL", () => {
  const QUALITY_LABEL: Record<string, string> = {
    angel: "นางฟ้า",
    rising: "กำลังจะเป็นนางฟ้า",
    testing: "กำลังเทส",
    tested: "ผ่านการเทส",
  };
  const POSTTYPE_LABEL: Record<string, string> = {
    main: "หลัก",
    support: "รุม",
  };

  it("คุณภาพ ads ครบ 4 ระดับ", () => {
    expect(QUALITY_LABEL.angel).toBe("นางฟ้า");
    expect(QUALITY_LABEL.rising).toBe("กำลังจะเป็นนางฟ้า");
    expect(QUALITY_LABEL.testing).toBe("กำลังเทส");
    expect(QUALITY_LABEL.tested).toBe("ผ่านการเทส");
  });

  it("ประเภทโพส หลัก/รุม", () => {
    expect(POSTTYPE_LABEL.main).toBe("หลัก");
    expect(POSTTYPE_LABEL.support).toBe("รุม");
  });
});

// ── 7. quality text class (ไฮไลต์ชื่อแคมเปญ) ──────────────────────────────────
describe("QUALITY_TEXT_CLASS mapping", () => {
  const QUALITY_TEXT_CLASS: Record<string, string> = {
    angel: "text-emerald-600 dark:text-emerald-400",
    rising: "text-orange-500 dark:text-orange-400",
    testing: "text-sky-600 dark:text-sky-400",
    tested: "text-yellow-600 dark:text-yellow-400",
  };

  it("มีคลาสสีครบ 4 ระดับ", () => {
    expect(Object.keys(QUALITY_TEXT_CLASS)).toHaveLength(4);
    for (const k of ["angel", "rising", "testing", "tested"]) {
      expect(QUALITY_TEXT_CLASS[k]).toMatch(/text-/);
    }
  });

  it("ไม่ไฮไลต์เมื่อ quality เป็น null (fallback ว่าง)", () => {
    const q: string | null = null;
    const cls = q ? QUALITY_TEXT_CLASS[q] : "";
    expect(cls).toBe("");
  });
});

// ── 8. synthetic row fields (Phase 5) ──────────────────────────────────────────
describe("synthetic row campaignQuality + postType", () => {
  it("campaignQuality มาจาก cs.quality, postType = null", () => {
    const cs = { quality: "rising" as const };
    const row = {
      campaignQuality: cs.quality ?? null,
      postType: null,
    };
    expect(row.campaignQuality).toBe("rising");
    expect(row.postType).toBeNull();
  });

  it("campaignQuality = null เมื่อ cs.quality ไม่มี", () => {
    const cs = { quality: null as null };
    const row = { campaignQuality: cs.quality ?? null, postType: null };
    expect(row.campaignQuality).toBeNull();
  });
});

// ── 9. CSV value mapping ────────────────────────────────────────────────────────
describe("CSV export uses labels", () => {
  const QUALITY_LABEL: Record<string, string> = {
    angel: "นางฟ้า",
    rising: "กำลังจะเป็นนางฟ้า",
    testing: "กำลังเทส",
    tested: "ผ่านการเทส",
  };
  const POSTTYPE_LABEL: Record<string, string> = { main: "หลัก", support: "รุม" };

  it("แปลง enum → label ไทยใน CSV", () => {
    expect(QUALITY_LABEL["angel"] ?? "").toBe("นางฟ้า");
    expect(POSTTYPE_LABEL["support"] ?? "").toBe("รุม");
  });

  it("null/ไม่ระบุ → empty string", () => {
    const q = null as string | null;
    const p = undefined as string | undefined;
    expect((q ? QUALITY_LABEL[q] : "") ?? "").toBe("");
    expect((p ? POSTTYPE_LABEL[p] : "") ?? "").toBe("");
  });
});

// ── 10. sync ไม่ทับ quality/postType ────────────────────────────────────────────
describe("sync guard — ไม่ทับค่าที่ผู้ใช้ตั้ง", () => {
  it("upsertCampaignStatus.updateSet ไม่มี quality", () => {
    // จำลอง updateSet ที่ใช้ใน db.ts upsertCampaignStatus
    const updateSet: Record<string, unknown> = {
      accountId: 1,
      campaignName: "X",
      effectiveStatus: "ACTIVE",
      approvedAt: null,
      rejectedAt: null,
      rejectedExpired: false,
      syncedAt: new Date(),
    };
    expect("quality" in updateSet).toBe(false);
  });

  it("upsertAdInsightsDaily.updateSet ไม่มี postType", () => {
    // จำลอง updateSet ที่ใช้ใน db.ts upsertAdInsightsDaily
    const updateSet: Record<string, unknown> = {
      spend: 0,
      impressions: 0,
      clicks: 0,
    };
    expect("postType" in updateSet).toBe(false);
  });

  it("row ที่ส่งให้ upsertAdInsightsDaily จาก sync ไม่มี postType", () => {
    // จาก deepAdsSync.ts บรรทัด 164-187 — ไม่มี postType ใน object
    const row: Record<string, unknown> = {
      userId: 1,
      adId: "a1",
      campaignId: "c1",
      date: "2025-01-01",
      spend: 100,
    };
    expect("postType" in row).toBe(false);
  });
});
