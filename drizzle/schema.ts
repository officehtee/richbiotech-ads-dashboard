import {
  boolean,
  double,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table
 * Roles: admin / owner / ceo / content / staff / pending
 * - owner: workspace owner (ownerId = null)
 * - ceo: co-owner (ownerId → owner's user id)
 * - content: content team (ownerId → owner)
 * - staff: employees (ownerId → owner)
 * - pending: awaiting approval (ownerId = null, redirect to /onboarding)
 * - admin: platform admin
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", [
    "admin",
    "owner",
    "ceo",
    "content",
    "staff",
    "pending",
    "user",
  ])
    .default("pending")
    .notNull(),
  ownerId: int("ownerId"),
  companyCode: varchar("companyCode", { length: 20 }),
  companyName: varchar("companyName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Ad Accounts (Meta) — one per Ad Account ID, owned by a workspace user
 */
export const adAccounts = mysqlTable("adAccounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  adAccountId: varchar("adAccountId", { length: 64 }).notNull(),
  accessToken: text("accessToken").notNull(),
  accountName: varchar("accountName", { length: 255 }),
  nickname: varchar("nickname", { length: 255 }),
  pageName: varchar("pageName", { length: 255 }),
  phaseName: varchar("phaseName", { length: 255 }),
  roasTarget: double("roasTarget").default(2.0),
  isActive: boolean("isActive").default(true),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdAccount = typeof adAccounts.$inferSelect;
export type InsertAdAccount = typeof adAccounts.$inferInsert;

/**
 * Account Groups — group accounts by product category
 */
export const accountGroups = mysqlTable("accountGroups", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  groupName: varchar("groupName", { length: 255 }).notNull(),
  color: varchar("color", { length: 32 }).default("#3b82f6"),
  roasTarget: double("roasTarget").default(2.0),
  roasThreshold: double("roasThreshold").default(1.5),
  ctrThreshold: double("ctrThreshold").default(1.0),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccountGroup = typeof accountGroups.$inferSelect;
export type InsertAccountGroup = typeof accountGroups.$inferInsert;

/**
 * Account-Group Membership
 */
export const accountGroupMembers = mysqlTable("accountGroupMembers", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  accountId: int("accountId").notNull(),
  phaseName: varchar("phaseName", { length: 255 }),
});

export type AccountGroupMember = typeof accountGroupMembers.$inferSelect;
export type InsertAccountGroupMember = typeof accountGroupMembers.$inferInsert;

/**
 * Scale Log — record each budget scaling event
 */
export const scaleLogs = mysqlTable("scaleLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  groupId: int("groupId"),
  accountId: int("accountId"),
  adsetId: varchar("adsetId", { length: 64 }),
  adsetName: varchar("adsetName", { length: 500 }),
  phaseName: varchar("phaseName", { length: 255 }),
  budgetScaled: double("budgetScaled"),
  spendAll: double("spendAll"),
  status: mysqlEnum("status", ["active", "closed"]).default("active"),
  notes: text("notes"),
  scaledAt: timestamp("scaledAt").defaultNow().notNull(),
});

export type ScaleLog = typeof scaleLogs.$inferSelect;
export type InsertScaleLog = typeof scaleLogs.$inferInsert;

/**
 * Scale Settings — % เพิ่ม/ลดงบ per workspace
 */
export const scaleSettings = mysqlTable("scaleSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  increaseSmallPercent: double("increaseSmallPercent").default(20.0),
  increaseLargePercent: double("increaseLargePercent").default(50.0),
  decreaseSmallPercent: double("decreaseSmallPercent").default(20.0),
  decreaseLargePercent: double("decreaseLargePercent").default(30.0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScaleSettings = typeof scaleSettings.$inferSelect;
export type InsertScaleSettings = typeof scaleSettings.$inferInsert;

/**
 * Share Links — read-only dashboard share
 */
export const shareLinks = mysqlTable("shareLinks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 255 }),
  accountFilter: text("accountFilter").notNull(), // JSON
  defaultDateRange: varchar("defaultDateRange", { length: 16 }).default("7d"),
  isActive: boolean("isActive").default(true),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShareLink = typeof shareLinks.$inferSelect;
export type InsertShareLink = typeof shareLinks.$inferInsert;

/* ---------- Commission Tables ---------- */

export const commissionGrades = mysqlTable("commissionGrades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  gradeName: varchar("gradeName", { length: 50 }).notNull(),
  amount: double("amount").notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CommissionGrade = typeof commissionGrades.$inferSelect;
export type InsertCommissionGrade = typeof commissionGrades.$inferInsert;

export const commissionStaff = mysqlTable("commissionStaff", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  linkedUserId: int("linkedUserId"), // optional link to users.id (for "My Commission")
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CommissionStaff = typeof commissionStaff.$inferSelect;
export type InsertCommissionStaff = typeof commissionStaff.$inferInsert;

export const commissionClipAssignments = mysqlTable(
  "commissionClipAssignments",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    clipNumber: varchar("clipNumber", { length: 50 }).notNull(),
    groupId: int("groupId"),
    staffId: int("staffId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
);

export type CommissionClipAssignment =
  typeof commissionClipAssignments.$inferSelect;
export type InsertCommissionClipAssignment =
  typeof commissionClipAssignments.$inferInsert;

export const commissionClipGrades = mysqlTable("commissionClipGrades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clipNumber: varchar("clipNumber", { length: 50 }).notNull(),
  groupId: int("groupId"),
  gradeId: int("gradeId"),
  periodKey: varchar("periodKey", { length: 10 }).notNull(), // "YYYY-MM"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CommissionClipGrade = typeof commissionClipGrades.$inferSelect;
export type InsertCommissionClipGrade =
  typeof commissionClipGrades.$inferInsert;

export const commissionLocks = mysqlTable("commissionLocks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  periodKey: varchar("periodKey", { length: 10 }).notNull(),
  periodLabel: varchar("periodLabel", { length: 100 }),
  snapshotJson: text("snapshotJson").notNull(),
  lockedAt: timestamp("lockedAt").defaultNow().notNull(),
});

export type CommissionLock = typeof commissionLocks.$inferSelect;
export type InsertCommissionLock = typeof commissionLocks.$inferInsert;
