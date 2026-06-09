import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

/**
 * Prompt A — Integration tests สำหรับ procedures หน้าจัดการบัญชี
 * mock ./db, ./metaApi, ./encryption แล้วเรียกผ่าน appRouter.createCaller(ctx)
 * ครอบคลุม:
 *  - users.selectableOwners (กรอง pending ออก)
 *  - accounts.list (token เต็มเฉพาะบัญชีเดี่ยว, BM = "")
 *  - accounts.create (owner validation + ผูกกลุ่ม)
 *  - accounts.update (owner validation + group reassign)
 *  - bm.create (propagate ownerUserId → defaultOwnerUserId + บัญชีย่อย)
 *  - bm.getToken (decrypt token เต็ม + NOT_FOUND)
 *  - bm.update (re-encrypt token + validate owner)
 */

type StoredUser = {
  id: number;
  role: string;
  ownerId: number | null;
  nickname: string | null;
  name: string | null;
};

type StoredAccount = {
  id: number;
  userId: number;
  adAccountId: string;
  accessToken: string;
  nickname: string | null;
  ownerUserId: number | null;
  paymentType: "card" | "prepaid" | null;
  limitAmount: number | null;
  tokenStatus: "active" | "token_expired" | "blocked" | "revoked";
  bmId: number | null;
};

type StoredBM = {
  id: number;
  userId: number;
  bmId: string;
  name: string;
  accessTokenEncrypted: string;
  accountGroupId: number;
  defaultOwnerUserId: number | null;
  status: "active" | "token_expired" | "blocked" | "revoked";
};

const store: {
  users: StoredUser[];
  accounts: StoredAccount[];
  bms: StoredBM[];
  groupMembers: { groupId: number; accountId: number }[];
  nextAccountId: number;
  nextBmId: number;
} = {
  users: [],
  accounts: [],
  bms: [],
  groupMembers: [],
  nextAccountId: 1,
  nextBmId: 1,
};

function reset() {
  store.users = [
    { id: 10, role: "owner", ownerId: null, nickname: "เจ้าของ", name: "Owner" },
    { id: 20, role: "staff", ownerId: 10, nickname: "พนักงานเอ", name: "A" },
    { id: 21, role: "content", ownerId: 10, nickname: "พนักงานบี", name: "B" },
    { id: 22, role: "pending", ownerId: 10, nickname: null, name: "Pending" },
  ];
  store.accounts = [
    {
      id: 100,
      userId: 10,
      adAccountId: "act_111",
      accessToken: "SINGLE_TOKEN_1234567890",
      nickname: "บัญชีเดี่ยว",
      ownerUserId: 20,
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
      nickname: "บัญชีจาก BM",
      ownerUserId: 21,
      paymentType: null,
      limitAmount: null,
      tokenStatus: "active",
      bmId: 1,
    },
  ];
  store.bms = [
    {
      id: 1,
      userId: 10,
      bmId: "123456",
      name: "BM หลัก",
      accessTokenEncrypted: "ENC(BM_TOKEN_REAL)",
      accountGroupId: 5,
      defaultOwnerUserId: 21,
      status: "active",
    },
  ];
  store.groupMembers = [{ groupId: 5, accountId: 101 }];
  store.nextAccountId = 200;
  store.nextBmId = 2;
}

vi.mock("./metaApi", async () => ({
  validateToken: vi.fn(async () => true),
  testAdAccountToken: vi.fn(async () => ({ ok: true })),
  testBMConnection: vi.fn(async () => ({ ok: true })),
  discoverBMAccounts: vi.fn(async () => []),
  fetchAdsForAdset: vi.fn(async () => []),
  fetchAdsetDailyInsights: vi.fn(async () => []),
}));

vi.mock("./encryption", async () => ({
  encrypt: vi.fn((s: string) => `ENC(${s})`),
  decrypt: vi.fn((s: string) => {
    const m = /^ENC\((.*)\)$/.exec(s);
    if (!m) throw new Error("bad cipher");
    return m[1];
  }),
  maskToken: vi.fn((s: string) => `****${s.slice(-4)}`),
  previewTokenPrefix: vi.fn((s: string) => (s ? `${s.slice(0, 8)}...` : "")),
}));

vi.mock("./bmSync", async () => ({
  syncOneBusinessManager: vi.fn(async () => ({ ok: true })),
}));

vi.mock("./db", async () => {
  return {
    upsertUser: vi.fn(async () => undefined),
    getUserById: vi.fn(async (id: number) => store.users.find((u) => u.id === id)),
    getUserByOpenId: vi.fn(async () => undefined),
    getOwnerUserId: vi.fn(async () => 10),
    listUsersInWorkspace: vi.fn(async (tid: number) =>
      store.users.filter((u) => u.id === tid || u.ownerId === tid),
    ),
    listSelectableOwners: vi.fn(async (tid: number) =>
      store.users.filter((u) => (u.id === tid || u.ownerId === tid) && u.role !== "pending"),
    ),
    setUserRole: vi.fn(async () => undefined),
    findUserByCompanyCode: vi.fn(async () => undefined),
    setOwnerCompany: vi.fn(async () => undefined),
    resolveWorkspaceUserId: vi.fn(async (userId: number, role: string, ownerId: number | null) =>
      role === "owner" ? userId : ownerId ?? userId,
    ),
    /* ad account helpers */
    getAdAccountsEnriched: vi.fn(async (tid: number) =>
      store.accounts
        .filter((a) => a.userId === tid)
        .map((a) => ({
          ...a,
          ownerNickname: a.ownerUserId
            ? store.users.find((u) => u.id === a.ownerUserId)?.nickname ?? null
            : null,
          groupId: store.groupMembers.find((m) => m.accountId === a.id)?.groupId ?? null,
          groupName: null,
          effectiveStatus: a.bmId
            ? store.bms.find((b) => b.id === a.bmId)?.status ?? "active"
            : a.tokenStatus,
          statusSource: a.bmId ? "bm" : "single",
        })),
    ),
    getAdAccountById: vi.fn(async (id: number, tid: number) =>
      store.accounts.find((a) => a.id === id && a.userId === tid),
    ),
    getAdAccountsByUser: vi.fn(async (tid: number) => store.accounts.filter((a) => a.userId === tid)),
    findAdAccountByMetaId: vi.fn(async (tid: number, metaId: string) =>
      store.accounts.find((a) => a.userId === tid && a.adAccountId === metaId),
    ),
    createAdAccount: vi.fn(async (input: any) => {
      const id = store.nextAccountId++;
      store.accounts.push({
        id,
        userId: input.userId,
        adAccountId: input.adAccountId,
        accessToken: input.accessToken,
        nickname: input.nickname ?? null,
        ownerUserId: input.ownerUserId ?? null,
        paymentType: input.paymentType ?? null,
        limitAmount: input.limitAmount ?? null,
        tokenStatus: input.tokenStatus ?? "active",
        bmId: input.bmId ?? null,
      });
      return id;
    }),
    updateAdAccount: vi.fn(async (id: number, tid: number, patch: any) => {
      const a = store.accounts.find((x) => x.id === id && x.userId === tid);
      if (a) Object.assign(a, patch);
    }),
    setOwnerForBmAccounts: vi.fn(
      async (bmDbId: number, tid: number, ownerUserId: number | null) => {
        for (const a of store.accounts) {
          if (a.bmId === bmDbId && a.userId === tid) a.ownerUserId = ownerUserId;
        }
      },
    ),
    deleteAdAccount: vi.fn(async () => undefined),
    ensureAccountGroupMember: vi.fn(async (groupId: number, accountId: number) => {
      if (!store.groupMembers.some((m) => m.groupId === groupId && m.accountId === accountId))
        store.groupMembers.push({ groupId, accountId });
    }),
    reassignAccountGroup: vi.fn(async (tid: number, accountId: number, target: number | null) => {
      store.groupMembers = store.groupMembers.filter((m) => m.accountId !== accountId);
      if (target != null) store.groupMembers.push({ groupId: target, accountId });
    }),
    /* group helpers */
    getAccountGroupsByUser: vi.fn(async () => [{ id: 5, groupName: "กลุ่มสินค้า A" }]),
    getAllGroupMembersForUser: vi.fn(async () => store.groupMembers),
    /* BM helpers */
    listBusinessManagers: vi.fn(async (tid: number) => store.bms.filter((b) => b.userId === tid)),
    getBusinessManagerById: vi.fn(async (id: number, tid: number) =>
      store.bms.find((b) => b.id === id && b.userId === tid) ?? null,
    ),
    findBusinessManagerByBmId: vi.fn(async (tid: number, bmId: string) =>
      store.bms.find((b) => b.userId === tid && b.bmId === bmId) ?? null,
    ),
    insertBusinessManager: vi.fn(async (input: any) => {
      const id = store.nextBmId++;
      store.bms.push({
        id,
        userId: input.userId,
        bmId: input.bmId,
        name: input.name,
        accessTokenEncrypted: input.accessTokenEncrypted,
        accountGroupId: input.accountGroupId,
        defaultOwnerUserId: input.defaultOwnerUserId ?? null,
        status: input.status ?? "active",
      });
      return id;
    }),
    updateBusinessManager: vi.fn(async (id: number, patch: any, tid?: number) => {
      const b = store.bms.find((x) => x.id === id && (tid == null || x.userId === tid));
      if (b) Object.assign(b, patch);
    }),
    deleteBusinessManager: vi.fn(async () => undefined),
    findBmLink: vi.fn(async () => undefined),
    insertBmLink: vi.fn(async () => undefined),
    insertBmDiscoveryLog: vi.fn(async () => undefined),
    listBmLinks: vi.fn(async () => []),
    getBusinessManagerDetail: vi.fn(async () => undefined),
    /* misc safe defaults */
    getCommissionLock: vi.fn(async () => undefined),
    getGroupMembers: vi.fn(async () => []),
    getScaleSettings: vi.fn(async () => undefined),
    getShareLinkByToken: vi.fn(async () => undefined),
    listClipAssignments: vi.fn(async () => []),
    listClipGrades: vi.fn(async () => []),
    listCommissionGrades: vi.fn(async () => []),
    listCommissionLocks: vi.fn(async () => []),
    listCommissionStaff: vi.fn(async () => []),
    listScaleLogs: vi.fn(async () => []),
    listShareLinks: vi.fn(async () => []),
    listSyncLogs: vi.fn(async () => []),
    insertSyncLog: vi.fn(async () => undefined),
    setGroupMembers: vi.fn(async () => undefined),
    updateAccountGroup: vi.fn(async () => undefined),
    createAccountGroup: vi.fn(async () => undefined),
    deleteAccountGroup: vi.fn(async () => undefined),
    findAccountGroupMember: vi.fn(async () => undefined),
    createInviteToken: vi.fn(async () => undefined),
    listInviteTokensByOwner: vi.fn(async () => []),
    findInviteByToken: vi.fn(async () => undefined),
    markInviteUsed: vi.fn(async () => undefined),
    revokeInviteToken: vi.fn(async () => undefined),
    updateCommissionGrade: vi.fn(async () => undefined),
    updateCommissionStaff: vi.fn(async () => undefined),
    updateScaleLog: vi.fn(async () => undefined),
    updateShareLink: vi.fn(async () => undefined),
    upsertClipAssignment: vi.fn(async () => undefined),
    upsertClipGrade: vi.fn(async () => undefined),
    upsertCommissionLock: vi.fn(async () => undefined),
    upsertScaleSettings: vi.fn(async () => undefined),
    createCommissionGrade: vi.fn(async () => undefined),
    createCommissionStaff: vi.fn(async () => undefined),
    createScaleLog: vi.fn(async () => undefined),
    createShareLink: vi.fn(async () => undefined),
    deleteCommissionGrade: vi.fn(async () => undefined),
    deleteCommissionLock: vi.fn(async () => undefined),
    deleteCommissionStaff: vi.fn(async () => undefined),
    deleteScaleLog: vi.fn(async () => undefined),
    deleteShareLink: vi.fn(async () => undefined),
    getAccountGroupMap: vi.fn(async () => ({})),
    getLatestSyncedAt: vi.fn(async () => null),
    upsertAdManualMetric: vi.fn(async () => undefined),
  };
});

const { appRouter } = await import("./routers");

function makeCtx(role: "owner" | "staff" | "content" | "pending", id = 10): TrpcContext {
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

describe("users.selectableOwners", () => {
  it("คืนเฉพาะ user ที่ role != pending", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const owners = await caller.users.selectableOwners();
    const ids = owners.map((o) => o.id).sort();
    expect(ids).toEqual([10, 20, 21]);
    expect(owners.some((o) => o.id === 22)).toBe(false); // pending ถูกตัด
  });

  it("non-owner ถูกบล็อก", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    await expect(caller.users.selectableOwners()).rejects.toThrow();
  });
});

// Prompt D-fix: ownerOptions — protectedProcedure ทุก role ใช้ได้ คืนเฉพาะ id+nickname
describe("users.ownerOptions", () => {
  it("owner เรียกได้ คืนเฉพาะ user ที่ role != pending", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const owners = await caller.users.ownerOptions();
    const ids = owners.map((o) => o.id).sort();
    expect(ids).toEqual([10, 20, 21]);
    expect(owners.some((o) => o.id === 22)).toBe(false); // pending ถูกตัด
  });

  it("staff เรียกได้ (ไม่ reject) — แก้ bug เดิมที่ dropdown ว่าง", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    const owners = await caller.users.ownerOptions();
    const ids = owners.map((o) => o.id).sort();
    expect(ids).toEqual([10, 20, 21]);
  });

  it("content เรียกได้ (ไม่ reject)", async () => {
    const caller = appRouter.createCaller(makeCtx("content", 21));
    const owners = await caller.users.ownerOptions();
    expect(owners.length).toBe(3);
  });

  it("คืนเฉพาะ field id+nickname ไม่เปิด role/email (ไม่ sensitive)", async () => {
    const caller = appRouter.createCaller(makeCtx("staff", 20));
    const owners = await caller.users.ownerOptions();
    for (const o of owners) {
      expect(Object.keys(o).sort()).toEqual(["id", "nickname"]);
      expect((o as any).role).toBeUndefined();
      expect((o as any).email).toBeUndefined();
    }
  });

  it("nickname null -> fallback เป็น name", async () => {
    store.users.push({ id: 23, role: "staff", ownerId: 10, nickname: null, name: "NoNick" });
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const owners = await caller.users.ownerOptions();
    const u23 = owners.find((o) => o.id === 23);
    expect(u23?.nickname).toBe("NoNick");
  });
});

describe("accounts.list — token masking", () => {
  it("บัญชีเดี่ยวส่ง token เต็ม + preview, บัญชี BM ส่ง token ว่าง", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const list = await caller.accounts.list();
    const single = list.find((a) => a.id === 100)!;
    const fromBm = list.find((a) => a.id === 101)!;
    expect(single.accessToken).toBe("SINGLE_TOKEN_1234567890");
    expect(single.tokenPreview).toBe("SINGLE_T...");
    expect(fromBm.accessToken).toBe("");
    expect(fromBm.tokenPreview).toBe("");
  });

  it("ส่ง effectiveStatus + statusSource ถูกต้อง", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const list = await caller.accounts.list();
    expect(list.find((a) => a.id === 100)!.statusSource).toBe("single");
    expect(list.find((a) => a.id === 101)!.statusSource).toBe("bm");
  });
});

describe("accounts.create", () => {
  it("happy path — สร้างบัญชี + ผูกกลุ่ม + เซ็ตเจ้าของ/ชำระเงิน/limit", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const r = await caller.accounts.create({
      adAccountId: "act_999",
      accessToken: "NEW_TOKEN_1234567890ABC",
      groupId: 5,
      ownerUserId: 20,
      paymentType: "prepaid",
      limitAmount: 3000,
    });
    expect(r.id).toBeGreaterThan(0);
    const created = store.accounts.find((a) => a.id === r.id)!;
    expect(created.ownerUserId).toBe(20);
    expect(created.paymentType).toBe("prepaid");
    expect(created.limitAmount).toBe(3000);
    expect(store.groupMembers.some((m) => m.accountId === r.id && m.groupId === 5)).toBe(true);
  });

  it("reject — ownerUserId เป็น pending user", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    await expect(
      caller.accounts.create({
        adAccountId: "act_998",
        accessToken: "NEW_TOKEN_1234567890ABC",
        ownerUserId: 22, // pending
      }),
    ).rejects.toThrow(/เจ้าของ/);
  });
});

describe("accounts.update", () => {
  it("แก้เจ้าของ/ชำระเงิน/limit + ย้ายกลุ่ม", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    await caller.accounts.update({
      id: 100,
      ownerUserId: 21,
      paymentType: "prepaid",
      limitAmount: 8000,
      groupId: 5,
    });
    const a = store.accounts.find((x) => x.id === 100)!;
    expect(a.ownerUserId).toBe(21);
    expect(a.paymentType).toBe("prepaid");
    expect(a.limitAmount).toBe(8000);
    expect(store.groupMembers.some((m) => m.accountId === 100 && m.groupId === 5)).toBe(true);
  });

  it("reject — ownerUserId เป็น pending", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    await expect(caller.accounts.update({ id: 100, ownerUserId: 22 })).rejects.toThrow(/เจ้าของ/);
  });
});

describe("bm.create — propagate ownerUserId", () => {
  it("บันทึก defaultOwnerUserId + ใส่ ownerUserId ให้บัญชีย่อยใหม่ทุกตัว", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    await caller.bm.create({
      bmId: "777888",
      name: "BM ใหม่",
      accessToken: "BM_NEW_TOKEN_1234567890",
      accountGroupId: 5,
      ownerUserId: 20,
      selectedAccounts: [
        { bmAdAccountId: "act_555", name: "ย่อย1", ownership: "owned", accountStatus: 1 },
        { bmAdAccountId: "act_556", name: "ย่อย2", ownership: "owned", accountStatus: 1 },
      ],
    });
    const newBm = store.bms.find((b) => b.bmId === "777888")!;
    expect(newBm.defaultOwnerUserId).toBe(20);
    const subs = store.accounts.filter((a) => a.bmId === newBm.id);
    expect(subs).toHaveLength(2);
    expect(subs.every((s) => s.ownerUserId === 20)).toBe(true);
  });

  it("reject — ownerUserId เป็น pending", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    await expect(
      caller.bm.create({
        bmId: "777999",
        name: "BM",
        accessToken: "BM_NEW_TOKEN_1234567890",
        accountGroupId: 5,
        ownerUserId: 22,
        selectedAccounts: [
          { bmAdAccountId: "act_557", name: "ย่อย", ownership: "owned", accountStatus: 1 },
        ],
      }),
    ).rejects.toThrow(/เจ้าของ/);
  });
});

describe("bm.getToken", () => {
  it("decrypt คืน token เต็ม", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const r = await caller.bm.getToken({ id: 1 });
    expect(r.token).toBe("BM_TOKEN_REAL");
  });

  it("NOT_FOUND ถ้า BM ไม่อยู่ใน tenant", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    await expect(caller.bm.getToken({ id: 9999 })).rejects.toThrow();
  });
});

describe("bm.update", () => {
  it("เปลี่ยนชื่อ + re-encrypt token ใหม่ + เปลี่ยน defaultOwnerUserId", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    await caller.bm.update({
      id: 1,
      name: "BM แก้ชื่อ",
      accessToken: "BM_ROTATED_TOKEN_1234567890",
      defaultOwnerUserId: 20,
    });
    const b = store.bms.find((x) => x.id === 1)!;
    expect(b.name).toBe("BM แก้ชื่อ");
    expect(b.accessTokenEncrypted).toBe("ENC(BM_ROTATED_TOKEN_1234567890)");
    expect(b.defaultOwnerUserId).toBe(20);
  });

  it("reject — defaultOwnerUserId เป็น pending", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    await expect(caller.bm.update({ id: 1, defaultOwnerUserId: 22 })).rejects.toThrow(/เจ้าของ/);
  });

  it("ไม่ส่ง token = ไม่แตะ accessTokenEncrypted เดิม", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    await caller.bm.update({ id: 1, name: "เปลี่ยนแค่ชื่อ" });
    const b = store.bms.find((x) => x.id === 1)!;
    expect(b.accessTokenEncrypted).toBe("ENC(BM_TOKEN_REAL)");
  });

  // Prompt E (ตัวเลือก A): แก้ default owner → ทับ ownerUserId บัญชีย่อยทุกตัว
  it("Prompt E: เปลี่ยน defaultOwnerUserId → ทับ ownerUserId บัญชีย่อยที่ผูก BM", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    // ก่อนแก้: บัญชี 101 (bmId=1) มี ownerUserId=21
    expect(store.accounts.find((a) => a.id === 101)!.ownerUserId).toBe(21);
    await caller.bm.update({ id: 1, defaultOwnerUserId: 20 });
    // หลังแก้: บัญชีย่อยทุกตัวของ BM 1 ต้องเป็น 20
    const subs = store.accounts.filter((a) => a.bmId === 1);
    expect(subs.length).toBeGreaterThan(0);
    expect(subs.every((s) => s.ownerUserId === 20)).toBe(true);
  });

  it("Prompt E: ล้าง defaultOwnerUserId (null) → บัญชีย่อย ownerUserId = null", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    await caller.bm.update({ id: 1, defaultOwnerUserId: null });
    const subs = store.accounts.filter((a) => a.bmId === 1);
    expect(subs.every((s) => s.ownerUserId === null)).toBe(true);
  });

  it("Prompt E: ไม่ส่ง defaultOwnerUserId → ไม่แตะ ownerUserId บัญชีย่อย", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    await caller.bm.update({ id: 1, name: "แก้แค่ชื่อ" });
    expect(store.accounts.find((a) => a.id === 101)!.ownerUserId).toBe(21);
  });
});

describe("bm.create — Prompt E: บัญชีย่อยที่มีอยู่แล้วถูกทับเจ้าของ", () => {
  it("linkedExisting ทับ ownerUserId ตาม default ของ BM", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    // act_222 (id=101) มีอยู่แล้ว ownerUserId=21 → สร้าง BM ใหม่ที่ครอบบัญชีนี้
    await caller.bm.create({
      bmId: "999000",
      name: "BM ครอบบัญชีเดิม",
      accessToken: "BM_NEW_TOKEN_1234567890",
      accountGroupId: 5,
      ownerUserId: 20,
      selectedAccounts: [
        { bmAdAccountId: "act_222", name: "บัญชีจาก BM", ownership: "owned", accountStatus: 1 },
      ],
    });
    expect(store.accounts.find((a) => a.adAccountId === "act_222")!.ownerUserId).toBe(20);
  });
});
