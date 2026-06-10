import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TrpcContext } from "./_core/context";

/**
 * Phase 3C (B) — Integration tests สำหรับ deepAds.getCampaignIssues
 * ครอบคลุม:
 *  - ดึง issues ของ campaign ในบัญชีตัวเองได้ (owner / staff เจ้าของ)
 *  - ownership guard: staff ดู campaign บัญชีคนอื่น → FORBIDDEN
 *  - supervisor/owner ดูได้ทุกบัญชีใน tenant
 *  - content role ถูกบล็อกที่ระดับ procedure (nonContentProcedure)
 *  - campaign ไม่มี issues → คืน ads ว่าง
 */

type StoredCS = {
  userId: number;
  campaignId: string;
  accountId: number | null;
};
type StoredAccount = { id: number; userId: number; ownerUserId: number | null };
type StoredAdIssue = {
  userId: number;
  campaignId: string;
  adId: string;
  adName: string | null;
  effectiveStatus: string;
  issues: { code?: number; title?: string; description?: string }[];
};

const store: {
  cs: StoredCS[];
  accounts: StoredAccount[];
  issues: StoredAdIssue[];
} = { cs: [], accounts: [], issues: [] };

function reset() {
  store.cs = [
    { userId: 10, campaignId: "c_A", accountId: 100 },
    { userId: 10, campaignId: "c_B", accountId: 101 },
    { userId: 10, campaignId: "c_clean", accountId: 100 },
  ];
  store.accounts = [
    { id: 100, userId: 10, ownerUserId: 20 }, // staff A
    { id: 101, userId: 10, ownerUserId: 21 }, // staff B
  ];
  store.issues = [
    {
      userId: 10,
      campaignId: "c_A",
      adId: "ad_1",
      adName: "Ad One",
      effectiveStatus: "DISAPPROVED",
      issues: [{ code: 1, title: "Policy", description: "ผิดนโยบายโฆษณา" }],
    },
    {
      userId: 10,
      campaignId: "c_B",
      adId: "ad_2",
      adName: "Ad Two",
      effectiveStatus: "WITH_ISSUES",
      issues: [{ title: "Review", description: "อยู่ระหว่างตรวจสอบ" }],
    },
  ];
}

vi.mock("./db", async () => {
  return {
    upsertUser: vi.fn(async () => undefined),
    getUserByOpenId: vi.fn(async () => undefined),
    getOwnerUserId: vi.fn(async () => 10),
    resolveWorkspaceUserId: vi.fn(
      async (userId: number, role: string, ownerId: number | null) =>
        role === "owner" || role === "admin" ? userId : ownerId ?? userId,
    ),
    getCampaignStatusOne: vi.fn(async (tid: number, campaignId: string) =>
      store.cs.find((c) => c.userId === tid && c.campaignId === campaignId) ?? null,
    ),
    getAdAccountById: vi.fn(async (id: number, tid: number) =>
      store.accounts.find((a) => a.id === id && a.userId === tid) ?? null,
    ),
    getAdIssuesByCampaign: vi.fn(async (tid: number, campaignId: string) =>
      store.issues.filter((i) => i.userId === tid && i.campaignId === campaignId),
    ),
  };
});

const { appRouter } = await import("./routers");

type AnyRole = "owner" | "ceo" | "supervisor" | "staff" | "content";

function makeCtx(role: AnyRole, id: number): TrpcContext {
  const user = {
    id,
    openId: `o${id}`,
    email: null,
    name: "U",
    loginMethod: "manus",
    role,
    ownerId: role === "owner" ? null : 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as unknown as NonNullable<TrpcContext["user"]>;
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

beforeEach(() => reset());
afterEach(() => vi.clearAllMocks());

describe("Phase 3C: deepAds.getCampaignIssues — ดึงเหตุผลปฏิเสธ", () => {
  it("owner ดึง issues ของ c_A ได้ (มี 1 ad reject)", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const res = await caller.deepAds.getCampaignIssues({ campaignId: "c_A" });
    expect(res.campaignId).toBe("c_A");
    expect(res.ads.length).toBe(1);
    expect(res.ads[0].adId).toBe("ad_1");
    expect(res.ads[0].issues[0].description).toContain("นโยบาย");
  });

  it("campaign ไม่มี issues (c_clean) → ads ว่าง", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const res = await caller.deepAds.getCampaignIssues({ campaignId: "c_clean" });
    expect(res.ads.length).toBe(0);
  });
});

describe("Phase 3C: getCampaignIssues — ownership guard", () => {
  it("staff A ดู c_A (บัญชีตัวเอง account 100) ได้", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    const res = await caller.deepAds.getCampaignIssues({ campaignId: "c_A" });
    expect(res.ads.length).toBe(1);
  });

  it("staff A ดู c_B (บัญชี staff B) ไม่ได้ → FORBIDDEN", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    await expect(
      caller.deepAds.getCampaignIssues({ campaignId: "c_B" }),
    ).rejects.toThrow();
  });

  it("supervisor ดูได้ทุกบัญชีใน tenant (c_B)", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor", 30));
    const res = await caller.deepAds.getCampaignIssues({ campaignId: "c_B" });
    expect(res.ads.length).toBe(1);
  });

  it("content role ถูกบล็อกที่ระดับ procedure → throw", async () => {
    const caller = appRouter.createCaller(makeCtx("content", 40));
    await expect(
      caller.deepAds.getCampaignIssues({ campaignId: "c_A" }),
    ).rejects.toThrow();
  });
});
