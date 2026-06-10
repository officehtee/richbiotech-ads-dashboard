import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

/**
 * เฟส 3B — Integration tests สำหรับ deepAds.markRequestReview (toggle "ส่งคำขอโฆษณา")
 * ครอบคลุม:
 *  - toggle on → จด requestReviewAt = today; toggle off → เคลียร์เป็น null
 *  - ownership guard: staff แก้ได้เฉพาะแคมเปญในบัญชีของตัวเอง / owner+supervisor แก้ได้ทุกบัญชีใน tenant
 *  - content role ถูกบล็อกที่ระดับ procedure (nonContentProcedure)
 *  - แคมเปญไม่พบ → NOT_FOUND
 */

type StoredCS = {
  userId: number; // tenant
  campaignId: string;
  accountId: number | null;
  requestReviewAt: string | null;
};

type StoredAccount = {
  id: number;
  userId: number; // tenant
  ownerUserId: number | null;
};

const store: {
  cs: StoredCS[];
  accounts: StoredAccount[];
} = { cs: [], accounts: [] };

function reset() {
  store.cs = [
    { userId: 10, campaignId: "c_A", accountId: 100, requestReviewAt: null },
    { userId: 10, campaignId: "c_B", accountId: 101, requestReviewAt: "2026-06-01" },
  ];
  store.accounts = [
    { id: 100, userId: 10, ownerUserId: 20 }, // staff A's account
    { id: 101, userId: 10, ownerUserId: 21 }, // staff B's account
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
    markRequestReview: vi.fn(
      async (tid: number, campaignId: string, requested: boolean, today: string) => {
        const c = store.cs.find((x) => x.userId === tid && x.campaignId === campaignId);
        if (!c) return false;
        c.requestReviewAt = requested ? today : null;
        return true;
      },
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

describe("เฟส 3B: deepAds.markRequestReview — toggle", () => {
  it("toggle on → จด requestReviewAt = วันนี้", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const res = await caller.deepAds.markRequestReview({
      campaignId: "c_A",
      requested: true,
    });
    expect(res.ok).toBe(true);
    expect(res.requestReviewAt).not.toBeNull();
    expect(store.cs.find((c) => c.campaignId === "c_A")?.requestReviewAt).toBe(
      res.requestReviewAt,
    );
  });

  it("toggle off → เคลียร์ requestReviewAt = null", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const res = await caller.deepAds.markRequestReview({
      campaignId: "c_B",
      requested: false,
    });
    expect(res.ok).toBe(true);
    expect(res.requestReviewAt).toBeNull();
    expect(store.cs.find((c) => c.campaignId === "c_B")?.requestReviewAt).toBeNull();
  });
});

describe("เฟส 3B: ownership guard", () => {
  it("staff A แก้แคมเปญในบัญชีตัวเอง (c_A → account 100) ได้", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    const res = await caller.deepAds.markRequestReview({
      campaignId: "c_A",
      requested: true,
    });
    expect(res.ok).toBe(true);
  });

  it("staff A แก้แคมเปญในบัญชีคนอื่น (c_B → account 101 ของ staff B) ไม่ได้ → FORBIDDEN", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    await expect(
      caller.deepAds.markRequestReview({ campaignId: "c_B", requested: true }),
    ).rejects.toThrow();
  });

  it("supervisor แก้ได้ทุกบัญชีใน tenant (c_B ของ staff B)", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor", 30));
    const res = await caller.deepAds.markRequestReview({
      campaignId: "c_B",
      requested: true,
    });
    expect(res.ok).toBe(true);
  });

  it("content role ถูกบล็อกที่ระดับ procedure → throw", async () => {
    const caller = appRouter.createCaller(makeCtx("content", 40));
    await expect(
      caller.deepAds.markRequestReview({ campaignId: "c_A", requested: true }),
    ).rejects.toThrow();
  });

  it("แคมเปญไม่พบ → NOT_FOUND", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    await expect(
      caller.deepAds.markRequestReview({ campaignId: "c_NOPE", requested: true }),
    ).rejects.toThrow();
  });
});
