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
  ScaleLog,
  ScaleSettings,
  ShareLink,
  User,
  accountGroupMembers,
  accountGroups,
  adAccounts,
  commissionClipAssignments,
  commissionClipGrades,
  commissionGrades,
  commissionLocks,
  commissionStaff,
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
