import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { aiRouter } from "./aiAdvisor";
import {
  CommissionSnapshot,
  ScalingScoreData,
} from "../shared/types";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  commissionViewProcedure,
  ownerProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import {
  autoPreviousRange,
  calculateScalingScore,
  compareAccounts,
  compareGroups,
  decideScaleBadge,
  getAccountsKpi,
  getAccountsSparkline,
  getAdsetRows,
  getGroupsKpi,
  getSingleAccountTrend,
  resolveDateRange,
} from "./aggregator";
import {
  createAccountGroup,
  createAdAccount,
  createCommissionGrade,
  createCommissionStaff,
  createScaleLog,
  createShareLink,
  deleteAccountGroup,
  deleteAdAccount,
  deleteCommissionGrade,
  deleteCommissionLock,
  deleteCommissionStaff,
  deleteScaleLog,
  deleteShareLink,
  findUserByCompanyCode,
  getAccountGroupsByUser,
  getAdAccountById,
  getAdAccountsByUser,
  getAllGroupMembersForUser,
  getCommissionLock,
  getGroupMembers,
  getOwnerUserId,
  getScaleSettings,
  getShareLinkByToken,
  getUserById,
  listClipAssignments,
  listClipGrades,
  listCommissionGrades,
  listCommissionLocks,
  listCommissionStaff,
  listScaleLogs,
  listShareLinks,
  listUsersInWorkspace,
  resolveWorkspaceUserId,
  setGroupMembers,
  setOwnerCompany,
  setUserRole,
  updateAccountGroup,
  updateAdAccount,
  updateCommissionGrade,
  updateCommissionStaff,
  updateScaleLog,
  updateShareLink,
  upsertClipAssignment,
  upsertClipGrade,
  upsertCommissionLock,
  upsertScaleSettings,
} from "./db";
import {
  fetchAdsForAdset,
  fetchAdsetDailyInsights,
  validateToken,
} from "./metaApi";

const tokenAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const generateToken = customAlphabet(tokenAlphabet, 24);
const generateCompanyCode = customAlphabet(tokenAlphabet, 8);

const dateRangeInput = z.object({
  preset: z.enum(["3d", "7d", "14d", "30d", "custom"]),
  since: z.string().optional(),
  until: z.string().optional(),
});

async function tenantId(ctx: { user: { id: number; role: string; ownerId: number | null } }): Promise<number> {
  return resolveWorkspaceUserId(ctx.user.id, ctx.user.role, ctx.user.ownerId);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  /* ----- Onboarding ----- */
  onboarding: router({
    joinByCompanyCode: protectedProcedure
      .input(z.object({ code: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const owner = await findUserByCompanyCode(input.code.trim());
        if (!owner) throw new TRPCError({ code: "NOT_FOUND", message: "Company code ไม่ถูกต้อง" });
        await setUserRole(ctx.user.id, "staff", owner.id);
        return { ok: true, ownerId: owner.id };
      }),
    setupCompany: protectedProcedure
      .input(z.object({ companyName: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        // Promote a pending user to owner with a generated company code
        if (ctx.user.role !== "pending" && ctx.user.role !== "user") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "ผู้ใช้นี้มี role อยู่แล้ว" });
        }
        const code = generateCompanyCode();
        await setOwnerCompany(ctx.user.id, { companyName: input.companyName, companyCode: code });
        await setUserRole(ctx.user.id, "owner", null);
        return { ok: true, companyCode: code };
      }),
    myCompany: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const owner = await getUserById(tid);
      return owner ?? null;
    }),
  }),

  /* ----- Users ----- */
  users: router({
    list: ownerProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      return listUsersInWorkspace(tid);
    }),
    setRole: ownerProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(["ceo", "content", "staff", "pending"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const target = await getUserById(input.userId);
        if (!target) throw new TRPCError({ code: "NOT_FOUND" });
        if (target.id !== tid && target.ownerId !== tid) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await setUserRole(input.userId, input.role, tid);
        return { ok: true };
      }),
    remove: ownerProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const target = await getUserById(input.userId);
        if (!target || target.ownerId !== tid) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await setUserRole(input.userId, "pending", null);
        return { ok: true };
      }),
  }),

  /* ----- Ad Accounts ----- */
  accounts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const accounts = await getAdAccountsByUser(tid);
      return accounts.map((a) => ({ ...a, accessToken: a.accessToken ? "***" : "" }));
    }),
    create: ownerProcedure
      .input(
        z.object({
          adAccountId: z.string().regex(/^act_\d+$/, "Format: act_123456789"),
          accessToken: z.string().min(20),
          nickname: z.string().optional(),
          pageName: z.string().optional(),
          phaseName: z.string().optional(),
          roasTarget: z.number().min(0).max(20).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const valid = await validateToken(input.adAccountId, input.accessToken);
        if (!valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Token ไม่ถูกต้องหรือไม่มีสิทธิ์เข้าถึง Ad Account นี้",
          });
        }
        const id = await createAdAccount({
          userId: tid,
          adAccountId: input.adAccountId,
          accessToken: input.accessToken,
          nickname: input.nickname ?? null,
          pageName: input.pageName ?? null,
          phaseName: input.phaseName ?? null,
          roasTarget: input.roasTarget ?? 2.0,
          isActive: true,
        });
        return { id };
      }),
    update: ownerProcedure
      .input(
        z.object({
          id: z.number(),
          nickname: z.string().nullish(),
          pageName: z.string().nullish(),
          phaseName: z.string().nullish(),
          roasTarget: z.number().min(0).max(20).optional(),
          accessToken: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const { id, ...patch } = input;
        await updateAdAccount(id, tid, patch);
        return { ok: true };
      }),
    remove: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await deleteAdAccount(input.id, tid);
        return { ok: true };
      }),
  }),

  /* ----- Groups ----- */
  groups: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const groups = await getAccountGroupsByUser(tid);
      const members = await getAllGroupMembersForUser(tid);
      return groups.map((g) => ({
        ...g,
        memberAccountIds: members.filter((m) => m.groupId === g.id).map((m) => m.accountId),
      }));
    }),
    create: ownerProcedure
      .input(
        z.object({
          groupName: z.string().min(1),
          color: z.string().optional(),
          roasTarget: z.number().optional(),
          roasThreshold: z.number().optional(),
          ctrThreshold: z.number().optional(),
          memberAccountIds: z.array(z.number()).default([]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const id = await createAccountGroup({
          userId: tid,
          groupName: input.groupName,
          color: input.color ?? "#3b82f6",
          roasTarget: input.roasTarget ?? 2.0,
          roasThreshold: input.roasThreshold ?? 1.5,
          ctrThreshold: input.ctrThreshold ?? 1.0,
        });
        if (input.memberAccountIds.length > 0) {
          await setGroupMembers(
            id,
            input.memberAccountIds.map((accountId) => ({ accountId })),
          );
        }
        return { id };
      }),
    update: ownerProcedure
      .input(
        z.object({
          id: z.number(),
          groupName: z.string().optional(),
          color: z.string().optional(),
          roasTarget: z.number().optional(),
          roasThreshold: z.number().optional(),
          ctrThreshold: z.number().optional(),
          memberAccountIds: z.array(z.number()).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const { id, memberAccountIds, ...patch } = input;
        await updateAccountGroup(id, tid, patch);
        if (memberAccountIds) {
          await setGroupMembers(id, memberAccountIds.map((aid) => ({ accountId: aid })));
        }
        return { ok: true };
      }),
    remove: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await deleteAccountGroup(input.id, tid);
        return { ok: true };
      }),
    members: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => getGroupMembers(input.groupId)),
  }),

  /* ----- Dashboard ----- */
  dashboard: router({
    hub: protectedProcedure
      .input(z.object({ dateRange: dateRangeInput }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        return getAccountsKpi(tid, input.dateRange);
      }),
    groups: protectedProcedure
      .input(z.object({ dateRange: dateRangeInput }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        return getGroupsKpi(tid, input.dateRange);
      }),
    single: protectedProcedure
      .input(z.object({ accountId: z.number(), dateRange: dateRangeInput }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const accounts = await getAccountsKpi(tid, input.dateRange, [input.accountId]);
        const trend = await getSingleAccountTrend(tid, input.accountId, input.dateRange);
        return { kpi: accounts[0] ?? null, trend };
      }),
  }),

  /* ----- Ad Intelligence ----- */
  ads: router({
    list: protectedProcedure
      .input(
        z.object({
          dateRange: dateRangeInput,
          accountIds: z.array(z.number()).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        return getAdsetRows(tid, input.dateRange, input.accountIds);
      }),
    adsetDetail: protectedProcedure
      .input(
        z.object({
          accountId: z.number(),
          adsetId: z.string(),
          dateRange: dateRangeInput,
        }),
      )
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const account = await getAdAccountById(input.accountId, tid);
        if (!account) throw new TRPCError({ code: "NOT_FOUND" });
        const range = resolveDateRange(input.dateRange);
        const [daily, ads] = await Promise.all([
          fetchAdsetDailyInsights(account.adAccountId, input.adsetId, account.accessToken, range),
          fetchAdsForAdset(account.adAccountId, input.adsetId, account.accessToken, range),
        ]);
        return { daily, ads };
      }),
  }),

  /* ----- Smart Scaling ----- */
  scaling: router({
    suggestions: protectedProcedure
      .input(
        z.object({
          dateRange: dateRangeInput,
          minSpend: z.number().default(100),
        }),
      )
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const adsets = await getAdsetRows(tid, input.dateRange);
        const groups = await getAccountGroupsByUser(tid);
        const groupMap = new Map(groups.map((g) => [g.id, g]));
        const filtered = adsets.filter((a) => a.spend >= input.minSpend);
        const result: ScalingScoreData[] = filtered.map((a) => {
          const grp = a.groupId ? groupMap.get(a.groupId) : undefined;
          const roasTarget = grp?.roasTarget ?? 2.0;
          const ctrThreshold = grp?.ctrThreshold ?? 1.0;
          const score = calculateScalingScore(a.roas, a.ctr, roasTarget, ctrThreshold);
          const decision = decideScaleBadge(a.roas, a.ctr, roasTarget, ctrThreshold);
          return {
            adsetId: a.adsetId,
            adsetName: a.adsetName,
            campaignName: a.campaignName,
            accountId: a.accountId,
            pageName: a.pageName,
            phaseName: a.phaseName,
            groupId: a.groupId,
            groupName: a.groupName,
            spend: a.spend,
            roas: a.roas,
            ctr: a.ctr,
            score,
            badge: decision.badge,
            badgeIcon: decision.badgeIcon,
            recommendation: decision.recommendation,
            trend7d: [],
          };
        });
        return result.sort((a, b) => b.score - a.score);
      }),
    settings: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const s = await getScaleSettings(tid);
      return (
        s ?? {
          increaseSmallPercent: 20,
          increaseLargePercent: 50,
          decreaseSmallPercent: 20,
          decreaseLargePercent: 30,
        }
      );
    }),
    saveSettings: ownerProcedure
      .input(
        z.object({
          increaseSmallPercent: z.number(),
          increaseLargePercent: z.number(),
          decreaseSmallPercent: z.number(),
          decreaseLargePercent: z.number(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await upsertScaleSettings({ userId: tid, ...input });
        return { ok: true };
      }),
    listLogs: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      return listScaleLogs(tid);
    }),
    createLog: protectedProcedure
      .input(
        z.object({
          accountId: z.number().nullable(),
          groupId: z.number().nullable(),
          adsetId: z.string().nullable(),
          adsetName: z.string().nullable(),
          phaseName: z.string().nullable(),
          budgetScaled: z.number(),
          spendAll: z.number().nullable(),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const id = await createScaleLog({
          userId: tid,
          accountId: input.accountId,
          groupId: input.groupId,
          adsetId: input.adsetId,
          adsetName: input.adsetName,
          phaseName: input.phaseName,
          budgetScaled: input.budgetScaled,
          spendAll: input.spendAll,
          notes: input.notes ?? null,
          status: "active",
        });
        return { id };
      }),
    closeLog: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await updateScaleLog(input.id, tid, { status: "closed" });
        return { ok: true };
      }),
    removeLog: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await deleteScaleLog(input.id, tid);
        return { ok: true };
      }),
  }),

  /* ----- Share Links ----- */
  share: router({
    list: ownerProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      return listShareLinks(tid);
    }),
    create: ownerProcedure
      .input(
        z.object({
          label: z.string().optional(),
          accountFilter: z.object({
            type: z.enum(["all", "group", "account"]),
            groupId: z.number().optional(),
            accountId: z.number().optional(),
          }),
          defaultDateRange: z.string().default("7d"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const token = generateToken();
        await createShareLink({
          userId: tid,
          token,
          label: input.label ?? null,
          accountFilter: JSON.stringify(input.accountFilter),
          defaultDateRange: input.defaultDateRange,
          isActive: true,
        });
        return { token };
      }),
    toggle: ownerProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await updateShareLink(input.id, tid, { isActive: input.isActive });
        return { ok: true };
      }),
    remove: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await deleteShareLink(input.id, tid);
        return { ok: true };
      }),
    /** Public: read-only view for /share/:token */
    publicView: publicProcedure
      .input(
        z.object({
          token: z.string(),
          dateRange: dateRangeInput.optional(),
        }),
      )
      .query(async ({ input }) => {
        const link = await getShareLinkByToken(input.token);
        if (!link || !link.isActive) {
          throw new TRPCError({ code: "NOT_FOUND", message: "ลิงก์ไม่พบหรือถูกปิดใช้งาน" });
        }
        if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ลิงก์หมดอายุแล้ว" });
        }
        const filter = JSON.parse(link.accountFilter) as {
          type: "all" | "group" | "account";
          groupId?: number;
          accountId?: number;
        };
        const dr = input.dateRange ?? {
          preset: (link.defaultDateRange as any) ?? "7d",
        };
        const tid = link.userId;
        let accountIds: number[] | undefined;
        if (filter.type === "account" && filter.accountId) {
          accountIds = [filter.accountId];
        } else if (filter.type === "group" && filter.groupId) {
          const members = await getAllGroupMembersForUser(tid);
          accountIds = members.filter((m) => m.groupId === filter.groupId).map((m) => m.accountId);
        }
        const kpis = await getAccountsKpi(tid, dr as any, accountIds);
        const groups = filter.type === "all" || filter.type === "group" ? await getGroupsKpi(tid, dr as any) : [];
        return {
          label: link.label,
          filter,
          accounts: kpis,
          groups: filter.type === "group" ? groups.filter((g) => g.groupId === filter.groupId) : groups,
        };
      }),
  }),

  /* ----- Performance Comparison (Round 2) ----- */
  comparison: router({
    /**
     * Compare KPI metrics between two date ranges for accounts or groups.
     * If `mode = "auto"` the previous period is the immediately-preceding same-length window.
     */
    compare: protectedProcedure
      .input(
        z.object({
          entityType: z.enum(["accounts", "groups"]),
          rangeA: dateRangeInput,
          mode: z.enum(["auto", "custom"]),
          rangeB: dateRangeInput.optional(),
          accountIds: z.array(z.number()).optional(),
          groupIds: z.array(z.number()).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const rangeB =
          input.mode === "auto" || !input.rangeB
            ? autoPreviousRange(input.rangeA)
            : input.rangeB;
        const rows =
          input.entityType === "accounts"
            ? await compareAccounts(tid, input.rangeA, rangeB, input.accountIds)
            : await compareGroups(tid, input.rangeA, rangeB, input.groupIds);
        return { rows, rangeA: input.rangeA, rangeB };
      }),
    sparkline: protectedProcedure
      .input(z.object({ accountIds: z.array(z.number()).optional() }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        return getAccountsSparkline(tid, input.accountIds);
      }),
  }),

  /* ----- AI Advisor (Round 3) ----- */
  ai: aiRouter,

  /* ----- Commission ----- */
  commission: router({
    grades: commissionViewProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      return listCommissionGrades(tid);
    }),
    createGrade: ownerProcedure
      .input(z.object({ gradeName: z.string().min(1), amount: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const id = await createCommissionGrade({ userId: tid, ...input });
        return { id };
      }),
    updateGrade: ownerProcedure
      .input(z.object({ id: z.number(), gradeName: z.string().optional(), amount: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const { id, ...patch } = input;
        await updateCommissionGrade(id, tid, patch);
        return { ok: true };
      }),
    removeGrade: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await deleteCommissionGrade(input.id, tid);
        return { ok: true };
      }),
    staff: commissionViewProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      return listCommissionStaff(tid);
    }),
    createStaff: ownerProcedure
      .input(z.object({ name: z.string().min(1), linkedUserId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const id = await createCommissionStaff({
          userId: tid,
          name: input.name,
          linkedUserId: input.linkedUserId ?? null,
          isActive: true,
        });
        return { id };
      }),
    updateStaff: ownerProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          linkedUserId: z.number().nullish(),
          isActive: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const { id, ...patch } = input;
        await updateCommissionStaff(id, tid, patch);
        return { ok: true };
      }),
    removeStaff: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await deleteCommissionStaff(input.id, tid);
        return { ok: true };
      }),
    clipAssignments: commissionViewProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      return listClipAssignments(tid);
    }),
    setClipAssignment: ownerProcedure
      .input(
        z.object({
          clipNumber: z.string().min(1),
          groupId: z.number().nullable(),
          staffId: z.number().nullable(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await upsertClipAssignment({ userId: tid, ...input });
        return { ok: true };
      }),
    clipGrades: commissionViewProcedure
      .input(z.object({ periodKey: z.string() }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        return listClipGrades(tid, input.periodKey);
      }),
    setClipGrade: commissionViewProcedure
      .input(
        z.object({
          clipNumber: z.string().min(1),
          groupId: z.number().nullable(),
          gradeId: z.number().nullable(),
          periodKey: z.string(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await upsertClipGrade({ userId: tid, ...input });
        return { ok: true };
      }),
    locks: commissionViewProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      return listCommissionLocks(tid);
    }),
    getLock: commissionViewProcedure
      .input(z.object({ periodKey: z.string() }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const lock = await getCommissionLock(tid, input.periodKey);
        if (!lock) return null;
        return { ...lock, snapshot: JSON.parse(lock.snapshotJson) as CommissionSnapshot };
      }),
    saveLock: ownerProcedure
      .input(
        z.object({
          periodKey: z.string(),
          periodLabel: z.string().optional(),
          snapshot: z.any(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await upsertCommissionLock({
          userId: tid,
          periodKey: input.periodKey,
          periodLabel: input.periodLabel ?? null,
          snapshotJson: JSON.stringify(input.snapshot),
        });
        return { ok: true };
      }),
    removeLock: ownerProcedure
      .input(z.object({ periodKey: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await deleteCommissionLock(tid, input.periodKey);
        return { ok: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
