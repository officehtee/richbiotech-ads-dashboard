import { z } from "zod";
import { ownerProcedure, protectedProcedure, router } from "./_core/trpc";
import { resolveWorkspaceUserId } from "./db";
import {
  countUnreadAlertEvents,
  createAlertChannel,
  createAlertRule,
  deleteAlertChannel,
  deleteAlertRule,
  listAlertChannels,
  listAlertEvents,
  listAlertRules,
  markAlertEventRead,
  markAllAlertEventsRead,
  updateAlertChannel,
  updateAlertRule,
  getNotificationPref,
  upsertNotificationPref,
} from "./db";
import { DEFAULT_RULES, runAlertCheckForTenant } from "./alertEngine";

async function tid(ctx: { user: { id: number; role: string; ownerId: number | null } }): Promise<number> {
  return resolveWorkspaceUserId(ctx.user.id, ctx.user.role, ctx.user.ownerId);
}

const ruleTypeEnum = z.enum([
  "roas_below",
  "spend_no_purchase",
  "cost_per_msg_above",
  "ctr_drop_pct",
  "spend_spike_pct",
]);

const severityEnum = z.enum(["info", "warning", "critical"]);

const channelTypeEnum = z.enum(["web", "line", "webhook", "email", "manus_owner"]);

export const alertsRouter = router({
  // ---- Rules ----
  listRules: protectedProcedure.query(async ({ ctx }) => {
    const t = await tid(ctx);
    const rows = await listAlertRules(t);
    return rows.map((r) => ({ ...r, param: JSON.parse(r.paramJson || "{}") }));
  }),

  /** Seed default rules — เรียกครั้งแรก หรือ "reset to defaults" */
  seedDefaults: ownerProcedure.mutation(async ({ ctx }) => {
    const t = await tid(ctx);
    const existing = await listAlertRules(t);
    const existingTypes = new Set(existing.map((r) => r.ruleType));
    let created = 0;
    for (const def of DEFAULT_RULES) {
      if (existingTypes.has(def.ruleType)) continue;
      await createAlertRule({
        userId: t,
        ruleType: def.ruleType,
        label: def.label,
        isEnabled: true,
        paramJson: JSON.stringify(def.param),
        severity: def.severity,
      });
      created++;
    }
    return { created };
  }),

  createRule: ownerProcedure
    .input(
      z.object({
        ruleType: ruleTypeEnum,
        label: z.string().min(1),
        param: z.record(z.string(), z.any()).default({}),
        severity: severityEnum.default("warning"),
        isEnabled: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const t = await tid(ctx);
      const id = await createAlertRule({
        userId: t,
        ruleType: input.ruleType,
        label: input.label,
        paramJson: JSON.stringify(input.param),
        severity: input.severity,
        isEnabled: input.isEnabled,
      });
      return { id };
    }),

  updateRule: ownerProcedure
    .input(
      z.object({
        id: z.number(),
        label: z.string().optional(),
        param: z.record(z.string(), z.any()).optional(),
        severity: severityEnum.optional(),
        isEnabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const t = await tid(ctx);
      const patch: any = {};
      if (input.label !== undefined) patch.label = input.label;
      if (input.param !== undefined) patch.paramJson = JSON.stringify(input.param);
      if (input.severity !== undefined) patch.severity = input.severity;
      if (input.isEnabled !== undefined) patch.isEnabled = input.isEnabled;
      await updateAlertRule(input.id, t, patch);
      return { ok: true };
    }),

  removeRule: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const t = await tid(ctx);
      await deleteAlertRule(input.id, t);
      return { ok: true };
    }),

  // ---- Channels ----
  listChannels: protectedProcedure.query(async ({ ctx }) => {
    const t = await tid(ctx);
    const rows = await listAlertChannels(t);
    return rows.map((c) => {
      const cfg = JSON.parse(c.configJson || "{}");
      // mask sensitive fields
      const masked = { ...cfg };
      if (masked.accessToken) masked.accessToken = "***";
      if (masked.secret) masked.secret = "***";
      return { ...c, config: masked };
    });
  }),

  createChannel: ownerProcedure
    .input(
      z.object({
        channelType: channelTypeEnum,
        label: z.string().optional(),
        config: z.record(z.string(), z.any()).default({}),
        isEnabled: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const t = await tid(ctx);
      const id = await createAlertChannel({
        userId: t,
        channelType: input.channelType,
        label: input.label ?? null,
        configJson: JSON.stringify(input.config),
        isEnabled: input.isEnabled,
      });
      return { id };
    }),

  updateChannel: ownerProcedure
    .input(
      z.object({
        id: z.number(),
        label: z.string().optional(),
        config: z.record(z.string(), z.any()).optional(),
        isEnabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const t = await tid(ctx);
      const patch: any = {};
      if (input.label !== undefined) patch.label = input.label;
      if (input.config !== undefined) patch.configJson = JSON.stringify(input.config);
      if (input.isEnabled !== undefined) patch.isEnabled = input.isEnabled;
      await updateAlertChannel(input.id, t, patch);
      return { ok: true };
    }),

  removeChannel: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const t = await tid(ctx);
      await deleteAlertChannel(input.id, t);
      return { ok: true };
    }),

  // ---- Events ----
  listEvents: protectedProcedure
    .input(z.object({ onlyUnread: z.boolean().default(false), limit: z.number().min(1).max(200).default(100) }))
    .query(async ({ ctx, input }) => {
      const t = await tid(ctx);
      const rows = await listAlertEvents(t, { onlyUnread: input.onlyUnread, limit: input.limit });
      return rows.map((e) => ({
        ...e,
        context: e.contextJson ? JSON.parse(e.contextJson) : null,
      }));
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const t = await tid(ctx);
    return countUnreadAlertEvents(t);
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const t = await tid(ctx);
      await markAlertEventRead(input.id, t);
      return { ok: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const t = await tid(ctx);
    await markAllAlertEventsRead(t);
    return { ok: true };
  }),

  /** ทดสอบรันการตรวจทันที (ไม่รอ cron) — owner-only */
  runNow: ownerProcedure.mutation(async ({ ctx }) => {
    const t = await tid(ctx);
    return runAlertCheckForTenant(t);
  }),

  // ---- Notification Preferences (per-user, พนักงานทุกคนตั้งของตัวเองได้) ----
  // ใช้ ctx.user.id (ไม่ใช่ tenant) — แต่ละคนมีค่าของตัวเอง
  /** อ่าน preference การแจ้งเตือนของผู้ใช้ปัจจุบัน */
  getNotificationPrefs: protectedProcedure.query(async ({ ctx }) => {
    return getNotificationPref(ctx.user.id);
  }),

  /** บันทึก preference — ส่งเฉพาะ field ที่ต้องการเปลี่ยน (partial update) */
  updateNotificationPrefs: protectedProcedure
    .input(
      z.object({
        masterEnabled: z.boolean().optional(),
        syncSuccess: z.boolean().optional(),
        syncFailed: z.boolean().optional(),
        tokenIssue: z.boolean().optional(),
        alertCritical: z.boolean().optional(),
        alertWarning: z.boolean().optional(),
        alertInfo: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await upsertNotificationPref(ctx.user.id, input);
      return getNotificationPref(ctx.user.id);
    }),
});
