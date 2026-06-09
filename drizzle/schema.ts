import {
  boolean,
  double,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
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
    "supervisor",
    "content",
    "staff",
    "pending",
    "user",
  ])
    .default("pending")
    .notNull(),
  nickname: varchar("nickname", { length: 255 }),
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
  bmId: int("bmId"), // FK -> businessManagers.id (nullable: บัญชีที่ไม่ผ่าน BM)
  discoveredAt: timestamp("discoveredAt"), // วันที่ discover ครั้งแรกผ่าน BM
  // ── Prompt A: per-account ownership & payment metadata ──
  ownerUserId: int("ownerUserId"), // FK → users.id (เจ้าของรายบัญชี — คนละตัวกับ userId ที่เป็น workspace owner)
  paymentType: mysqlEnum("paymentType", ["card", "prepaid"]), // nullable: การชำระเงิน card=ผูกบัตร, prepaid=เติมเงิน
  limitAmount: int("limitAmount"), // nullable: วงเงินยิงสูงสุด/วัน (บาท)
  tokenStatus: mysqlEnum("tokenStatus", ["active", "token_expired", "blocked", "revoked"])
    .default("active")
    .notNull(), // สถานะ token บัญชีเดี่ยว (logic เช็คจริงทำใน Prompt B)
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


/* ---------- Alert System (Round 4) ---------- */

/**
 * Alert Rules — เงื่อนไขที่ระบบจะตรวจทุก 3 ชั่วโมง
 * ruleType:
 *  - roas_below              (param: thresholdRoas, scopeJson)
 *  - spend_no_purchase       (param: minSpend)
 *  - cost_per_msg_above      (param: thresholdCost)
 *  - ctr_drop_pct            (param: dropPercent)  // CTR ลดลงเทียบงวดก่อน
 *  - spend_spike_pct         (param: spikePercent) // Spend พุ่งเทียบเฉลี่ย
 */
export const alertRules = mysqlTable("alertRules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ruleType: mysqlEnum("ruleType", [
    "roas_below",
    "spend_no_purchase",
    "cost_per_msg_above",
    "ctr_drop_pct",
    "spend_spike_pct",
  ]).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  isEnabled: boolean("isEnabled").default(true),
  paramJson: text("paramJson").notNull(), // {threshold, scope, ...}
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("warning"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = typeof alertRules.$inferInsert;

/**
 * Alert Channels — ปลายทางการส่งแจ้งเตือน
 * channelType: web (ในแอป), line (Messaging API), webhook, email, manus_owner
 */
export const alertChannels = mysqlTable("alertChannels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  channelType: mysqlEnum("channelType", [
    "web",
    "line",
    "webhook",
    "email",
    "manus_owner",
  ]).notNull(),
  label: varchar("label", { length: 255 }),
  configJson: text("configJson").notNull(), // {token, channelId, url, email}
  isEnabled: boolean("isEnabled").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AlertChannel = typeof alertChannels.$inferSelect;
export type InsertAlertChannel = typeof alertChannels.$inferInsert;

/**
 * Alert Events — instance ที่ trigger จริง
 */
export const alertEvents = mysqlTable("alertEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ruleId: int("ruleId"),
  ruleType: varchar("ruleType", { length: 64 }).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("warning"),
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message").notNull(),
  contextJson: text("contextJson"), // {accountId, adsetId, metric snapshot}
  isRead: boolean("isRead").default(false),
  dedupeKey: varchar("dedupeKey", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AlertEvent = typeof alertEvents.$inferSelect;
export type InsertAlertEvent = typeof alertEvents.$inferInsert;


/**
 * Invite Tokens — Magic Invite Link
 * Owner ออกลิงก์ส่วนตัวพร้อมเลือก role ปลายทาง อายุ 7 วัน Owner ปิดเอง
 */
export const inviteTokens = mysqlTable("inviteTokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  ownerId: int("ownerId").notNull(), // workspace owner user id
  role: mysqlEnum("role", ["ceo", "supervisor", "content", "staff"]).notNull(),
  label: varchar("label", { length: 255 }), // ชื่อพนักงาน (optional)
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  usedByUserId: int("usedByUserId"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InviteToken = typeof inviteTokens.$inferSelect;
export type InsertInviteToken = typeof inviteTokens.$inferInsert;


/* ---------- Business Manager Auto-Discovery (Round 7.23) ---------- */

/**
 * Business Managers — Meta Business Manager ที่ Owner ผูกเข้าระบบ
 * 1 BM = 1 กลุ่มสินค้า (accountGroupId)
 * accessTokenEncrypted: AES-256-GCM ciphertext (ใช้ JWT_SECRET เป็น key)
 */
export const businessManagers = mysqlTable("businessManagers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // workspace owner
  bmId: varchar("bmId", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  accountGroupId: int("accountGroupId").notNull(),
  accessTokenEncrypted: text("accessTokenEncrypted").notNull(),
  tokenExpiresAt: timestamp("tokenExpiresAt"), // null = system user (ไม่หมดอายุ)
  lastSyncAt: timestamp("lastSyncAt"),
  status: mysqlEnum("status", ["active", "token_expired", "blocked", "revoked"])
    .default("active")
    .notNull(),
  // ── Prompt A: เจ้าของ default ของ BM — ใช้ใส่ให้บัญชีย่อยใหม่ที่ discover ตอน sync ──
  defaultOwnerUserId: int("defaultOwnerUserId"), // FK → users.id (nullable)
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessManager = typeof businessManagers.$inferSelect;
export type InsertBusinessManager = typeof businessManagers.$inferInsert;

/**
 * BM ↔ Ad Account Links — many-to-many (1 BM หลายบัญชี / 1 บัญชีอาจอยู่หลาย BM)
 * type:
 *  - owned: BM เป็นเจ้าของบัญชี
 *  - client: BM แค่ดูแลให้
 */
export const bmAdAccountLinks = mysqlTable("bmAdAccountLinks", {
  id: int("id").autoincrement().primaryKey(),
  bmId: int("bmId").notNull(), // FK → businessManagers.id
  adAccountId: int("adAccountId").notNull(), // FK → adAccounts.id
  type: mysqlEnum("type", ["owned", "client"]).default("owned").notNull(),
  discoveredAt: timestamp("discoveredAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["active", "removed"]).default("active").notNull(),
});

export type BmAdAccountLink = typeof bmAdAccountLinks.$inferSelect;
export type InsertBmAdAccountLink = typeof bmAdAccountLinks.$inferInsert;

/**
 * BM Discovery Logs — เก็บประวัติ sync ทุกครั้ง
 */
export const bmDiscoveryLogs = mysqlTable("bmDiscoveryLogs", {
  id: int("id").autoincrement().primaryKey(),
  bmId: int("bmId").notNull(),
  userId: int("userId").notNull(),
  runAt: timestamp("runAt").defaultNow().notNull(),
  triggerSource: mysqlEnum("triggerSource", ["manual", "auto", "initial"])
    .default("manual")
    .notNull(),
  foundCount: int("foundCount").default(0),
  addedCount: int("addedCount").default(0),
  linkedCount: int("linkedCount").default(0),
  removedCount: int("removedCount").default(0),
  status: mysqlEnum("status", ["success", "partial", "failed"]).default("success").notNull(),
  errorMessage: text("errorMessage"),
  durationMs: int("durationMs"),
});

export type BmDiscoveryLog = typeof bmDiscoveryLogs.$inferSelect;
export type InsertBmDiscoveryLog = typeof bmDiscoveryLogs.$inferInsert;

/**
 * Ad Insights Daily — 1 row per ad_id × date
 * Synced from Meta API: level=ad + time_increment=1
 * Used by: หน้า "วิเคราะห์แอดเชิงลึก" (ad-day grain)
 */
export const adInsightsDaily = mysqlTable("adInsightsDaily", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // workspace owner (tenant)
  accountId: int("accountId").notNull(), // FK → adAccounts.id
  adId: varchar("adId", { length: 64 }).notNull(),
  adName: varchar("adName", { length: 512 }),
  adsetId: varchar("adsetId", { length: 64 }),
  adsetName: varchar("adsetName", { length: 512 }),
  campaignId: varchar("campaignId", { length: 64 }),
  campaignName: varchar("campaignName", { length: 512 }),
  groupId: int("groupId"), // FK → accountGroups.id (denormalized for fast filter)
  pageName: varchar("pageName", { length: 255 }),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  spend: double("spend").default(0).notNull(),
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  ctr: double("ctr").default(0).notNull(),
  messages: int("messages").default(0).notNull(),
  dailyBudget: double("dailyBudget"), // adset daily budget OR campaign daily budget (CBO fallback)
  budgetSource: mysqlEnum("budgetSource", ["adset", "campaign", "none"]).default("none"),
  metaOrders: int("metaOrders").default(0).notNull(), // จำนวนการซื้อ (omni_purchase) ดึงจาก Meta
  metaSalesAmount: double("metaSalesAmount").default(0).notNull(), // ค่าคอนเวอร์ชั่นการซื้อ (omni_purchase value) ดึงจาก Meta
  reach: int("reach").default(0).notNull(), // การเข้าถึง (reach) ดึงจาก Meta
  costPerMessage: double("costPerMessage"), // ต้นทุนต่อการเริ่มสนทนา (cost_per_action_type) — null ถ้าไม่มี
  purchaseRoas: double("purchaseRoas"), // ROAS (purchase_roas) ดึงจาก Meta — null ถ้าไม่มี
  previewCachedUrl: text("previewCachedUrl"), // /manus-storage/...
  previewCachedAt: timestamp("previewCachedAt"),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("adInsightsDaily_adId_date_unique").on(t.adId, t.date),
  index("adInsightsDaily_userId_date_idx").on(t.userId, t.date),
  index("adInsightsDaily_accountId_date_idx").on(t.accountId, t.date),
]);

export type AdInsightDaily = typeof adInsightsDaily.$inferSelect;
export type InsertAdInsightDaily = typeof adInsightsDaily.$inferInsert;

/**
 * Ad Manual Metrics — ค่าที่ผู้ใช้กรอกเอง (Orders / Sales / Scale Next / Note)
 * 1 row per ad_id × date
 */
export const adManualMetrics = mysqlTable("adManualMetrics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // workspace owner (tenant)
  adId: varchar("adId", { length: 64 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  orders: int("orders"),
  salesCount: int("salesCount"),
  salesAmount: double("salesAmount"),
  scaleNextAmount: double("scaleNextAmount"), // ยอดใหม่ (จะกลายเป็นยอดเก่าของวันถัดไป)
  note: text("note"),
  updatedBy: int("updatedBy"), // FK → users.id
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("adManualMetrics_adId_date_unique").on(t.adId, t.date),
  index("adManualMetrics_userId_date_idx").on(t.userId, t.date),
]);

export type AdManualMetric = typeof adManualMetrics.$inferSelect;
export type InsertAdManualMetric = typeof adManualMetrics.$inferInsert;

/**
 * Campaign Status (Round 7.35) — 1 row per campaignId × tenant
 * ติดตามสถานะแคมเปญ WAIT/NEW/REJECT จาก Meta Ad Management API
 * - effectiveStatus: สถานะปัจจุบันจาก Meta (ACTIVE / PENDING_REVIEW / DISAPPROVED ...)
 * - approvedAt: วันที่ตรวจเจอ ACTIVE ครั้งแรก (ระบบจดเอง, ใช้นับ NEW 3 วัน) — YYYY-MM-DD
 * - rejectedAt: วันที่ตรวจเจอถูกปฏิเสธครั้งแรก (ระบบจดเอง, ใช้นับ REJECT 5 วัน) — YYYY-MM-DD
 * - rejectedExpired: true เมื่อ REJECT ครบ 5 วันและถูก hard-delete แล้ว
 *   (กันไม่ให้ดึงกลับมาแสดงซ้ำตราบใดที่ยัง REJECT อยู่)
 */
export const campaignStatus = mysqlTable("campaignStatus", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // workspace owner (tenant)
  accountId: int("accountId").notNull(), // FK → adAccounts.id
  campaignId: varchar("campaignId", { length: 64 }).notNull(),
  campaignName: varchar("campaignName", { length: 512 }),
  effectiveStatus: varchar("effectiveStatus", { length: 64 }),
  approvedAt: varchar("approvedAt", { length: 10 }), // YYYY-MM-DD
  rejectedAt: varchar("rejectedAt", { length: 10 }), // YYYY-MM-DD
  rejectedExpired: boolean("rejectedExpired").default(false).notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("campaignStatus_userId_campaignId_unique").on(t.userId, t.campaignId),
  index("campaignStatus_userId_idx").on(t.userId),
  index("campaignStatus_accountId_idx").on(t.accountId),
]);

export type CampaignStatus = typeof campaignStatus.$inferSelect;
export type InsertCampaignStatus = typeof campaignStatus.$inferInsert;

/**
 * Round 7.44 — Sync Log
 * บันทึกประวัติการ sync แต่ละรอบของ syncAdInsights (และ job อื่นในอนาคต)
 * ใช้ตรวจสอบเมื่อ Meta อนุมัติ token: ดูจำนวนบัญชีใหม่/เก่า, rows, สำเร็จ/ล้มเหลว
 */
export const syncLogs = mysqlTable("syncLogs", {
  id: int("id").autoincrement().primaryKey(),
  jobType: mysqlEnum("jobType", ["adInsights", "bm", "alerts"])
    .default("adInsights")
    .notNull(),
  runAt: timestamp("runAt").defaultNow().notNull(),
  tenants: int("tenants").default(0).notNull(), // จำนวน workspace ที่ประมวลผล
  newAccounts: int("newAccounts").default(0).notNull(), // บัญชีใหม่ (initial 90 วัน)
  existingAccounts: int("existingAccounts").default(0).notNull(), // บัญชีเก่า (normal 7 วัน)
  rowsSynced: int("rowsSynced").default(0).notNull(),
  previewsRefreshed: int("previewsRefreshed").default(0).notNull(),
  failed: int("failed").default(0).notNull(),
  durationMs: int("durationMs").default(0).notNull(),
  status: mysqlEnum("status", ["success", "partial", "failed"])
    .default("success")
    .notNull(),
  errorMessage: text("errorMessage"),
}, (t) => [
  index("syncLogs_jobType_idx").on(t.jobType),
  index("syncLogs_runAt_idx").on(t.runAt),
]);

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;
