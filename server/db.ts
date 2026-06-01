import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  AccountGroup,
  AccountGroupMember,
  AdAccount,
  CommissionGrade,
  CommissionLock,
  CommissionStaff,
  InsertAccountGroup,
  InsertAccountGroupMember,
  InsertAdAccount,
  InsertCommissionGrade,
  InsertCommissionLock,
  InsertCommissionStaff,
  InsertScaleLog,
  InsertScaleSettings,
  InsertShareLink,
  InsertUser,
  InviteToken,
  InsertInviteToken,
  ScaleLog,
  ScaleSettings,
  ShareLink,
  User,
  BusinessManager,
  InsertBusinessManager,
  BmAdAccountLink,
  InsertBmAdAccountLink,
  BmDiscoveryLog,
  InsertBmDiscoveryLog,
  accountGroupMembers,
  accountGroups,
  adAccounts,
  bmAdAccountLinks,
  bmDiscoveryLogs,
  businessManagers,
  commissionClipAssignments,
  commissionClipGrades,
  commissionGrades,
  commissionLocks,
  commissionStaff,
  inviteTokens,
  scaleLogs,
  scaleSettings,
  shareLinks,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/* ---------- User ---------- */

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "owner";
      updateSet.role = "owner";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getOwnerUserId(): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  if (ENV.ownerOpenId) {
    const r = await db.select().from(users).where(eq(users.openId, ENV.ownerOpenId)).limit(1);
    if (r.length > 0) return r[0].id;
  }
  const r = await db.select().from(users).where(eq(users.role, "owner")).limit(1);
  return r.length > 0 ? r[0].id : null;
}

/**
 * Tenant isolation helper.
 * - owner: returns own id
 * - admin: returns own id (operates as themselves)
 * - ceo/content/staff: returns ownerId (or fallback to global owner)
 */
export async function resolveWorkspaceUserId(
  userId: number,
  role: string,
  ownerId: number | null | undefined,
): Promise<number> {
  if (role === "owner" || role === "admin") return userId;
  if (ownerId) return ownerId;
  const fallback = await getOwnerUserId();
  return fallback ?? userId;
}

export async function listUsersInWorkspace(tenantId: number): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  // owner of workspace + members where ownerId == tenantId
  const owner = await db.select().from(users).where(eq(users.id, tenantId)).limit(1);
  const members = await db.select().from(users).where(eq(users.ownerId, tenantId));
  return [...owner, ...members];
}

export async function setUserRole(
  userId: number,
  role: User["role"],
  ownerId: number | null,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role, ownerId }).where(eq(users.id, userId));
}

export async function findUserByCompanyCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db
    .select()
    .from(users)
    .where(and(eq(users.companyCode, code), eq(users.role, "owner")))
    .limit(1);
  return r[0];
}

export async function setOwnerCompany(
  userId: number,
  data: { companyName?: string; companyCode?: string },
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

/* ---------- Invite Tokens (Magic Invite Link) ---------- */

export async function createInviteToken(
  data: InsertInviteToken,
): Promise<InviteToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(inviteTokens).values(data);
  const r = await db
    .select()
    .from(inviteTokens)
    .where(eq(inviteTokens.token, data.token))
    .limit(1);
  return r[0];
}

export async function listInviteTokensByOwner(ownerId: number): Promise<InviteToken[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(inviteTokens)
    .where(eq(inviteTokens.ownerId, ownerId));
}

export async function findInviteByToken(token: string): Promise<InviteToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db
    .select()
    .from(inviteTokens)
    .where(eq(inviteTokens.token, token))
    .limit(1);
  return r[0];
}

export async function markInviteUsed(
  inviteId: number,
  usedByUserId: number,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(inviteTokens)
    .set({ usedAt: new Date(), usedByUserId })
    .where(eq(inviteTokens.id, inviteId));
}

export async function revokeInviteToken(
  inviteId: number,
  ownerId: number,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(inviteTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(inviteTokens.id, inviteId), eq(inviteTokens.ownerId, ownerId)));
}

/* ---------- Ad Accounts ---------- */

export async function getAdAccountsByUser(tenantId: number): Promise<AdAccount[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(adAccounts)
    .where(eq(adAccounts.userId, tenantId))
    .orderBy(asc(adAccounts.sortOrder), asc(adAccounts.id));
}

export async function getAdAccountById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db
    .select()
    .from(adAccounts)
    .where(and(eq(adAccounts.id, id), eq(adAccounts.userId, tenantId)))
    .limit(1);
  return r[0];
}

export async function createAdAccount(input: InsertAdAccount): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const r = await db.insert(adAccounts).values(input);
  return Number(r[0].insertId);
}

export async function updateAdAccount(
  id: number,
  tenantId: number,
  patch: Partial<InsertAdAccount>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(adAccounts)
    .set(patch)
    .where(and(eq(adAccounts.id, id), eq(adAccounts.userId, tenantId)));
}

export async function deleteAdAccount(id: number, tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(adAccounts)
    .where(and(eq(adAccounts.id, id), eq(adAccounts.userId, tenantId)));
}

/* ---------- Account Groups ---------- */

export async function getAccountGroupsByUser(tenantId: number): Promise<AccountGroup[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(accountGroups)
    .where(eq(accountGroups.userId, tenantId))
    .orderBy(asc(accountGroups.sortOrder), asc(accountGroups.id));
}

export async function createAccountGroup(input: InsertAccountGroup): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const r = await db.insert(accountGroups).values(input);
  return Number(r[0].insertId);
}

export async function updateAccountGroup(
  id: number,
  tenantId: number,
  patch: Partial<InsertAccountGroup>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(accountGroups)
    .set(patch)
    .where(and(eq(accountGroups.id, id), eq(accountGroups.userId, tenantId)));
}

export async function deleteAccountGroup(id: number, tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(accountGroupMembers).where(eq(accountGroupMembers.groupId, id));
  await db
    .delete(accountGroups)
    .where(and(eq(accountGroups.id, id), eq(accountGroups.userId, tenantId)));
}

export async function getGroupMembers(groupId: number): Promise<AccountGroupMember[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accountGroupMembers).where(eq(accountGroupMembers.groupId, groupId));
}

export async function setGroupMembers(
  groupId: number,
  members: { accountId: number; phaseName?: string | null }[],
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(accountGroupMembers).where(eq(accountGroupMembers.groupId, groupId));
  if (members.length === 0) return;
  await db.insert(accountGroupMembers).values(
    members.map((m): InsertAccountGroupMember => ({
      groupId,
      accountId: m.accountId,
      phaseName: m.phaseName ?? null,
    })),
  );
}

export async function getAllGroupMembersForUser(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  const groups = await getAccountGroupsByUser(tenantId);
  if (groups.length === 0) return [];
  const groupIds = groups.map((g) => g.id);
  return db
    .select()
    .from(accountGroupMembers)
    .where(inArray(accountGroupMembers.groupId, groupIds));
}

/* ---------- Scale Logs / Settings ---------- */

export async function getScaleSettings(tenantId: number): Promise<ScaleSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(scaleSettings).where(eq(scaleSettings.userId, tenantId)).limit(1);
  return r[0];
}

export async function upsertScaleSettings(input: InsertScaleSettings): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(scaleSettings)
    .values(input)
    .onDuplicateKeyUpdate({
      set: {
        increaseSmallPercent: input.increaseSmallPercent,
        increaseLargePercent: input.increaseLargePercent,
        decreaseSmallPercent: input.decreaseSmallPercent,
        decreaseLargePercent: input.decreaseLargePercent,
      },
    });
}

export async function listScaleLogs(tenantId: number): Promise<ScaleLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scaleLogs)
    .where(eq(scaleLogs.userId, tenantId))
    .orderBy(desc(scaleLogs.scaledAt));
}

export async function createScaleLog(input: InsertScaleLog): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const r = await db.insert(scaleLogs).values(input);
  return Number(r[0].insertId);
}

export async function updateScaleLog(
  id: number,
  tenantId: number,
  patch: Partial<InsertScaleLog>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(scaleLogs)
    .set(patch)
    .where(and(eq(scaleLogs.id, id), eq(scaleLogs.userId, tenantId)));
}

export async function deleteScaleLog(id: number, tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(scaleLogs)
    .where(and(eq(scaleLogs.id, id), eq(scaleLogs.userId, tenantId)));
}

/* ---------- Share Links ---------- */

export async function listShareLinks(tenantId: number): Promise<ShareLink[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.userId, tenantId))
    .orderBy(desc(shareLinks.createdAt));
}

export async function createShareLink(input: InsertShareLink): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const r = await db.insert(shareLinks).values(input);
  return Number(r[0].insertId);
}

export async function updateShareLink(
  id: number,
  tenantId: number,
  patch: Partial<InsertShareLink>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(shareLinks)
    .set(patch)
    .where(and(eq(shareLinks.id, id), eq(shareLinks.userId, tenantId)));
}

export async function deleteShareLink(id: number, tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(shareLinks)
    .where(and(eq(shareLinks.id, id), eq(shareLinks.userId, tenantId)));
}

export async function getShareLinkByToken(token: string): Promise<ShareLink | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(shareLinks).where(eq(shareLinks.token, token)).limit(1);
  return r[0];
}

/* ---------- Commission ---------- */

export async function listCommissionGrades(tenantId: number): Promise<CommissionGrade[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(commissionGrades)
    .where(eq(commissionGrades.userId, tenantId))
    .orderBy(asc(commissionGrades.sortOrder), asc(commissionGrades.id));
}

export async function createCommissionGrade(input: InsertCommissionGrade): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const r = await db.insert(commissionGrades).values(input);
  return Number(r[0].insertId);
}

export async function updateCommissionGrade(
  id: number,
  tenantId: number,
  patch: Partial<InsertCommissionGrade>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(commissionGrades)
    .set(patch)
    .where(and(eq(commissionGrades.id, id), eq(commissionGrades.userId, tenantId)));
}

export async function deleteCommissionGrade(id: number, tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(commissionGrades)
    .where(and(eq(commissionGrades.id, id), eq(commissionGrades.userId, tenantId)));
}

export async function listCommissionStaff(tenantId: number): Promise<CommissionStaff[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(commissionStaff)
    .where(eq(commissionStaff.userId, tenantId))
    .orderBy(asc(commissionStaff.id));
}

export async function createCommissionStaff(input: InsertCommissionStaff): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const r = await db.insert(commissionStaff).values(input);
  return Number(r[0].insertId);
}

export async function updateCommissionStaff(
  id: number,
  tenantId: number,
  patch: Partial<InsertCommissionStaff>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(commissionStaff)
    .set(patch)
    .where(and(eq(commissionStaff.id, id), eq(commissionStaff.userId, tenantId)));
}

export async function deleteCommissionStaff(id: number, tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(commissionStaff)
    .where(and(eq(commissionStaff.id, id), eq(commissionStaff.userId, tenantId)));
}

export async function listClipAssignments(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(commissionClipAssignments)
    .where(eq(commissionClipAssignments.userId, tenantId));
}

export async function upsertClipAssignment(input: {
  userId: number;
  clipNumber: string;
  groupId?: number | null;
  staffId?: number | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // delete existing matching clipNumber+userId then insert
  await db
    .delete(commissionClipAssignments)
    .where(
      and(
        eq(commissionClipAssignments.userId, input.userId),
        eq(commissionClipAssignments.clipNumber, input.clipNumber),
      ),
    );
  await db.insert(commissionClipAssignments).values({
    userId: input.userId,
    clipNumber: input.clipNumber,
    groupId: input.groupId ?? null,
    staffId: input.staffId ?? null,
  });
}

export async function listClipGrades(tenantId: number, periodKey: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(commissionClipGrades)
    .where(
      and(
        eq(commissionClipGrades.userId, tenantId),
        eq(commissionClipGrades.periodKey, periodKey),
      ),
    );
}

export async function upsertClipGrade(input: {
  userId: number;
  clipNumber: string;
  groupId?: number | null;
  gradeId?: number | null;
  periodKey: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(commissionClipGrades)
    .where(
      and(
        eq(commissionClipGrades.userId, input.userId),
        eq(commissionClipGrades.clipNumber, input.clipNumber),
        eq(commissionClipGrades.periodKey, input.periodKey),
      ),
    );
  await db.insert(commissionClipGrades).values({
    userId: input.userId,
    clipNumber: input.clipNumber,
    groupId: input.groupId ?? null,
    gradeId: input.gradeId ?? null,
    periodKey: input.periodKey,
  });
}

export async function listCommissionLocks(tenantId: number): Promise<CommissionLock[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(commissionLocks)
    .where(eq(commissionLocks.userId, tenantId))
    .orderBy(desc(commissionLocks.lockedAt));
}

export async function getCommissionLock(
  tenantId: number,
  periodKey: string,
): Promise<CommissionLock | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db
    .select()
    .from(commissionLocks)
    .where(
      and(eq(commissionLocks.userId, tenantId), eq(commissionLocks.periodKey, periodKey)),
    )
    .limit(1);
  return r[0];
}

export async function upsertCommissionLock(input: InsertCommissionLock): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(commissionLocks)
    .where(
      and(
        eq(commissionLocks.userId, input.userId),
        eq(commissionLocks.periodKey, input.periodKey),
      ),
    );
  await db.insert(commissionLocks).values(input);
}

export async function deleteCommissionLock(
  tenantId: number,
  periodKey: string,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(commissionLocks)
    .where(
      and(eq(commissionLocks.userId, tenantId), eq(commissionLocks.periodKey, periodKey)),
    );
}


/* ---------- Alert System ---------- */

import {
  alertChannels,
  alertEvents,
  alertRules,
  type AlertChannel,
  type AlertEvent,
  type AlertRule,
  type InsertAlertChannel,
  type InsertAlertEvent,
  type InsertAlertRule,
} from "../drizzle/schema";

// --- Rules ---
export async function listAlertRules(tenantId: number): Promise<AlertRule[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alertRules).where(eq(alertRules.userId, tenantId)).orderBy(desc(alertRules.createdAt));
}
export async function createAlertRule(input: InsertAlertRule): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const r = await db.insert(alertRules).values(input);
  return Number(r[0].insertId);
}
export async function updateAlertRule(id: number, tenantId: number, patch: Partial<InsertAlertRule>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(alertRules).set(patch).where(and(eq(alertRules.id, id), eq(alertRules.userId, tenantId)));
}
export async function deleteAlertRule(id: number, tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(alertRules).where(and(eq(alertRules.id, id), eq(alertRules.userId, tenantId)));
}

// --- Channels ---
export async function listAlertChannels(tenantId: number): Promise<AlertChannel[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alertChannels).where(eq(alertChannels.userId, tenantId)).orderBy(desc(alertChannels.createdAt));
}
export async function createAlertChannel(input: InsertAlertChannel): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const r = await db.insert(alertChannels).values(input);
  return Number(r[0].insertId);
}
export async function updateAlertChannel(
  id: number,
  tenantId: number,
  patch: Partial<InsertAlertChannel>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(alertChannels).set(patch).where(and(eq(alertChannels.id, id), eq(alertChannels.userId, tenantId)));
}
export async function deleteAlertChannel(id: number, tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(alertChannels).where(and(eq(alertChannels.id, id), eq(alertChannels.userId, tenantId)));
}

// --- Events ---
export async function listAlertEvents(
  tenantId: number,
  opts: { limit?: number; onlyUnread?: boolean } = {},
): Promise<AlertEvent[]> {
  const db = await getDb();
  if (!db) return [];
  const limit = opts.limit ?? 100;
  let q = db.select().from(alertEvents).where(eq(alertEvents.userId, tenantId)).$dynamic();
  if (opts.onlyUnread) {
    q = q.where(and(eq(alertEvents.userId, tenantId), eq(alertEvents.isRead, false)));
  }
  return q.orderBy(desc(alertEvents.createdAt)).limit(limit);
}
export async function createAlertEvent(input: InsertAlertEvent): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const r = await db.insert(alertEvents).values(input);
  return Number(r[0].insertId);
}
export async function markAlertEventRead(id: number, tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(alertEvents).set({ isRead: true }).where(and(eq(alertEvents.id, id), eq(alertEvents.userId, tenantId)));
}
export async function markAllAlertEventsRead(tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(alertEvents).set({ isRead: true }).where(eq(alertEvents.userId, tenantId));
}
export async function countUnreadAlertEvents(tenantId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select()
    .from(alertEvents)
    .where(and(eq(alertEvents.userId, tenantId), eq(alertEvents.isRead, false)));
  return rows.length;
}
export async function findRecentEventByDedupe(
  tenantId: number,
  dedupeKey: string,
  withinMs: number,
): Promise<AlertEvent | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(alertEvents)
    .where(and(eq(alertEvents.userId, tenantId), eq(alertEvents.dedupeKey, dedupeKey)))
    .orderBy(desc(alertEvents.createdAt))
    .limit(1);
  if (!rows.length) return undefined;
  const created = rows[0].createdAt instanceof Date ? rows[0].createdAt.getTime() : Date.now();
  if (Date.now() - created > withinMs) return undefined;
  return rows[0];
}

/** List all workspace tenant IDs (owners only) — used by the heartbeat job. */
export async function listAllWorkspaceTenantIds(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(users).where(eq(users.role, "owner"));
  return rows.map((u) => u.id);
}


/* ---------- Business Manager (Round 7.23) ---------- */

/** รวบรวม BM ที่ active ของทุก tenant — ใช้ใน scheduled auto-sync */
export async function listAllActiveBusinessManagers(): Promise<BusinessManager[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(businessManagers)
    .where(eq(businessManagers.status, "active"))
    .orderBy(desc(businessManagers.createdAt));
}

export async function listBusinessManagers(userId: number): Promise<BusinessManager[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(businessManagers)
    .where(eq(businessManagers.userId, userId))
    .orderBy(desc(businessManagers.createdAt));
}

export async function getBusinessManagerById(
  id: number,
  userId: number,
): Promise<BusinessManager | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(businessManagers)
    .where(and(eq(businessManagers.id, id), eq(businessManagers.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findBusinessManagerByBmId(
  userId: number,
  bmIdMeta: string,
): Promise<BusinessManager | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(businessManagers)
    .where(and(eq(businessManagers.userId, userId), eq(businessManagers.bmId, bmIdMeta)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertBusinessManager(input: InsertBusinessManager): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result: any = await db.insert(businessManagers).values(input);
  return Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
}

export async function updateBusinessManager(
  id: number,
  patch: Partial<InsertBusinessManager>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(businessManagers).set(patch).where(eq(businessManagers.id, id));
}

export async function deleteBusinessManager(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(businessManagers)
    .where(and(eq(businessManagers.id, id), eq(businessManagers.userId, userId)));
  // ลบ link ที่เกี่ยวข้องด้วย
  await db.delete(bmAdAccountLinks).where(eq(bmAdAccountLinks.bmId, id));
}

/* ---------- BM ↔ AdAccount Links ---------- */

export async function listBmLinks(bmId: number): Promise<BmAdAccountLink[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bmAdAccountLinks).where(eq(bmAdAccountLinks.bmId, bmId));
}

export async function findBmLink(
  bmId: number,
  adAccountDbId: number,
): Promise<BmAdAccountLink | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(bmAdAccountLinks)
    .where(
      and(eq(bmAdAccountLinks.bmId, bmId), eq(bmAdAccountLinks.adAccountId, adAccountDbId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function insertBmLink(input: InsertBmAdAccountLink): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(bmAdAccountLinks).values(input);
}

export async function updateBmLinkLastSeen(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(bmAdAccountLinks)
    .set({ lastSeenAt: new Date(), status: "active" })
    .where(eq(bmAdAccountLinks.id, id));
}

export async function markBmLinkRemoved(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(bmAdAccountLinks)
    .set({ status: "removed" })
    .where(eq(bmAdAccountLinks.id, id));
}

/* ---------- AdAccount: lookup by Meta act id (for BM linking) ---------- */

export async function findAdAccountByMetaId(
  userId: number,
  metaActId: string,
): Promise<AdAccount | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(adAccounts)
    .where(and(eq(adAccounts.userId, userId), eq(adAccounts.adAccountId, metaActId)))
    .limit(1);
  return rows[0] ?? null;
}

/* ---------- BM Discovery Logs ---------- */

export async function insertBmDiscoveryLog(input: InsertBmDiscoveryLog): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(bmDiscoveryLogs).values(input);
}

export async function listBmDiscoveryLogs(
  bmId: number,
  limit = 20,
): Promise<BmDiscoveryLog[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(bmDiscoveryLogs)
    .where(eq(bmDiscoveryLogs.bmId, bmId))
    .orderBy(desc(bmDiscoveryLogs.runAt))
    .limit(limit);
}

/* ---------- Account Group Membership helpers ---------- */

export async function findAccountGroupMember(
  groupId: number,
  accountDbId: number,
): Promise<AccountGroupMember | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(accountGroupMembers)
    .where(
      and(
        eq(accountGroupMembers.groupId, groupId),
        eq(accountGroupMembers.accountId, accountDbId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function ensureAccountGroupMember(
  groupId: number,
  accountDbId: number,
): Promise<void> {
  const existing = await findAccountGroupMember(groupId, accountDbId);
  if (existing) return;
  const db = await getDb();
  if (!db) return;
  await db.insert(accountGroupMembers).values({ groupId, accountId: accountDbId });
}


/* ============================================================
 * Round 7.24 — Deep Ads Analysis (ad-day grain) DB helpers
 * ============================================================ */
import {
  adInsightsDaily,
  adManualMetrics,
  type AdInsightDaily,
  type InsertAdInsightDaily,
  type AdManualMetric,
  type InsertAdManualMetric,
} from "../drizzle/schema";
import { gte, lte, lt, sql, or, like } from "drizzle-orm";

/**
 * Upsert one row into adInsightsDaily (UNIQUE on adId+date).
 * On conflict, overwrites all sync-managed fields (NOT manual metrics).
 */
export async function upsertAdInsightsDaily(row: InsertAdInsightDaily): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = {
    adName: row.adName,
    adsetId: row.adsetId,
    adsetName: row.adsetName,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    groupId: row.groupId ?? null,
    pageName: row.pageName ?? null,
    spend: row.spend,
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: row.ctr,
    messages: row.messages,
    dailyBudget: row.dailyBudget ?? null,
    budgetSource: row.budgetSource ?? "none",
    syncedAt: new Date(),
  };
  // Don't clobber preview cache fields unless they're supplied in the input
  if (row.previewCachedUrl !== undefined) updateSet.previewCachedUrl = row.previewCachedUrl;
  if (row.previewCachedAt !== undefined) updateSet.previewCachedAt = row.previewCachedAt;
  await db.insert(adInsightsDaily).values(row).onDuplicateKeyUpdate({ set: updateSet });
}

/**
 * Update preview cache fields only (after async download finishes).
 */
export async function updateAdPreviewCache(
  userId: number,
  adId: string,
  date: string,
  url: string,
  cachedAt: Date,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(adInsightsDaily)
    .set({ previewCachedUrl: url, previewCachedAt: cachedAt })
    .where(
      and(
        eq(adInsightsDaily.userId, userId),
        eq(adInsightsDaily.adId, adId),
        eq(adInsightsDaily.date, date),
      ),
    );
  // Propagate to all rows of this adId for the same tenant (preview is per-ad, not per-day)
  await db
    .update(adInsightsDaily)
    .set({ previewCachedUrl: url, previewCachedAt: cachedAt })
    .where(and(eq(adInsightsDaily.userId, userId), eq(adInsightsDaily.adId, adId)));
}

/**
 * Find existing row by adId+date (for previewCachedAt check).
 */
export async function findAdInsightDaily(
  userId: number,
  adId: string,
  date: string,
): Promise<AdInsightDaily | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(adInsightsDaily)
    .where(
      and(
        eq(adInsightsDaily.userId, userId),
        eq(adInsightsDaily.adId, adId),
        eq(adInsightsDaily.date, date),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Get most-recent previewCachedAt for an adId (across all dates).
 * Used by sync to decide whether to re-download.
 */
export async function getLatestPreviewCachedAt(
  userId: number,
  adId: string,
): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      url: adInsightsDaily.previewCachedUrl,
      at: adInsightsDaily.previewCachedAt,
    })
    .from(adInsightsDaily)
    .where(and(eq(adInsightsDaily.userId, userId), eq(adInsightsDaily.adId, adId)))
    .orderBy(desc(adInsightsDaily.previewCachedAt))
    .limit(1);
  return rows[0]?.at ?? null;
}

/**
 * Upsert manual metric (Orders/Sales/ScaleNew/Note).
 * Only the supplied fields are updated; others stay untouched.
 */
export async function upsertAdManualMetric(row: InsertAdManualMetric): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = { updatedAt: new Date() };
  if (row.orders !== undefined) updateSet.orders = row.orders;
  if (row.salesCount !== undefined) updateSet.salesCount = row.salesCount;
  if (row.salesAmount !== undefined) updateSet.salesAmount = row.salesAmount;
  if (row.scaleNextAmount !== undefined) updateSet.scaleNextAmount = row.scaleNextAmount;
  if (row.note !== undefined) updateSet.note = row.note;
  if (row.updatedBy !== undefined) updateSet.updatedBy = row.updatedBy;
  await db.insert(adManualMetrics).values(row).onDuplicateKeyUpdate({ set: updateSet });
}

/**
 * Get scaleNextAmount from the previous day for a given adId (ยอดเก่า rolling).
 */
export async function getPrevDayScaleAmount(
  userId: number,
  adId: string,
  date: string,
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  // Compute previous date string
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  const prev = d.toISOString().slice(0, 10);
  const rows = await db
    .select({ amt: adManualMetrics.scaleNextAmount })
    .from(adManualMetrics)
    .where(
      and(
        eq(adManualMetrics.userId, userId),
        eq(adManualMetrics.adId, adId),
        eq(adManualMetrics.date, prev),
      ),
    )
    .limit(1);
  return rows[0]?.amt ?? null;
}

export type DeepAdsFilters = {
  search?: string;
  accountId?: number;
  groupId?: number;
};

/**
 * Get deep ads rows joined with adAccounts + accountGroups + manual metrics.
 * Returns flattened objects ready for the table UI.
 */
export async function getDeepAdsRows(
  userId: number,
  dateFrom: string,
  dateTo: string,
  filters: DeepAdsFilters = {},
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    eq(adInsightsDaily.userId, userId),
    gte(adInsightsDaily.date, dateFrom),
    lte(adInsightsDaily.date, dateTo),
  ];
  if (filters.accountId !== undefined) {
    conditions.push(eq(adInsightsDaily.accountId, filters.accountId));
  }
  if (filters.groupId !== undefined) {
    conditions.push(eq(adInsightsDaily.groupId, filters.groupId));
  }
  if (filters.search && filters.search.trim().length > 0) {
    const q = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        like(adInsightsDaily.adName, q),
        like(adInsightsDaily.adsetName, q),
        like(adInsightsDaily.campaignName, q),
        like(adInsightsDaily.pageName, q),
      )!,
    );
  }
  const rows = await db
    .select({
      // insights
      id: adInsightsDaily.id,
      adId: adInsightsDaily.adId,
      adName: adInsightsDaily.adName,
      adsetId: adInsightsDaily.adsetId,
      adsetName: adInsightsDaily.adsetName,
      campaignId: adInsightsDaily.campaignId,
      campaignName: adInsightsDaily.campaignName,
      date: adInsightsDaily.date,
      spend: adInsightsDaily.spend,
      impressions: adInsightsDaily.impressions,
      clicks: adInsightsDaily.clicks,
      ctr: adInsightsDaily.ctr,
      messages: adInsightsDaily.messages,
      dailyBudget: adInsightsDaily.dailyBudget,
      budgetSource: adInsightsDaily.budgetSource,
      previewCachedUrl: adInsightsDaily.previewCachedUrl,
      pageName: adInsightsDaily.pageName,
      syncedAt: adInsightsDaily.syncedAt,
      // account
      accountId: adInsightsDaily.accountId,
      accountNickname: adAccounts.nickname,
      accountMetaId: adAccounts.adAccountId,
      // group
      groupId: adInsightsDaily.groupId,
      groupName: accountGroups.groupName,
      groupColor: accountGroups.color,
      // manual
      manualOrders: adManualMetrics.orders,
      manualSalesCount: adManualMetrics.salesCount,
      manualSalesAmount: adManualMetrics.salesAmount,
      manualScaleNextAmount: adManualMetrics.scaleNextAmount,
      manualNote: adManualMetrics.note,
    })
    .from(adInsightsDaily)
    .leftJoin(adAccounts, eq(adAccounts.id, adInsightsDaily.accountId))
    .leftJoin(accountGroups, eq(accountGroups.id, adInsightsDaily.groupId))
    .leftJoin(
      adManualMetrics,
      and(
        eq(adManualMetrics.adId, adInsightsDaily.adId),
        eq(adManualMetrics.date, adInsightsDaily.date),
        eq(adManualMetrics.userId, userId),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(adInsightsDaily.date), desc(adInsightsDaily.spend));
  return rows;
}

/**
 * Get the earliest (MIN) date per campaign across the FULL dataset for a tenant.
 * NOT filtered by dateFrom/dateTo — used to compute the "NEW" badge
 * (a campaign is NEW if its first ever ad run is within the last 3 days).
 * Returns Map<campaignId, firstDateString "YYYY-MM-DD">.
 */
export async function getCampaignFirstDates(
  userId: number,
): Promise<Map<string, string>> {
  const db = await getDb();
  const map = new Map<string, string>();
  if (!db) return map;
  const rows = await db
    .select({
      campaignId: adInsightsDaily.campaignId,
      firstDate: sql<string>`MIN(${adInsightsDaily.date})`,
    })
    .from(adInsightsDaily)
    .where(eq(adInsightsDaily.userId, userId))
    .groupBy(adInsightsDaily.campaignId);
  for (const r of rows) {
    if (r.campaignId && r.firstDate) {
      map.set(String(r.campaignId), String(r.firstDate));
    }
  }
  return map;
}

/**
 * Get scaleNextAmount map for a list of (adId, date) — used to enrich
 * each row with "ยอดเก่า" (prev day's scaleNextAmount).
 * Returns Map<"adId|date", amount>.
 */
export async function getScaleAmountMap(
  userId: number,
  dateFrom: string,
  dateTo: string,
): Promise<Map<string, number>> {
  const db = await getDb();
  if (!db) return new Map();
  // Expand range by 1 day back so we can lookup "previous day" for the earliest date
  const d = new Date(`${dateFrom}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  const expandedFrom = d.toISOString().slice(0, 10);
  const rows = await db
    .select({
      adId: adManualMetrics.adId,
      date: adManualMetrics.date,
      amt: adManualMetrics.scaleNextAmount,
    })
    .from(adManualMetrics)
    .where(
      and(
        eq(adManualMetrics.userId, userId),
        gte(adManualMetrics.date, expandedFrom),
        lte(adManualMetrics.date, dateTo),
      ),
    );
  const m = new Map<string, number>();
  for (const r of rows) {
    if (r.amt != null) m.set(`${r.adId}|${r.date}`, r.amt);
  }
  return m;
}

/**
 * Helper: get accountId → groupId mapping for a tenant.
 */
export async function getAccountGroupMap(tenantId: number): Promise<Map<number, number>> {
  const db = await getDb();
  if (!db) return new Map();
  const members = await getAllGroupMembersForUser(tenantId);
  const m = new Map<number, number>();
  for (const mem of members) {
    if (!m.has(mem.accountId)) m.set(mem.accountId, mem.groupId);
  }
  return m;
}
