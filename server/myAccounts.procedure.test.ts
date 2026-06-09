import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

/**
 * Prompt I (เฟส 1.6) — Integration tests สำหรับหน้า "บัญชีของฉัน" (staff)
 * ครอบคลุม:
 *  - accounts.myAccounts: กรองเฉพาะบัญชีของตัวเอง (ownerUserId === ctx.user.id), ไม่ส่ง accessToken
 *  - accounts.updateMyAccount: แก้ได้เฉพาะบัญชีตัวเอง (ownership guard → FORBIDDEN ถ้าไม่ใช่เจ้าของ)
 *  - แก้เฉพาะ paymentType + limitAmount เท่านั้น (ไม่แตะ field อื่น)
 */

type StoredAccount = {
  id: number;
  userId: number; // tenant
  adAccountId: string;
  accessToken: string;
  nickname: string | null;
  ownerUserId: number | null;
  paymentType: "card" | "prepaid" | null;
  limitAmount: number | null;
  tokenStatus: "active" | "token_expired" | "blocked" | "revoked";
  bmId: number | null;
};

const store: { accounts: StoredAccount[] } = { accounts: [] };

function reset() {
  store.accounts = [
    {
      id: 100,
      userId: 10,
      adAccountId: "act_111",
      accessToken: "SINGLE_TOKEN_1234567890",
      nickname: "บัญชีของฉัน-เอ",
      ownerUserId: 20, // staff A
      paymentType: "card",
      limitAmount: 5000,
      tokenStatus: "active",
      bmId: null,
    },
    {
      id: 101,
      userId: 10,
      adAccountId: "act_222",
      accessToken: "BM_DERIVED_TOKEN_0987654321",
      nickname: "บัญชีของคนอื่น-บี",
      ownerUserId: 21, // staff B
      paymentType: null,
      limitAmount: null,
      tokenStatus: "active",
      bmId: 1,
    },
    {
      id: 102,
      userId: 10,
      adAccountId: "act_333",
      accessToken: "SINGLE_TOKEN_BBBBBBBB",
      nickname: "บัญชีของฉัน-สอง",
      ownerUserId: 20, // staff A อีกบัญชี
      paymentType: "prepaid",
      limitAmount: 3000,
      tokenStatus: "blocked",
      bmId: null,
    },
  ];
}

vi.mock("./metaApi", async () => ({
  validateToken: vi.fn(async () => true),
  testAdAccountToken: vi.fn(async () => ({ ok: true, category: "ok" })),
}));

vi.mock("./db", async () => {
  return {
    upsertUser: vi.fn(async () => undefined),
    getUserByOpenId: vi.fn(async () => undefined),
    getOwnerUserId: vi.fn(async () => 10),
    resolveWorkspaceUserId: vi.fn(
      async (userId: number, role: string, ownerId: number | null) =>
        role === "owner" ? userId : ownerId ?? userId,
    ),
    // helper จริงของ Prompt I — จำลอง logic กรอง ownerUserId + tenant + ไม่ส่ง accessToken
    getMyAccountsEnriched: vi.fn(async (tid: number, ownerUserId: number) =>
      store.accounts
        .filter((a) => a.userId === tid && a.ownerUserId === ownerUserId)
        .map((a) => ({
          id: a.id,
          nickname: a.nickname,
          adAccountId: a.adAccountId,
          bmId: a.bmId,
          paymentType: a.paymentType,
          limitAmount: a.limitAmount,
          groupNames: [] as string[],
          effectiveStatus: a.tokenStatus,
          statusSource: a.bmId ? "bm" : "single",
        })),
    ),
    getAdAccountById: vi.fn(async (id: number, tid: number) =>
      store.accounts.find((a) => a.id === id && a.userId === tid),
    ),
    updateAdAccount: vi.fn(async (id: number, tid: number, patch: any) => {
      const a = store.accounts.find((x) => x.id === id && x.userId === tid);
      if (a) Object.assign(a, patch);
    }),
  };
});

const { appRouter } = await import("./routers");

function makeCtx(role: "owner" | "staff" | "content", id: number): TrpcContext {
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

describe("accounts.myAccounts", () => {
  it("คืนเฉพาะบัญชีที่ ownerUserId === ctx.user.id (staff A เห็น 2 บัญชี)", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    const rows = await caller.accounts.myAccounts();
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual([100, 102]);
    expect(rows.some((r) => r.id === 101)).toBe(false); // บัญชีของ staff B ไม่โผล่
  });

  it("staff B เห็นเฉพาะบัญชีตัวเอง (id 101)", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 21));
    const rows = await caller.accounts.myAccounts();
    expect(rows.map((r) => r.id)).toEqual([101]);
  });

  it("ไม่ส่ง accessToken กลับไปฝั่ง client", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    const rows = await caller.accounts.myAccounts();
    for (const r of rows) {
      expect(r).not.toHaveProperty("accessToken");
      expect(r).not.toHaveProperty("access_token");
    }
  });

  it("staff ที่ไม่มีบัญชีของตัวเองได้ลิสต์ว่าง", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 99));
    const rows = await caller.accounts.myAccounts();
    expect(rows).toEqual([]);
  });
});

describe("accounts.updateMyAccount", () => {
  it("แก้ paymentType + limitAmount ของบัญชีตัวเองได้", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    await caller.accounts.updateMyAccount({
      id: 100,
      paymentType: "prepaid",
      limitAmount: 8000,
    });
    const a = store.accounts.find((x) => x.id === 100)!;
    expect(a.paymentType).toBe("prepaid");
    expect(a.limitAmount).toBe(8000);
  });

  it("ตั้ง limitAmount เป็น null ได้ (ไม่จำกัด)", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    await caller.accounts.updateMyAccount({ id: 100, limitAmount: null });
    const a = store.accounts.find((x) => x.id === 100)!;
    expect(a.limitAmount).toBeNull();
  });

  it("FORBIDDEN เมื่อพยายามแก้บัญชีของคนอื่น (staff A แก้บัญชี staff B)", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    await expect(
      caller.accounts.updateMyAccount({ id: 101, limitAmount: 1 }),
    ).rejects.toThrow();
    // ค่าเดิมไม่เปลี่ยน
    const b = store.accounts.find((x) => x.id === 101)!;
    expect(b.limitAmount).toBeNull();
  });

  it("FORBIDDEN เมื่อบัญชีไม่มีอยู่จริง", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    await expect(
      caller.accounts.updateMyAccount({ id: 9999, limitAmount: 1 }),
    ).rejects.toThrow();
  });

  it("ไม่แตะ field อื่น (nickname/tokenStatus/ownerUserId คงเดิม)", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    await caller.accounts.updateMyAccount({ id: 102, paymentType: "card" });
    const a = store.accounts.find((x) => x.id === 102)!;
    expect(a.nickname).toBe("บัญชีของฉัน-สอง");
    expect(a.tokenStatus).toBe("blocked");
    expect(a.ownerUserId).toBe(20);
    expect(a.paymentType).toBe("card");
  });
});
