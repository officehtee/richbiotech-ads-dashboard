import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

/**
 * เฟส 6 — Integration tests สำหรับ Tab "บัญชีของฉัน" (role-based) + เติมเงิน (topup)
 * ครอบคลุม:
 *  - accounts.myAccounts: staff เห็นเฉพาะบัญชีตัวเอง / OWNER_ROLES (owner/ceo/supervisor) เห็นทุกบัญชีใน tenant
 *  - ไม่ส่ง accessToken กลับ client
 *  - accounts.updateMyAccount: staff แก้ได้เฉพาะบัญชีตัวเอง / OWNER_ROLES แก้ได้ทุกบัญชีใน tenant / เช็ค tenant เสมอ
 *  - accounts.updateTopup: เฉพาะ prepaid, role-based, เช็ค tenant, set 4 ค่า
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
  // เฟส 6: topup
  topupLastDate: Date | null;
  topupDailySpend: number | null;
  topupUsed: number | null;
  topupBalance: number | null;
  topupUpdatedAt: Date | null;
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
      topupLastDate: null,
      topupDailySpend: null,
      topupUsed: null,
      topupBalance: null,
      topupUpdatedAt: null,
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
      topupLastDate: null,
      topupDailySpend: null,
      topupUsed: null,
      topupBalance: null,
      topupUpdatedAt: null,
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
      topupLastDate: null,
      topupDailySpend: null,
      topupUsed: null,
      topupBalance: null,
      topupUpdatedAt: null,
    },
  ];
}

vi.mock("./metaApi", async () => ({
  validateToken: vi.fn(async () => true),
  testAdAccountToken: vi.fn(async () => ({ ok: true, category: "ok" })),
}));

vi.mock("./db", async () => {
  const ownerNickname = (ownerUserId: number | null): string | null => {
    if (ownerUserId === 20) return "พนักงาน A";
    if (ownerUserId === 21) return "พนักงาน B";
    return null;
  };
  return {
    upsertUser: vi.fn(async () => undefined),
    getUserByOpenId: vi.fn(async () => undefined),
    getOwnerUserId: vi.fn(async () => 10),
    resolveWorkspaceUserId: vi.fn(
      async (userId: number, role: string, ownerId: number | null) =>
        role === "owner" ? userId : ownerId ?? userId,
    ),
    // เฟส 6: signature (tenantId, ownerUserId, seeAll)
    getMyAccountsEnriched: vi.fn(
      async (tid: number, ownerUserId: number, seeAll = false) =>
        store.accounts
          .filter(
            (a) =>
              a.userId === tid && (seeAll || a.ownerUserId === ownerUserId),
          )
          .map((a) => ({
            id: a.id,
            nickname: a.nickname,
            adAccountId: a.adAccountId,
            bmId: a.bmId,
            ownerUserId: a.ownerUserId,
            ownerNickname: ownerNickname(a.ownerUserId),
            paymentType: a.paymentType,
            limitAmount: a.limitAmount,
            groupNames: [] as string[],
            effectiveStatus: a.tokenStatus,
            statusSource: a.bmId ? "bm" : "single",
            topupLastDate: a.topupLastDate,
            topupDailySpend: a.topupDailySpend,
            topupUsed: a.topupUsed,
            topupBalance: a.topupBalance,
            topupUpdatedAt: a.topupUpdatedAt,
          })),
    ),
    getAdAccountById: vi.fn(async (id: number, tid: number) =>
      store.accounts.find((a) => a.id === id && a.userId === tid),
    ),
    updateAdAccount: vi.fn(async (id: number, tid: number, patch: any) => {
      const a = store.accounts.find((x) => x.id === id && x.userId === tid);
      if (a) Object.assign(a, patch);
    }),
    // เฟส 6: updateAccountTopup(id, tid, patch)
    updateAccountTopup: vi.fn(
      async (
        id: number,
        tid: number,
        patch: {
          topupLastDate: Date | null;
          topupDailySpend: number | null;
          topupUsed: number | null;
          topupBalance: number | null;
        },
      ) => {
        const a = store.accounts.find((x) => x.id === id && x.userId === tid);
        if (a) {
          Object.assign(a, patch);
          a.topupUpdatedAt = new Date();
        }
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

describe("accounts.myAccounts (role-based)", () => {
  it("staff A เห็นเฉพาะบัญชีตัวเอง (100, 102)", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    const rows = await caller.accounts.myAccounts();
    expect(rows.map((r) => r.id).sort()).toEqual([100, 102]);
    expect(rows.some((r) => r.id === 101)).toBe(false);
  });

  it("staff B เห็นเฉพาะบัญชีตัวเอง (101)", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 21));
    const rows = await caller.accounts.myAccounts();
    expect(rows.map((r) => r.id)).toEqual([101]);
  });

  it("supervisor เห็นทุกบัญชีใน tenant (100, 101, 102)", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor", 30));
    const rows = await caller.accounts.myAccounts();
    expect(rows.map((r) => r.id).sort()).toEqual([100, 101, 102]);
  });

  it("owner เห็นทุกบัญชีใน tenant", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const rows = await caller.accounts.myAccounts();
    expect(rows.map((r) => r.id).sort()).toEqual([100, 101, 102]);
  });

  it("OWNER_ROLES ได้คอลัมน์ ownerNickname กลับมาด้วย", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor", 30));
    const rows = await caller.accounts.myAccounts();
    const a = rows.find((r) => r.id === 100)!;
    expect(a.ownerNickname).toBe("พนักงาน A");
  });

  it("ไม่ส่ง accessToken กลับ client", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor", 30));
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

describe("accounts.updateMyAccount (role-based)", () => {
  it("staff แก้ paymentType + limitAmount ของบัญชีตัวเองได้", async () => {
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

  it("staff ตั้ง limitAmount เป็น null ได้", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    await caller.accounts.updateMyAccount({ id: 100, limitAmount: null });
    expect(store.accounts.find((x) => x.id === 100)!.limitAmount).toBeNull();
  });

  it("staff A แก้บัญชี staff B ไม่ได้ (FORBIDDEN)", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    await expect(
      caller.accounts.updateMyAccount({ id: 101, limitAmount: 1 }),
    ).rejects.toThrow();
    expect(store.accounts.find((x) => x.id === 101)!.limitAmount).toBeNull();
  });

  it("supervisor แก้บัญชีของ staff คนใดก็ได้ใน tenant", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor", 30));
    await caller.accounts.updateMyAccount({ id: 101, limitAmount: 999 });
    expect(store.accounts.find((x) => x.id === 101)!.limitAmount).toBe(999);
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

describe("accounts.updateTopup (เฟส 6)", () => {
  it("staff ตั้งค่าเติมเงินบัญชี prepaid ของตัวเองได้ (set 4 ค่า)", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    const ts = Date.UTC(2026, 5, 1, 12, 0, 0);
    await caller.accounts.updateTopup({
      id: 102, // prepaid ของ staff A
      topupLastDate: ts,
      topupDailySpend: 1000,
      topupUsed: 2000,
      topupBalance: 5000,
    });
    const a = store.accounts.find((x) => x.id === 102)!;
    expect(a.topupDailySpend).toBe(1000);
    expect(a.topupUsed).toBe(2000);
    expect(a.topupBalance).toBe(5000);
    expect(a.topupLastDate?.getTime()).toBe(ts);
    expect(a.topupUpdatedAt).not.toBeNull();
  });

  it("BAD_REQUEST เมื่อบัญชีไม่ใช่ prepaid (เช่น card)", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    await expect(
      caller.accounts.updateTopup({
        id: 100, // card
        topupDailySpend: 500,
        topupBalance: 1000,
        topupLastDate: null,
        topupUsed: null,
      }),
    ).rejects.toThrow();
    expect(store.accounts.find((x) => x.id === 100)!.topupDailySpend).toBeNull();
  });

  it("staff A ตั้งค่าเติมเงินบัญชี staff B ไม่ได้ (FORBIDDEN)", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    await expect(
      caller.accounts.updateTopup({
        id: 101, // staff B (และไม่ใช่ prepaid ด้วย แต่ FORBIDDEN ต้องมาก่อน)
        topupDailySpend: 500,
        topupBalance: 1000,
        topupLastDate: null,
        topupUsed: null,
      }),
    ).rejects.toThrow();
  });

  it("supervisor ตั้งค่าเติมเงินบัญชี prepaid ของ staff ได้", async () => {
    const caller = appRouter.createCaller(makeCtx("supervisor", 30));
    await caller.accounts.updateTopup({
      id: 102,
      topupDailySpend: 800,
      topupBalance: 4000,
      topupLastDate: null,
      topupUsed: null,
    });
    const a = store.accounts.find((x) => x.id === 102)!;
    expect(a.topupDailySpend).toBe(800);
    expect(a.topupBalance).toBe(4000);
  });

  it("content แก้เติมเงินไม่ได้ (ไม่มีบัญชีของตัวเอง → FORBIDDEN)", async () => {
    const caller = appRouter.createCaller(makeCtx("content", 50));
    await expect(
      caller.accounts.updateTopup({
        id: 102,
        topupDailySpend: 100,
        topupBalance: 100,
        topupLastDate: null,
        topupUsed: null,
      }),
    ).rejects.toThrow();
  });
});
