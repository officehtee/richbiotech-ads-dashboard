import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

/**
 * Integration-style tests for the `invites` tRPC router.
 * เรา mock layer `./db` ทั้งโมดูลแล้วเรียก appRouter.createCaller(ctx) เหมือน auth.logout.test
 * ครอบคลุม: create / list / revoke / verify / redeem (รวม happy path + error paths)
 */

type StoredInvite = {
  id: number;
  token: string;
  ownerId: number;
  role: "ceo" | "content" | "staff";
  label: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  usedByUserId: number | null;
  revokedAt: Date | null;
  createdAt: Date;
};

type StoredUser = {
  id: number;
  role: string;
  ownerId: number | null;
};

// In-memory store
const store: {
  invites: StoredInvite[];
  users: StoredUser[];
  nextInviteId: number;
} = { invites: [], users: [], nextInviteId: 1 };

function reset() {
  store.invites = [];
  store.users = [
    { id: 10, role: "owner", ownerId: null },
    { id: 11, role: "pending", ownerId: null },
  ];
  store.nextInviteId = 1;
}

vi.mock("./db", async () => {
  return {
    upsertUser: vi.fn(async () => undefined),
    getUserById: vi.fn(async (id: number) => store.users.find((u) => u.id === id)),
    getUserByOpenId: vi.fn(async () => undefined),
    getOwnerUserId: vi.fn(async () => 10),
    listUsersInWorkspace: vi.fn(async () => store.users),
    setUserRole: vi.fn(async (userId: number, role: string, ownerId: number | null) => {
      const u = store.users.find((x) => x.id === userId);
      if (u) {
        u.role = role;
        u.ownerId = ownerId;
      }
    }),
    findUserByCompanyCode: vi.fn(async () => undefined),
    setOwnerCompany: vi.fn(async () => undefined),
    resolveWorkspaceUserId: vi.fn(
      async (userId: number, role: string, ownerId: number | null) => {
        if (role === "owner") return userId;
        return ownerId ?? userId;
      },
    ),
    /* invite helpers */
    createInviteToken: vi.fn(async (data: Omit<StoredInvite, "id" | "createdAt" | "usedAt" | "usedByUserId" | "revokedAt">) => {
      const row: StoredInvite = {
        id: store.nextInviteId++,
        token: data.token,
        ownerId: data.ownerId,
        role: data.role,
        label: data.label ?? null,
        expiresAt: data.expiresAt,
        usedAt: null,
        usedByUserId: null,
        revokedAt: null,
        createdAt: new Date(),
      };
      store.invites.push(row);
      return row;
    }),
    listInviteTokensByOwner: vi.fn(async (ownerId: number) =>
      store.invites.filter((i) => i.ownerId === ownerId),
    ),
    findInviteByToken: vi.fn(async (token: string) =>
      store.invites.find((i) => i.token === token),
    ),
    markInviteUsed: vi.fn(async (id: number, usedByUserId: number) => {
      const inv = store.invites.find((i) => i.id === id);
      if (inv) {
        inv.usedAt = new Date();
        inv.usedByUserId = usedByUserId;
      }
    }),
    revokeInviteToken: vi.fn(async (id: number, ownerId: number) => {
      const inv = store.invites.find((i) => i.id === id && i.ownerId === ownerId);
      if (inv) inv.revokedAt = new Date();
    }),
    /* misc helpers required by routers.ts imports — return safe defaults */
    getAccountGroupsByUser: vi.fn(async () => []),
    getAdAccountById: vi.fn(async () => undefined),
    getAdAccountsByUser: vi.fn(async () => []),
    getAllGroupMembersForUser: vi.fn(async () => []),
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
    setGroupMembers: vi.fn(async () => undefined),
    updateAccountGroup: vi.fn(async () => undefined),
    updateAdAccount: vi.fn(async () => undefined),
    updateCommissionGrade: vi.fn(async () => undefined),
    updateCommissionStaff: vi.fn(async () => undefined),
    updateScaleLog: vi.fn(async () => undefined),
    updateShareLink: vi.fn(async () => undefined),
    upsertClipAssignment: vi.fn(async () => undefined),
    upsertClipGrade: vi.fn(async () => undefined),
    upsertCommissionLock: vi.fn(async () => undefined),
    upsertScaleSettings: vi.fn(async () => undefined),
    createAccountGroup: vi.fn(async () => undefined),
    createAdAccount: vi.fn(async () => undefined),
    createCommissionGrade: vi.fn(async () => undefined),
    createCommissionStaff: vi.fn(async () => undefined),
    createScaleLog: vi.fn(async () => undefined),
    createShareLink: vi.fn(async () => undefined),
    deleteAccountGroup: vi.fn(async () => undefined),
    deleteAdAccount: vi.fn(async () => undefined),
    deleteCommissionGrade: vi.fn(async () => undefined),
    deleteCommissionLock: vi.fn(async () => undefined),
    deleteCommissionStaff: vi.fn(async () => undefined),
    deleteScaleLog: vi.fn(async () => undefined),
    deleteShareLink: vi.fn(async () => undefined),
  };
});

// Import after vi.mock
const { appRouter } = await import("./routers");

function makeCtx(role: "owner" | "pending" | "anon" | "joined", id = 10): TrpcContext {
  if (role === "anon") {
    return {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
  }
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

describe("invites router", () => {
  it("create + list (owner only) — สร้างลิงก์ token unique และ list คืน 1 row", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const r1 = await caller.invites.create({ role: "staff", label: "John" });
    const r2 = await caller.invites.create({ role: "ceo" });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.token).not.toBe(r2.token); // uniqueness
    const list = await caller.invites.list();
    expect(list).toHaveLength(2);
    expect(list[0]?.ownerId).toBe(10);
  });

  it("create — non-owner ถูกบล็อก (FORBIDDEN ผ่าน ownerProcedure)", async () => {
    const caller = appRouter.createCaller(makeCtx("joined", 11));
    await expect(caller.invites.create({ role: "staff" })).rejects.toThrow();
  });

  it("revoke — set revokedAt และ verify ตอบ revoked", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const created = await caller.invites.create({ role: "staff" });
    expect(created.invite?.id).toBeDefined();
    await caller.invites.revoke({ inviteId: created.invite!.id });
    const v = await caller.invites.verify({ token: created.token });
    expect(v.ok).toBe(false);
    expect((v as { reason: string }).reason).toBe("revoked");
  });

  it("verify — token ปกติคืน ok=true พร้อม role+label", async () => {
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const created = await caller.invites.create({ role: "ceo", label: "Boss" });
    const anon = appRouter.createCaller(makeCtx("anon"));
    const v = await anon.invites.verify({ token: created.token });
    expect(v.ok).toBe(true);
    expect((v as { role: string }).role).toBe("ceo");
    expect((v as { label: string | null }).label).toBe("Boss");
  });

  it("verify — token ไม่พบคืน reason=not_found", async () => {
    const anon = appRouter.createCaller(makeCtx("anon"));
    const v = await anon.invites.verify({ token: "nonexistent" });
    expect(v.ok).toBe(false);
    expect((v as { reason: string }).reason).toBe("not_found");
  });

  it("verify — token หมดอายุคืน reason=expired", async () => {
    // สร้างแล้วบีบ expiresAt ให้อยู่ในอดีต
    const caller = appRouter.createCaller(makeCtx("owner", 10));
    const created = await caller.invites.create({ role: "staff" });
    const inv = store.invites.find((i) => i.token === created.token)!;
    inv.expiresAt = new Date(Date.now() - 1000);
    const anon = appRouter.createCaller(makeCtx("anon"));
    const v = await anon.invites.verify({ token: created.token });
    expect(v.ok).toBe(false);
    expect((v as { reason: string }).reason).toBe("expired");
  });

  it("redeem — happy path: pending user → role+ownerId ตาม invite, mark used", async () => {
    const owner = appRouter.createCaller(makeCtx("owner", 10));
    const created = await owner.invites.create({ role: "content", label: "Ann" });

    // pending user (id=11) มา redeem
    const joinee = appRouter.createCaller(makeCtx("pending", 11));
    const r = await joinee.invites.redeem({ token: created.token });
    expect(r.ok).toBe(true);
    expect(r.role).toBe("content");
    expect(r.ownerId).toBe(10);

    // user 11 ถูกอัปเดต role
    const u = store.users.find((x) => x.id === 11);
    expect(u?.role).toBe("content");
    expect(u?.ownerId).toBe(10);

    // invite ถูก mark used
    const inv = store.invites.find((i) => i.token === created.token)!;
    expect(inv.usedAt).toBeInstanceOf(Date);
    expect(inv.usedByUserId).toBe(11);
  });

  it("redeem — token ใช้ครั้งเดียวจบ (ครั้งที่สอง throw 'ใช้ไปแล้ว')", async () => {
    const owner = appRouter.createCaller(makeCtx("owner", 10));
    const created = await owner.invites.create({ role: "staff" });
    const joinee = appRouter.createCaller(makeCtx("pending", 11));
    await joinee.invites.redeem({ token: created.token });

    // อีกคนมาใช้ token เดียวกัน
    store.users.push({ id: 12, role: "pending", ownerId: null });
    const second = appRouter.createCaller(makeCtx("pending", 12));
    await expect(second.invites.redeem({ token: created.token })).rejects.toThrow(/ใช้/);
  });

  it("redeem — token ที่ถูก revoke แล้วใช้ไม่ได้", async () => {
    const owner = appRouter.createCaller(makeCtx("owner", 10));
    const created = await owner.invites.create({ role: "staff" });
    await owner.invites.revoke({ inviteId: created.invite!.id });
    const joinee = appRouter.createCaller(makeCtx("pending", 11));
    await expect(joinee.invites.redeem({ token: created.token })).rejects.toThrow(/ยกเลิก/);
  });

  it("redeem — token หมดอายุใช้ไม่ได้", async () => {
    const owner = appRouter.createCaller(makeCtx("owner", 10));
    const created = await owner.invites.create({ role: "staff" });
    const inv = store.invites.find((i) => i.token === created.token)!;
    inv.expiresAt = new Date(Date.now() - 1000);
    const joinee = appRouter.createCaller(makeCtx("pending", 11));
    await expect(joinee.invites.redeem({ token: created.token })).rejects.toThrow(/หมดอายุ/);
  });

  it("redeem — token ไม่พบใน DB → NOT_FOUND", async () => {
    const joinee = appRouter.createCaller(makeCtx("pending", 11));
    await expect(joinee.invites.redeem({ token: "ghost" })).rejects.toThrow(/ถูกต้อง|ไม่/);
  });

  it("expiry default ของ create ห่าง 7 วัน (±1 ชม.)", async () => {
    const owner = appRouter.createCaller(makeCtx("owner", 10));
    const created = await owner.invites.create({ role: "staff" });
    const inv = store.invites.find((i) => i.token === created.token)!;
    const diff = inv.expiresAt.getTime() - Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(diff - sevenDays)).toBeLessThan(60 * 60 * 1000);
  });
});
