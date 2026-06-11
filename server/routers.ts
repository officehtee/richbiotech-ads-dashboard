import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { aiRouter } from "./aiAdvisor";
import { alertsRouter } from "./alertsRouter";
import { scheduleRouter } from "./scheduleRouter";
import {
  CommissionSnapshot,
  ScalingScoreData,
} from "../shared/types";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  commissionViewProcedure,
  nonContentProcedure,
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
  getAdAgeCohort,
  getAdsetRows,
  getGroupsKpi,
  getSingleAccountTrend,
  getWeekStartCohort,
  resolveDateRange,
  getHubHourlyRollup,
  getHubLivePulse,
  getHubKpiSparklines,
  getHubHotPages,
  getRevenueVsSpendDaily,
  getGroupBreakdown,
  getTopAds,
  getSmartScalingRecommend,
  getAccountsTableWithTrend,
  buildTodayHourlyBars,
  buildWeeklyHeatmap,
  computeCurrentHourBaseline,
  computeUrgency,
  buildFunnel,
} from "./aggregator";
import { invokeLLM } from "./_core/llm";
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
  createInviteToken,
  findInviteByToken,
  findUserByCompanyCode,
  getAccountGroupsByUser,
  getAdAccountById,
  getAdAccountsByUser,
  getAdAccountsEnriched,
  getMyAccountsEnriched,
  listSelectableOwners,
  getAllGroupMembersForUser,
  getCommissionLock,
  getGroupMembers,
  getOwnerUserId,
  getScaleSettings,
  getShareLinkByToken,
  getUserById,
  listClipAssignments,
  listClipGrades,
  listInviteTokensByOwner,
  markInviteUsed,
  revokeInviteToken,
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
  updateUserNickname,
  updateAccountGroup,
  updateAdAccount,
  updateAccountTopup,
  updateCommissionGrade,
  updateCommissionStaff,
  updateScaleLog,
  updateShareLink,
  upsertClipAssignment,
  upsertClipGrade,
  upsertCommissionLock,
  upsertScaleSettings,
  listBusinessManagers,
  getBusinessManagerById,
  setOwnerForBmAccounts,
  findBusinessManagerByBmId,
  insertBusinessManager,
  updateBusinessManager,
  deleteBusinessManager,
  listBmLinks,
  findBmLink,
  insertBmLink,
  updateBmLinkLastSeen,
  markBmLinkRemoved,
  findAdAccountByMetaId,
  insertBmDiscoveryLog,
  listBmDiscoveryLogs,
  ensureAccountGroupMember,
  reassignAccountGroup,
  getDeepAdsRows,
  getScaleAmountMap,
  getCampaignFirstDates,
  getCampaignStatusMap,
  getCampaignIdsWithIssues,
  getAdIssuesByCampaign,
  getAccountGroupMap,
  getLatestSyncedAt,
  upsertAdManualMetric,
  updateCampaignQuality,
  updateAdPostType,
  listTrashedCampaigns,
  restoreCampaign,
  deleteCampaignPermanently,
  moveCampaignToTrash,
  getCampaignStatusOne,
  ensureCampaignStatusRow,
  markRequestReview,
  listSyncLogs,
  insertSyncLog,
} from "./db";
import {
  fetchAdsForAdset,
  fetchAdsetDailyInsights,
  testAdAccountToken,
  validateToken,
  fetchTokenExpiresAt,
  testBMConnection,
  discoverBMAccounts,
} from "./metaApi";
import { encrypt as encryptToken, decrypt as decryptToken, maskToken, previewTokenPrefix } from "./encryption";
import { syncOneBusinessManager } from "./bmSync";
import { computeDeepAdsDerived } from "./deepAdsMetrics";
import {
  computeBadge,
  classifyMetaStatus,
  shouldShowRejectRow,
  shouldShowClosedRow,
  todayString,
} from "./campaignStatus";
import {
  syncAdInsightsForAccounts,
  dateOffsetString,
  resolveResyncRange,
} from "./deepAdsSync";
import { syncStandaloneAccounts, mapCategoryToTokenStatus } from "./standaloneSync";

const tokenAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const generateToken = customAlphabet(tokenAlphabet, 24);
const generateCompanyCode = customAlphabet(tokenAlphabet, 8);

const dateRangeInput = z.object({
  preset: z.enum(["today", "yesterday", "3d", "7d", "14d", "30d", "custom"]),
  since: z.string().optional(),
  until: z.string().optional(),
});

async function tenantId(ctx: { user: { id: number; role: string; ownerId: number | null } }): Promise<number> {
  return resolveWorkspaceUserId(ctx.user.id, ctx.user.role, ctx.user.ownerId);
}

/**
 * เฟส 6: role ที่เห็น/จัดการ "ทุกบัญชี" ใน workspace (ไม่จำกัดความเป็นเจ้าของ)
 * staff = เห็น/จัดการเฉพาะบัญชีตัวเอง (ownerUserId === ctx.user.id)
 */
const OWNER_ROLES = ["admin", "owner", "ceo", "supervisor"] as const;
function isOwnerRole(role: string): boolean {
  return (OWNER_ROLES as readonly string[]).includes(role);
}

export const appRouter = router({
  system: systemRouter,
  schedule: scheduleRouter,
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
    /** Prompt D-fix: รายชื่อเจ้าของบัญชี สำหรับ dropdown ตัวกรองพนักงาน — ทุก role ใช้ได้ คืนเฉพาะ id+nickname (ไม่เปิด sensitive) */
    ownerOptions: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const owners = await listSelectableOwners(tid);
      return owners.map((u) => ({
        id: u.id,
        nickname: u.nickname ?? u.name ?? `User #${u.id}`,
      }));
    }),
    /** Prompt A: รายชื่อเจ้าของบัญชีที่เลือกได้ (ตัด role=pending) — ใช้กับ dropdown เจ้าของ */
    selectableOwners: ownerProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const owners = await listSelectableOwners(tid);
      return owners.map((u) => ({
        id: u.id,
        nickname: u.nickname ?? u.name ?? `User #${u.id}`,
        role: u.role,
      }));
    }),
    setRole: ownerProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(["ceo", "supervisor", "content", "staff", "pending"]),
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
    /** ตั้ง/แก้ชื่อเล่นของผู้ใช้ในเวิร์กสเปซ — ไม่ถูกทับตอน login (owner/ceo/supervisor) */
    updateNickname: ownerProcedure
      .input(
        z.object({
          userId: z.number(),
          nickname: z.string().max(255).nullable(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const target = await getUserById(input.userId);
        if (!target) throw new TRPCError({ code: "NOT_FOUND" });
        // อนุญาตเฉพาะ user ใน workspace เดียวกัน (เป็น owner เอง หรือสมาชิกของ owner)
        if (target.id !== tid && target.ownerId !== tid) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const trimmed = input.nickname?.trim() ?? "";
        await updateUserNickname(input.userId, trimmed === "" ? null : trimmed);
        return { ok: true };
      }),
  }),

  /* ----- Invite Tokens (Magic Invite Link) ----- */
  invites: router({
    /** ตรวจสอบลิงก์โดยไม่ต้อง login (public) — ใช้ในหน้า /invite/:token ก่อนพา login */
    verify: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .query(async ({ input }) => {
        const inv = await findInviteByToken(input.token);
        if (!inv) {
          return { ok: false as const, reason: "not_found" as const };
        }
        if (inv.revokedAt) {
          return { ok: false as const, reason: "revoked" as const, role: inv.role, label: inv.label };
        }
        if (inv.usedAt) {
          return { ok: false as const, reason: "used" as const, role: inv.role, label: inv.label };
        }
        if (new Date(inv.expiresAt).getTime() < Date.now()) {
          return { ok: false as const, reason: "expired" as const, role: inv.role, label: inv.label };
        }
        return {
          ok: true as const,
          role: inv.role,
          label: inv.label,
          expiresAt: inv.expiresAt,
        };
      }),

    /** Owner ออกลิงก์เชิญใหม่ — อายุ 7 วัน */
    create: ownerProcedure
      .input(
        z.object({
          role: z.enum(["ceo", "supervisor", "content", "staff"]),
          label: z.string().max(255).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const row = await createInviteToken({
          token,
          ownerId: tid,
          role: input.role,
          label: input.label?.trim() || null,
          expiresAt,
        });
        return { ok: true, token, invite: row };
      }),

    /** Owner ดู list ลิงก์ที่ออกไปแล้ว */
    list: ownerProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      return listInviteTokensByOwner(tid);
    }),

    /** Owner ปิดลิงก์ (revoke) */
    revoke: ownerProcedure
      .input(z.object({ inviteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await revokeInviteToken(input.inviteId, tid);
        return { ok: true };
      }),

    /** ผู้รับเชิญ login แล้วมา redeem token — protected (ต้อง login ก่อน) */
    redeem: protectedProcedure
      .input(z.object({ token: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const invite = await findInviteByToken(input.token);
        if (!invite) {
          throw new TRPCError({ code: "NOT_FOUND", message: "ลิงก์เชิญไม่ถูกต้อง" });
        }
        if (invite.revokedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "ลิงก์เชิญถูกยกเลิกแล้ว" });
        }
        if (invite.usedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "ลิงก์เชิญถูกใช้ไปแล้ว" });
        }
        if (new Date(invite.expiresAt).getTime() < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "ลิงก์เชิญหมดอายุแล้ว" });
        }
        // ตั้ง role + ownerId ตาม invite
        await setUserRole(ctx.user.id, invite.role, invite.ownerId);
        await markInviteUsed(invite.id, ctx.user.id);
        return { ok: true, role: invite.role, ownerId: invite.ownerId };
      }),
  }),

  /* ----- Ad Accounts ----- */
  accounts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const accounts = await getAdAccountsEnriched(tid);
      // Prompt A: บัญชีเดี่ยว (bmId == null) → ส่ง token เต็ม (ผู้ใช้ยอมรับความเสี่ยงเพื่อปุ่ม Copy)
      //          บัญชีจาก BM → ไม่ส่ง token (ใช้ token ของ BM, คอลัมน์แสดง —)
      return accounts.map((a) => {
        const isSingle = a.bmId == null;
        return {
          ...a,
          accessToken: isSingle ? a.accessToken : "",
          tokenPreview: isSingle ? previewTokenPrefix(a.accessToken) : "",
        };
      });
    }),
    create: ownerProcedure
      .input(
        z.object({
          adAccountId: z.string().regex(/^act_\d+$/, "Format: act_123456789"),
          accessToken: z.string().min(20),
          // Prompt A: ป๊อปเพิ่มบัญชี 6 ฟิลด์ — กลุ่มสินค้า/เจ้าของ/การชำระเงิน/Limit
          groupId: z.number().int().positive().nullish(),
          ownerUserId: z.number().int().positive().nullish(),
          paymentType: z.enum(["card", "prepaid"]).nullish(),
          limitAmount: z.number().int().min(0).nullish(),
          nickname: z.string().optional(),
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
        // validate ownerUserId อยู่ใน workspace และไม่ใช่ pending
        if (input.ownerUserId != null) {
          const owners = await listSelectableOwners(tid);
          if (!owners.some((o) => o.id === input.ownerUserId)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "เจ้าของบัญชีไม่ถูกต้อง" });
          }
        }
        // Fetch token expiry from Meta (graceful: undefined = skip)
        const tokenExpiresAt = await fetchTokenExpiresAt(input.accessToken);
        const id = await createAdAccount({
          userId: tid,
          adAccountId: input.adAccountId,
          accessToken: input.accessToken,
          nickname: input.nickname ?? null,
          ownerUserId: input.ownerUserId ?? null,
          paymentType: input.paymentType ?? null,
          limitAmount: input.limitAmount ?? null,
          tokenStatus: "active",
          tokenExpiresAt: tokenExpiresAt ?? undefined,
          roasTarget: 2.0,
          isActive: true,
        });
        // ผูกเข้ากลุ่มสินค้า (ถ้าเลือก)
        if (input.groupId != null) {
          await ensureAccountGroupMember(input.groupId, id);
        }
        // Auto-sync ทันทีหลังเพิ่มบัญชีใหม่ (ดึงข้อมูล 7 วันย้อนหลัง)
        try {
          const newAcct = await getAdAccountById(id, tid);
          if (newAcct) {
            const since = dateOffsetString(6);
            const until = dateOffsetString(0);
            await syncAdInsightsForAccounts([newAcct], since, until, tid);
          }
        } catch {
          // ไม่ block การ return ถ้า sync fail — ข้อมูลจะมาในรอบ cron ถัดไป
        }
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
          // Prompt A: แก้ไข เจ้าของ/การชำระเงิน/Limit (รวมถึงบัญชีจาก BM)
          ownerUserId: z.number().int().positive().nullish(),
          paymentType: z.enum(["card", "prepaid"]).nullish(),
          limitAmount: z.number().int().min(0).nullish(),
          groupId: z.number().int().positive().nullish(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const { id, groupId, ...patch } = input;
        // validate owner ถ้ามีการส่งมาและไม่ใช่ null
        if (patch.ownerUserId != null) {
          const owners = await listSelectableOwners(tid);
          if (!owners.some((o) => o.id === patch.ownerUserId)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "เจ้าของบัญชีไม่ถูกต้อง" });
          }
        }
        await updateAdAccount(id, tid, patch);
        // ย้ายกลุ่มสินค้า (ถ้าส่ง groupId มา — รวมถึง null = ถอดออกทุกกลุ่ม)
        if (groupId !== undefined) {
          await reassignAccountGroup(tid, id, groupId ?? null);
        }
        return { ok: true };
      }),
    remove: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await deleteAdAccount(input.id, tid);
        return { ok: true };
      }),
    /**
     * ทดสอบ Token + Ad Account จริงกับ Meta Graph API
     * คืนสถานะ + raw error + คำแปลไทย + คำแนะนำการแก้
     */
    testToken: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const acc = await getAdAccountById(input.id, tid);
        if (!acc) {
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบบัญชีโฆษณา" });
        }
        if (!acc.accessToken) {
          return {
            ok: false,
            category: "token_invalid" as const,
            title: "ยังไม่ได้บันทึก Access Token",
            message: "บัญชีนี้ยังไม่มี Access Token ในระบบ",
            suggestion: "ไปที่ปุ่ม แก้ไข ของบัญชีนี้ แล้วใส่ Token",
            testedAt: Date.now(),
          };
        }
        const result = await testAdAccountToken(acc.adAccountId, acc.accessToken);
        // Prompt F: เขียนผลลง DB ให้คอลัมน์สถานะตรงกับ popup
        // - เฉพาะบัญชีเดี่ยว (bmId == null) เพราะบัญชีใน BM ใช้สถานะจาก BM ไม่ใช่ tokenStatus
        // - transient error (rate_limit/network/unknown) → mapped = null → คงสถานะเดิม ไม่เขียนทับ
        if (acc.bmId == null) {
          const mapped = mapCategoryToTokenStatus(result.category);
          const updates: Record<string, unknown> = {};
          if (mapped !== null && mapped !== acc.tokenStatus) updates.tokenStatus = mapped;
          // Refresh tokenExpiresAt when token is still valid
          if (result.ok) {
            const exp = await fetchTokenExpiresAt(acc.accessToken);
            if (exp !== undefined) updates.tokenExpiresAt = exp;
          }
          if (Object.keys(updates).length > 0) {
            await updateAdAccount(input.id, tid, updates as any);
          }
        }
        return result;
      }),
    /**
     * Manual trigger: เช็ก Token บัญชีเดี่ยวทั้งหมด "ใน workspace นี้" เดี๋ยวนี้
     * (ไม่ต้องรอ cron รอบถัดไป) — scope เฉพาะ tenant ของ owner ที่กด
     */
    checkStandaloneTokensNow: ownerProcedure.mutation(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const startedAt = Date.now();
      const summary = await syncStandaloneAccounts(300, tid);
      // บันทึกประวัติการเช็ก Token (jobType=tokenCheck)
      // existingAccounts = บัญชีที่เช็ก, failed = บัญชีที่เกิด exception
      // status: failed ทั้งหมด -> failed, มีบาง fail -> partial, ไม่มี -> success
      try {
        const status =
          summary.failed === 0
            ? "success"
            : summary.checked > summary.failed
              ? "partial"
              : "failed";
        await insertSyncLog({
          jobType: "tokenCheck",
          tenants: 1,
          newAccounts: 0,
          existingAccounts: summary.checked,
          rowsSynced: summary.changed, // จำนวนบัญชีที่อัปเดตสถานะ
          previewsRefreshed: 0,
          failed: summary.failed,
          durationMs: Date.now() - startedAt,
          status,
        });
      } catch {
        /* ignore log failure */
      }
      return summary;
    }),
    /**
     * Prompt I (เฟส 1.6): หน้า "บัญชีของฉัน" สำหรับพนักงาน (staff)
     * กรองเฉพาะบัญชีที่ ownerUserId === ctx.user.id ภายใน tenant เดียวกัน
     * ไม่ส่ง accessToken กลับไปฝั่ง client เด็ดขาด
     */
    myAccounts: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      // เฟส 6: OWNER_ROLES เห็นทุกบัญชีใน tenant / staff เห็นเฉพาะบัญชีตัวเอง
      const seeAll = isOwnerRole(ctx.user.role);
      return getMyAccountsEnriched(tid, ctx.user.id, seeAll);
    }),
    /**
     * Prompt I: แก้เฉพาะ "การชำระเงิน" + "Limit" ของบัญชีตัวเองเท่านั้น
     * Security guard: ต้องเป็นเจ้าของ (ownerUserId === ctx.user.id) และอยู่ใน tenant เดียวกัน
     * มิฉะนั้น FORBIDDEN — ไม่แตะ field อื่น (nickname/token/owner/group ฯลฯ)
     */
    updateMyAccount: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          paymentType: z.enum(["card", "prepaid"]).nullish(),
          limitAmount: z.number().int().min(0).nullish(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const target = await getAdAccountById(input.id, tid);
        // เฟส 6: tenant guard เสมอ (getAdAccountById กรอง tid อยู่แล้ว) + role-based ownership
        // OWNER_ROLES แก้ได้ทุกบัญชีใน tenant / staff แก้ได้เฉพาะบัญชีตัวเอง
        if (!target || (!isOwnerRole(ctx.user.role) && target.ownerUserId !== ctx.user.id)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "คุณไม่มีสิทธิ์แก้ไขบัญชีนี้",
          });
        }
        await updateAdAccount(input.id, tid, {
          paymentType: input.paymentType ?? null,
          limitAmount: input.limitAmount ?? null,
        });
        return { ok: true };
      }),
    /**
     * เฟส 6: อัปเดตข้อมูลเติมเงิน (topup) — กรอกมือ 4 ค่า
     * - OWNER_ROLES แก้ได้ทุกบัญชีใน tenant / staff แก้ได้เฉพาะบัญชีตัวเอง
     * - เช็ค tenant เสมอ (กันแก้ข้าม workspace)
     * - เฉพาะบัญชี prepaid (card ไม่มีการเติมเงิน)
     * - topupLastDate รับเป็น UTC ms timestamp (number) จาก client → แปลงเป็น Date
     */
    updateTopup: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          topupLastDate: z.number().int().nullish(), // UTC ms
          topupDailySpend: z.number().int().min(0).nullish(),
          topupUsed: z.number().int().min(0).nullish(),
          topupBalance: z.number().int().min(0).nullish(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const target = await getAdAccountById(input.id, tid);
        if (!target || (!isOwnerRole(ctx.user.role) && target.ownerUserId !== ctx.user.id)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "คุณไม่มีสิทธิ์แก้ไขข้อมูลเติมเงินของบัญชีนี้",
          });
        }
        if (target.paymentType !== "prepaid") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "บัญชีนี้ไม่ใช่แบบเติมเงิน (prepaid) จึงตั้งค่าเติมเงินไม่ได้",
          });
        }
        await updateAccountTopup(input.id, tid, {
          topupLastDate: input.topupLastDate != null ? new Date(input.topupLastDate) : null,
          topupDailySpend: input.topupDailySpend ?? null,
          topupUsed: input.topupUsed ?? null,
          topupBalance: input.topupBalance ?? null,
        });
        return { ok: true };
      }),
  }),

  /* ----- Business Managers (Round 7.23 — Auto-Discovery) ----- */
  bm: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const bms = await listBusinessManagers(tid);
      const out = await Promise.all(
        bms.map(async (bm) => {
          const links = await listBmLinks(bm.id);
          const activeLinks = links.filter((l) => l.status === "active");
          let tokenPreview = "•••••";
          try {
            tokenPreview = maskToken(decryptToken(bm.accessTokenEncrypted));
          } catch {
            // ignore decrypt failure
          }
          return {
            id: bm.id,
            bmId: bm.bmId,
            name: bm.name,
            tokenPreview, // มาสก์จาก token จริงที่ decrypt ออกมา (ไม่ส่งตัวเต็ม — ใช้ bm.getToken ตอน Copy)
            accountGroupId: bm.accountGroupId,
            defaultOwnerUserId: bm.defaultOwnerUserId, // Prompt A: ใช้ในป๊อปแก้ไข BM
            status: bm.status,
            lastSyncAt: bm.lastSyncAt,
            tokenExpiresAt: bm.tokenExpiresAt,
            accountCount: activeLinks.length,
            removedCount: links.length - activeLinks.length,
            createdAt: bm.createdAt,
          };
        }),
      );
      return out;
    }),

    testConnection: ownerProcedure
      .input(
        z.object({
          bmId: z.string().regex(/^\d{6,}$/, "BM ID ต้องเป็นตัวเลข 6 หลักขึ้นไป"),
          accessToken: z.string().min(20),
        }),
      )
      .mutation(async ({ input }) => {
        return await testBMConnection(input.bmId, input.accessToken);
      }),

    discover: ownerProcedure
      .input(
        z.object({
          bmId: z.string().regex(/^\d{6,}$/),
          accessToken: z.string().min(20),
        }),
      )
      .mutation(async ({ input }) => {
        return await discoverBMAccounts(input.bmId, input.accessToken);
      }),

    create: ownerProcedure
      .input(
        z.object({
          bmId: z.string().regex(/^\d{6,}$/),
          name: z.string().min(1),
          accessToken: z.string().min(20),
          accountGroupId: z.number().int().positive(),
          ownerUserId: z.number().int().positive().nullish(), // Prompt A: เจ้าของ default ของบัญชีย่อยจาก BM
          selectedAccounts: z
            .array(
              z.object({
                bmAdAccountId: z.string().regex(/^act_\d+$/),
                name: z.string(),
                ownership: z.enum(["owned", "client"]),
                accountStatus: z.number().int(),
                currency: z.string().optional(),
                timezone: z.string().optional(),
                roasTarget: z.number().min(0).max(20).optional(),
              }),
            )
            .min(1, "ต้องเลือกอย่างน้อย 1 บัญชี"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);

        // กันซ้ำ: BM นี้เคยเพิ่มไว้แล้วหรือยัง
        const existing = await findBusinessManagerByBmId(tid, input.bmId);
        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Business Manager นี้ถูกเพิ่มไว้แล้ว (id=${existing.id})`,
          });
        }

        // validate ownerUserId
        if (input.ownerUserId != null) {
          const owners = await listSelectableOwners(tid);
          if (!owners.some((o) => o.id === input.ownerUserId)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "เจ้าของบัญชีไม่ถูกต้อง" });
          }
        }

        // เข้ารหัส token
        const encrypted = encryptToken(input.accessToken);

        const newBmId = await insertBusinessManager({
          userId: tid,
          bmId: input.bmId,
          name: input.name,
          accessTokenEncrypted: encrypted,
          accountGroupId: input.accountGroupId,
          defaultOwnerUserId: input.ownerUserId ?? null, // Prompt A: จำไว้ใส่บัญชีใหม่ตอน sync
          createdBy: ctx.user.id,
          status: "active",
          lastSyncAt: new Date(),
        });

        let createdAccounts = 0;
        let linkedExisting = 0;

        for (const sel of input.selectedAccounts) {
          // หา ad account เดิมในระบบหรือยัง
          let acct = await findAdAccountByMetaId(tid, sel.bmAdAccountId);
          if (!acct) {
            const acctId = await createAdAccount({
              userId: tid,
              adAccountId: sel.bmAdAccountId,
              accessToken: input.accessToken, // BM token ใช้ดึง insight ได้เลย (read-only)
              nickname: sel.name,
              pageName: null,
              phaseName: null,
              ownerUserId: input.ownerUserId ?? null, // Prompt A: บัญชีย่อยทุกตัวได้เจ้าของเดียวกัน
              tokenStatus: "active",
              roasTarget: sel.roasTarget ?? 2.0,
              isActive: true,
              bmId: newBmId,
              discoveredAt: new Date(),
            } as any);
            acct = { id: acctId } as any;
            createdAccounts += 1;
          } else {
            // Prompt E (ตัวเลือก A): บัญชีเดิมก็ทับเจ้าของตาม default ของ BM
            if (input.ownerUserId !== undefined) {
              await updateAdAccount((acct as any).id, tid, {
                ownerUserId: input.ownerUserId ?? null,
              });
            }
            linkedExisting += 1;
          }

          // ผูกเข้า link table
          if (acct) {
            const existingLink = await findBmLink(newBmId, (acct as any).id);
            if (!existingLink) {
              await insertBmLink({
                bmId: newBmId,
                adAccountId: (acct as any).id,
                type: sel.ownership,
                status: "active",
                discoveredAt: new Date(),
                lastSeenAt: new Date(),
              });
            }
            // ผูกเข้ากลุ่มสินค้า
            await ensureAccountGroupMember(input.accountGroupId, (acct as any).id);
          }
        }

        // log discovery
        await insertBmDiscoveryLog({
          bmId: newBmId,
          userId: tid,
          runAt: new Date(),
          status: "success",
          triggerSource: "initial",
          foundCount: input.selectedAccounts.length,
          addedCount: createdAccounts,
          linkedCount: linkedExisting,
          removedCount: 0,
        });

        return { id: newBmId, createdAccounts, linkedExisting };
      }),

    detail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const bm = await getBusinessManagerById(input.id, tid);
        if (!bm) throw new TRPCError({ code: "NOT_FOUND" });
        const links = await listBmLinks(bm.id);
        const logs = await listBmDiscoveryLogs(bm.id, 25);

        // join ข้อมูล ad account เข้า link เพื่อให้หน้า BM Detail แสดงชื่อ/รหัสได้
        const accounts = await getAdAccountsByUser(tid);
        const acctMap = new Map<number, (typeof accounts)[number]>(
          accounts.map((a) => [a.id, a]),
        );
        const enrichedLinks = links.map((l) => {
          const a = acctMap.get(l.adAccountId);
          return {
            id: l.id,
            adAccountId: l.adAccountId,
            type: l.type,
            status: l.status,
            discoveredAt: l.discoveredAt,
            lastSeenAt: l.lastSeenAt,
            metaAdAccountId: a?.adAccountId ?? null,
            nickname: a?.nickname ?? null,
            isActive: a?.isActive ?? null,
          };
        });
        return {
          bm: {
            id: bm.id,
            bmId: bm.bmId,
            name: bm.name,
            accountGroupId: bm.accountGroupId,
            status: bm.status,
            lastSyncAt: bm.lastSyncAt,
            tokenExpiresAt: bm.tokenExpiresAt,
            createdAt: bm.createdAt,
          },
          links: enrichedLinks,
          logs,
        };
      }),

    sync: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const bm = await getBusinessManagerById(input.id, tid);
        if (!bm) throw new TRPCError({ code: "NOT_FOUND" });
        const outcome = await syncOneBusinessManager(bm, tid, "manual");
        if (!outcome.ok) return { ok: false as const, error: outcome.error };
        return {
          ok: true as const,
          newCount: outcome.newCount,
          existingCount: outcome.existingCount,
          mergedCount: outcome.mergedCount,
          removedCount: outcome.removedCount,
          totalFound: outcome.totalFound,
        };
      }),
    /**
     * Prompt G: Manual trigger — Sync ทุก BM ของ workspace นี้เดี๋ยวนี้ (ไม่ต้องรอ cron)
     * - ทยอยทีละ BM (sequential) เพื่อกัน Meta rate limit
     * - แต่ละ BM อัปเดต businessManagers.status ทันที (active/blocked/token_expired)
     *   → คอลัมน์สถานะบัญชีย่อยในตารางอัปเดตตาม (effectiveStatus คำนวณจาก BM)
     * - บันทึก syncLog jobType=bm หนึ่งรายการสรุปทั้งรอบ
     */
    syncAllNow: ownerProcedure.mutation(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const bms = await listBusinessManagers(tid);
      const startedAt = Date.now();
      let totalNew = 0;
      let totalRemoved = 0;
      let totalMerged = 0;
      let failed = 0;
      for (const bm of bms) {
        try {
          const outcome = await syncOneBusinessManager(bm, tid, "manual");
          if (!outcome.ok) {
            failed += 1;
          } else {
            totalNew += outcome.newCount;
            totalRemoved += outcome.removedCount;
            totalMerged += outcome.mergedCount;
          }
        } catch {
          failed += 1;
        }
      }
      // บันทึกประวัติการ sync BM (jobType=bm)
      try {
        const status =
          failed === 0
            ? "success"
            : bms.length > failed
              ? "partial"
              : "failed";
        await insertSyncLog({
          jobType: "bm",
          tenants: 1,
          newAccounts: totalNew, // บัญชีใหม่ที่ค้นพบ
          existingAccounts: bms.length, // จำนวน BM ที่ประมวลผล
          rowsSynced: 0, // BM sync ไม่ดึง ad insights
          previewsRefreshed: 0,
          failed,
          durationMs: Date.now() - startedAt,
          status,
        });
      } catch {
        /* ignore log failure */
      }
      return {
        bmTotal: bms.length,
        newAccounts: totalNew,
        removedAccounts: totalRemoved,
        mergedAccounts: totalMerged,
        failed,
      };
    }),
    /**
     * Prompt A: ดึง token เต็มของ BM (decrypt) — ใช้ตอนกดปุ่ม Copy เท่านั้น (ไม่ส่งมากับ bm.list)
     */
    getToken: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const bm = await getBusinessManagerById(input.id, tid);
        if (!bm) throw new TRPCError({ code: "NOT_FOUND" });
        let token = "";
        try {
          token = decryptToken(bm.accessTokenEncrypted);
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "ถอดรหัส Token ไม่สำเร็จ" });
        }
        return { token };
      }),

    /**
     * Prompt A: แก้ไข BM — ชื่อ / Token (re-encrypt) / กลุ่มสินค้า / เจ้าของ default
     */
    update: ownerProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          accessToken: z.string().min(20).optional(), // ถ้าส่งมา = เปลี่ยน token ใหม่
          accountGroupId: z.number().int().positive().optional(),
          defaultOwnerUserId: z.number().int().positive().nullish(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const bm = await getBusinessManagerById(input.id, tid);
        if (!bm) throw new TRPCError({ code: "NOT_FOUND" });
        if (input.defaultOwnerUserId != null) {
          const owners = await listSelectableOwners(tid);
          if (!owners.some((o) => o.id === input.defaultOwnerUserId)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "เจ้าของบัญชีไม่ถูกต้อง" });
          }
        }
        const patch: Record<string, unknown> = {};
        if (input.name !== undefined) patch.name = input.name;
        if (input.accountGroupId !== undefined) patch.accountGroupId = input.accountGroupId;
        if (input.defaultOwnerUserId !== undefined)
          patch.defaultOwnerUserId = input.defaultOwnerUserId ?? null;
        if (input.accessToken !== undefined) {
          patch.accessTokenEncrypted = encryptToken(input.accessToken);
        }
        await updateBusinessManager(input.id, patch, tid);
        // Prompt E (ตัวเลือก A): ถ้าแก้ default owner → ทับ ownerUserId ของบัญชีย่อยทุกตัวที่ผูก BM นี้
        if (input.defaultOwnerUserId !== undefined) {
          await setOwnerForBmAccounts(input.id, tid, input.defaultOwnerUserId ?? null);
        }
        return { ok: true };
      }),

    delete: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await deleteBusinessManager(input.id, tid);
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

    /* Hub 2.0: realtime activity (1h messaging + 24h bars + urgency badge) */
    realtime: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const rows = await getHubHourlyRollup(tid);
      const now = new Date();
      const todayIso = now.toISOString().slice(0, 10);
      const currentHour = now.getUTCHours();
      const todayBars = buildTodayHourlyBars(rows, todayIso);
      const { current, baseline, deltaPct } = computeCurrentHourBaseline(rows, todayIso, currentHour);
      const urgency = computeUrgency(current, baseline);
      const messagingLast1h = current;
      const messagingToday = todayBars.reduce((s, b) => s + b.messaging, 0);
      const messagingPerHourNow = current;
      return {
        messagingLast1h,
        messagingToday,
        messagingPerHourNow,
        baseline,
        deltaPct,
        urgency,
        todayBars,
        currentHour,
      };
    }),

    /* Hub 2.0: 7d × 24h heatmap */
    hourlyHeatmap: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const rows = await getHubHourlyRollup(tid);
      return buildWeeklyHeatmap(rows);
    }),

    /* Round 7.18: Live Hour Pulse — 24 hourly bars + motivation (Sales view) */
    liveHourPulse: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      return getHubLivePulse(tid);
    }),

    /* Hub 2.0: top 5 hot pages by messaging today */
    hotPages: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      return getHubHotPages(tid);
    }),

    /* Hub 2.0: 7-day sparklines per KPI */
    kpiSparklines: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      return getHubKpiSparklines(tid);
    }),

    /* Hub 2.0: 5-step conversion funnel */
    funnel: protectedProcedure
      .input(z.object({ dateRange: dateRangeInput }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const kpis = await getAccountsKpi(tid, input.dateRange);
        const tot = kpis.reduce(
          (acc, k) => {
            acc.impressions += k.impressions;
            acc.clicks += k.clicks;
            acc.messaging += k.messaging;
            acc.purchases += k.purchases;
            acc.purchaseValue += k.purchaseValue;
            return acc;
          },
          { impressions: 0, clicks: 0, messaging: 0, purchases: 0, purchaseValue: 0 },
        );
        return buildFunnel(tot);
      }),

    /* Round 7: revenue vs spend daily series */
    revenueVsSpend: protectedProcedure
      .input(z.object({ dateRange: dateRangeInput }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        return getRevenueVsSpendDaily(tid, input.dateRange);
      }),

    /* Round 7: group breakdown (Spend/ROAS by product group) */
    groupBreakdown: protectedProcedure
      .input(z.object({ dateRange: dateRangeInput }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        return getGroupBreakdown(tid, input.dateRange);
      }),

    /* Round 7: top performing ads */
    topAds: protectedProcedure
      .input(z.object({ dateRange: dateRangeInput }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        return getTopAds(tid, input.dateRange);
      }),

    /* Round 7: smart scaling recommendations (5 adsets + from→to) */
    smartScalingRecommend: protectedProcedure
      .input(z.object({ dateRange: dateRangeInput }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const raw = await getScaleSettings(tid);
        const settings = {
          increaseSmallPercent: raw?.increaseSmallPercent ?? 20,
          increaseLargePercent: raw?.increaseLargePercent ?? 50,
          decreaseSmallPercent: raw?.decreaseSmallPercent ?? 20,
          decreaseLargePercent: raw?.decreaseLargePercent ?? 30,
        };
        return getSmartScalingRecommend(tid, input.dateRange, settings);
      }),

    /* Round 7: full accounts table with 14-day trend + status */
    accountsTable: protectedProcedure
      .input(z.object({ dateRange: dateRangeInput }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        return getAccountsTableWithTrend(tid, input.dateRange);
      }),

    /* Hub 2.0: AI insight (2-3 sentences) — returns null if LLM unavailable */
    aiInsight: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      try {
        const today = { preset: "7d" as const };
        const kpis = await getAccountsKpi(tid, today);
        const hot = await getHubHotPages(tid);
        const totSpend = kpis.reduce((s, k) => s + k.spend, 0);
        const totMsg = kpis.reduce((s, k) => s + k.messaging, 0);
        const totRevenue = kpis.reduce((s, k) => s + k.purchaseValue, 0);
        const roas = totSpend > 0 ? totRevenue / totSpend : 0;
        const top = hot[0];
        const prompt = `ข้อมูล 7 วันล่าสุด:\n- Spend: ฿${totSpend.toFixed(0)}\n- คนทักรวม: ${totMsg}\n- Revenue: ฿${totRevenue.toFixed(0)}\n- ROAS: ${roas.toFixed(2)}x\n- เพจมาแรงสุด: ${top?.pageName ?? "-"} (${top?.messagingToday ?? 0} ทักวันนี้ เทียบ baseline ${Math.round(top?.deltaPct ?? 0)}%)\nวิเคราะห์ + แนะนำ action`;
        const resp = await invokeLLM({
          messages: [
            { role: "system", content: "คุณเป็น Meta Ads analyst สรุปข้อมูล performance เป็นภาษาไทย 2-3 ประโยค focus actionable insight ห้ามเกริ่นนำ ตอบกระชับตรงประเด็น" },
            { role: "user", content: prompt },
          ],
        });
        const text = (resp as any)?.choices?.[0]?.message?.content;
        if (typeof text === "string" && text.length > 0) return { text, generatedAt: Date.now() };
        return null;
      } catch (e) {
        console.warn("[hub.aiInsight] failed:", (e as Error).message);
        return null;
      }
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

  /* ----- Deep Ads Analysis (Round 7.24) — ad-day grain ----- */
  deepAds: router({
    list: protectedProcedure
      .input(
        z.object({
          dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          search: z.string().optional(),
          accountId: z.number().optional(),
          groupId: z.number().optional(),
          /** Prompt D: ตัวกรองเจ้าของบัญชี */
          ownerUserId: z.number().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const [rows, scaleMap, campaignFirstDates, statusMap, accounts, groups, groupMap, campaignsWithIssues] =
          await Promise.all([
            getDeepAdsRows(tid, input.dateFrom, input.dateTo, {
              search: input.search,
              accountId: input.accountId,
              groupId: input.groupId,
              ownerUserId: input.ownerUserId,
            }),
            getScaleAmountMap(tid, input.dateFrom, input.dateTo),
            getCampaignFirstDates(tid),
            getCampaignStatusMap(tid),
            getAdAccountsByUser(tid),
            getAccountGroupsByUser(tid),
            getAccountGroupMap(tid),
            // Phase 3C (B): ชุด campaignId ที่มี ad ใดมี issues → ใช้ append hasIssues
            getCampaignIdsWithIssues(tid),
          ]);
        const todayObj = new Date();
        const today = todayString(todayObj);

        // Phase 4: ชุด campaignId ที่อยู่ในถังขยะ (trashedAt != null) — ต้องกรองออกจากตารางหลัก
        const trashedSet = new Set<string>();
        for (const cs of Array.from(statusMap.values())) {
          if (cs.trashedAt != null) trashedSet.add(String(cs.campaignId));
        }
        // กรองจุด 1/2: real rows (spend>0) ที่แคมเปญอยู่ในถัง → ไม่แสดง
        const visibleRows = rows.filter(
          (r) => !(r.campaignId && trashedSet.has(String(r.campaignId))),
        );

        // enrich each real (spend>0) row with derived fields + status badge
        const enriched = visibleRows.map((r) => {
          // Orders / ยอดขาย / ROAS ดึงจาก Meta อัตโนมัติ (omni_purchase / purchase value)
          // Round 7.36: ค่าคลิก = cost_per_action_type, ROAS = purchase_roas (จาก Meta โดยตรง)
          const derived = computeDeepAdsDerived({
            ...r,
            metaCostPerMessage: r.costPerMessage,
            metaPurchaseRoas: r.purchaseRoas,
          });
          // prev day key
          const d = new Date(`${r.date}T00:00:00Z`);
          d.setUTCDate(d.getUTCDate() - 1);
          const prevDate = d.toISOString().slice(0, 10);
          const prevDayScale = scaleMap.get(`${r.adId}|${prevDate}`) ?? null;
          const campaignFirstDate = r.campaignId
            ? campaignFirstDates.get(String(r.campaignId)) ?? null
            : null;
          // Round 7.35: ป้ายสถานะจาก campaignStatus (ถ้ามี)
          const cs = r.campaignId ? statusMap.get(String(r.campaignId)) : undefined;
          const statusBadge = cs
            ? computeBadge(cs.effectiveStatus, cs.approvedAt, cs.rejectedAt, todayObj)
            : "NORMAL";
          return {
            ...r,
            costPerOrder: derived.costPerOrder,
            costPerClick: derived.costPerClick,
            costPerMessage: derived.costPerMessage,
            chatToOrderRate: derived.chatToOrderRate,
            roas: derived.roas,
            adsSpendPct: derived.adsSpendPct,
            prevDayScale,
            campaignFirstDate,
            statusBadge,
            effectiveStatus: cs?.effectiveStatus ?? null,
            approvedAt: cs?.approvedAt ?? null,
            rejectedAt: cs?.rejectedAt ?? null,
            // Phase 3C (B): มี ad-level issues ของ campaign นี้ไหม → โชว์ไอคอน (i)
            hasIssues: r.campaignId
              ? campaignsWithIssues.has(String(r.campaignId))
              : false,
            // เฟส 3B: สถานะคำขอโฆษณา (toggle) — แถวจริงก็มีได้ (ถ้าถูก reject)
            requestReviewAt: cs?.requestReviewAt ?? null,
            // Phase 5: คุณภาพ ads ระดับแคมเปญ (จาก campaignStatus.quality)
            campaignQuality: cs?.quality ?? null,
            isNoSpendRow: false as const,
          };
        });

        // ----- Round 7.35: synthetic rows สำหรับแคมเปญ WAIT/REJECT (spend=0) -----
        // แคมเปญพวกนี้ไม่อยู่ใน insights (ไม่มี spend) → สร้างแถววันที่ปัจจุบัน
        // เงื่อนไขโชว์: WAIT (รออนุมัติ) หรือ REJECT ที่ยังไม่ครบ 5 วัน และไม่ rejected_expired
        // โชว์เฉพาะเมื่อช่วงวันที่ที่ดูครอบคลุม "วันนี้" (today อยู่ใน [dateFrom,dateTo])
        const showToday =
          input.dateFrom <= today && today <= input.dateTo;
        const accountById = new Map(accounts.map((a) => [a.id, a]));
        const groupById = new Map(groups.map((g) => [g.id, g]));
        // campaignId → accountId (จาก campaignStatus.accountId)
        // campaignId ที่มีแถว spend>0 อยู่แล้วในช่วงนี้ → ไม่ต้องสร้าง synthetic
        const realCampaignIds = new Set(
          rows.map((r) => String(r.campaignId)).filter(Boolean),
        );
        const syntheticRows: typeof enriched = [];
        if (showToday) {
          let synthId = -1;
          for (const cs of Array.from(statusMap.values())) {
            // กรองจุด 2/2: แคมเปญที่อยู่ในถังขยะ → ไม่สร้าง synthetic row
            if (cs.trashedAt != null) continue;
            const kind = classifyMetaStatus(cs.effectiveStatus);
            const isWait = kind === "wait";
            const isReject = shouldShowRejectRow(
              cs.effectiveStatus,
              cs.rejectedAt,
              todayObj,
            );
            // Phase 2: closed (PAUSED/ARCHIVED) + ไม่อยู่ในถัง → synthetic row ค้างถาวร
            const isClosed = shouldShowClosedRow(cs.effectiveStatus);
            if (!isWait && !isReject && !isClosed) continue;
            // ถ้ามีแถว spend>0 ของแคมเปญนี้แล้วในช่วงวันที่ → ข้าม (เลี่ยงซ้ำ)
            if (realCampaignIds.has(String(cs.campaignId))) continue;
            // filter: account / group
            if (input.accountId !== undefined && cs.accountId !== input.accountId)
              continue;
            const gId = groupMap.get(cs.accountId) ?? null;
            if (input.groupId !== undefined && gId !== input.groupId) continue;
            // Prompt D: filter by ownerUserId
            const acc = accountById.get(cs.accountId);
            if (input.ownerUserId !== undefined && acc?.ownerUserId !== input.ownerUserId)
              continue;
            // filter: search (เทียบกับชื่อแคมเปญ)
            if (
              input.search &&
              input.search.trim() &&
              !(cs.campaignName ?? "")
                .toLowerCase()
                .includes(input.search.trim().toLowerCase())
            )
              continue;
            const grp = gId != null ? groupById.get(gId) : undefined;
            const statusBadge = computeBadge(
              cs.effectiveStatus,
              cs.approvedAt,
              cs.rejectedAt,
              todayObj,
            );
            syntheticRows.push({
              id: synthId--,
              adId: `__campaign__${cs.campaignId}`,
              adName: null,
              adsetId: null,
              adsetName: null,
              campaignId: cs.campaignId,
              campaignName: cs.campaignName,
              date: today,
              spend: null as any,
              impressions: null as any,
              clicks: null as any,
              ctr: null as any,
              messages: null as any,
              dailyBudget: null,
              budgetSource: "none" as any,
            metaOrders: null as any,
              metaSalesAmount: null as any,
              reach: null as any,
              costPerMessage: null,
              purchaseRoas: null,
              previewCachedUrl: null,
              // Phase 5: synthetic row ไม่มี adId จริง → postType = null
              postType: null,
              pageName: acc?.pageName ?? null,
              syncedAt: cs.syncedAt,
              accountId: cs.accountId,
              accountNickname: acc?.nickname ?? null,
              accountMetaId: acc?.adAccountId ?? null,
              groupId: gId,
              groupName: grp?.groupName ?? null,
              groupColor: grp?.color ?? null,
              // Prompt D: owner / payment / limit / roasTarget
              ownerUserId: acc?.ownerUserId ?? null,
              paymentType: acc?.paymentType ?? null,
              limitAmount: acc?.limitAmount ?? null,
              roasTarget: grp?.roasTarget ?? null,
              manualOrders: null,
              manualSalesCount: null,
              manualSalesAmount: null,
              manualScaleNextAmount: null,
              manualNote: null,
              costPerOrder: null,
              costPerClick: null,
              chatToOrderRate: null,
              roas: null,
              adsSpendPct: null,
              prevDayScale: null,
              campaignFirstDate: cs.campaignId
                ? campaignFirstDates.get(String(cs.campaignId)) ?? null
                : null,
              statusBadge,
              effectiveStatus: cs.effectiveStatus ?? null,
              approvedAt: cs.approvedAt ?? null,
              rejectedAt: cs.rejectedAt ?? null,
              // Phase 3C (B): synthetic row ก็โชว์ไอคอน (i) ได้ ถ้า campaign มี ad issues
              hasIssues: cs.campaignId
                ? campaignsWithIssues.has(String(cs.campaignId))
                : false,
              // เฟส 3B: สถานะคำขอโฆษณา (toggle) — synthetic row มีปุ่มได้ (ส่วนใหญ่ reject/wait)
              requestReviewAt: cs.requestReviewAt ?? null,
              // Phase 5: คุณภาพ ads ของแคมเปญ (จาก campaignStatus ตัวเดียวกับ synthetic row)
              campaignQuality: cs.quality ?? null,
              isNoSpendRow: true as any,
            });
          }
        }

        return [...enriched, ...syntheticRows];
      }),
    updateManual: protectedProcedure
      .input(
        z.object({
          adId: z.string().min(1),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          // orders/salesAmount/roas/budget ดึงจาก Meta อัตโนมัติแล้ว
          // เหลือกรอกมือ: salesCount (จำนวนขาย), scaleNextAmount (ยอดใหม่), note (หมายเหตุ)
          field: z.enum(["salesCount", "scaleNextAmount", "note"]),
          value: z.union([z.number(), z.string(), z.null()]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const patch: Record<string, unknown> = {
          userId: tid,
          adId: input.adId,
          date: input.date,
          updatedBy: ctx.user.id,
        };
        if (input.field === "note") {
          patch.note = input.value == null ? null : String(input.value);
        } else {
          const num =
            input.value == null || input.value === "" ? null : Number(input.value);
          if (num != null && !Number.isFinite(num)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid number" });
          }
          patch[input.field] = num;
        }
        await upsertAdManualMetric(patch as any);
        return { ok: true };
      }),
    /**
     * Phase 5: ตั้งค่า "คุณภาพ ads" ระดับแคมเปญ (staff แก้ได้ + tenant isolation)
     * เก็บใน campaignStatus.quality — 1 ค่าต่อแคมเปญ ใช้ร่วมทุกแอด/ทุกวันในแคมเปญนั้น
     */
    updateCampaignQuality: protectedProcedure
      .input(
        z.object({
          campaignId: z.string().min(1),
          quality: z.enum(["angel", "rising", "testing", "tested"]).nullable(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await updateCampaignQuality(tid, input.campaignId, input.quality);
        return { ok: true };
      }),
    /**
     * เฟส 3B: toggle "ส่งคำขอโฆษณา" ระดับแคมเปญ (staff แก้ได้ + tenant isolation)
     * — ปุ่มจดบันทึกในระบบว่า "ได้กดส่งคำขอให้ Meta รีวิวแล้ว" (ไม่ยิง/ไม่ดึง Meta)
     * requested=true → จดวันนี้, false → เคลียร์ (toggle ยกเลิก)
     */
    markRequestReview: nonContentProcedure
      .input(
        z.object({
          campaignId: z.string().min(1),
          requested: z.boolean(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        // ownership guard: ตรวจว่าแคมเปญอยู่ใน tenant นี้จริง + (ถ้า staff) ต้องเป็นบัญชีของตนเอง
        const cs = await getCampaignStatusOne(tid, input.campaignId);
        if (cs && cs.accountId) {
          const acc = await getAdAccountById(cs.accountId, tid);
          if (
            acc &&
            !isOwnerRole(ctx.user.role) &&
            acc.ownerUserId !== ctx.user.id
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "ไม่มีสิทธิ์แก้ไขแคมเปญนี้",
            });
          }
        }
        const today = todayString(new Date());
        const ok = await markRequestReview(
          tid,
          input.campaignId,
          input.requested,
          today,
        );
        if (!ok) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ไม่พบแคมเปญนี้",
          });
        }
        return { ok: true, requestReviewAt: input.requested ? today : null };
      }),
    /**
     * Phase 3C (B): ดึงเหตุผลที่โฆษณาถูกปฏิเสธ (issues_info) ระดับ ad ของ campaign หนึ่ง
     * — ใช้ตอนคลิกไอคอน (i) เพื่อเปิด dialog
     * guard: nonContent (content ถูกบล็อก) + per-account (staff ดูได้เฉพาะบัญชีตน) + tenant isolation
     */
    getCampaignIssues: nonContentProcedure
      .input(z.object({ campaignId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        // ownership guard: แคมเปญต้องอยู่ใน tenant นี้ + (ถ้า staff) ต้องเป็นบัญชีของตน
        const cs = await getCampaignStatusOne(tid, input.campaignId);
        if (cs && cs.accountId) {
          const acc = await getAdAccountById(cs.accountId, tid);
          if (
            acc &&
            !isOwnerRole(ctx.user.role) &&
            acc.ownerUserId !== ctx.user.id
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "ไม่มีสิทธิ์ดูแคมเปญนี้",
            });
          }
        }
        const ads = await getAdIssuesByCampaign(tid, input.campaignId);
        return { campaignId: input.campaignId, ads };
      }),
    /**
     * Phase 5: ตั้งค่า "ประเภทโพส" ระดับแอด (staff แก้ได้ + tenant isolation)
     * เก็บใน adInsightsDaily.postType — propagate ทุกแถวของ adId
     */
    updateAdPostType: protectedProcedure
      .input(
        z.object({
          adId: z.string().min(1),
          postType: z.enum(["main", "support"]).nullable(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        await updateAdPostType(tid, input.adId, input.postType);
        return { ok: true };
      }),
    syncNow: ownerProcedure
      .input(z.object({ accountId: z.number().optional(), days: z.number().min(1).max(30).default(7) }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const all = await getAdAccountsByUser(tid);
        const accounts = input.accountId
          ? all.filter((a) => a.id === input.accountId)
          : all.filter((a) => a.isActive);
        const since = dateOffsetString(input.days - 1);
        const until = dateOffsetString(0);
        const results = await syncAdInsightsForAccounts(accounts, since, until, tid);
        return {
          accountsProcessed: results.length,
          rowsSynced: results.reduce((s, r) => s + r.rowsSynced, 0),
          previewsRefreshed: results.reduce((s, r) => s + r.previewsRefreshed, 0),
          failed: results.filter((r) => !r.ok).length,
          errors: results.filter((r) => !r.ok).map((r) => ({ accountId: r.accountId, message: r.errorMessage })),
        };
      }),
    /**
     * Round 7.46: Re-sync ย้อนหลัง (manual backfill) — กดเองเมื่อจำเป็นเท่านั้น
     * รองรับช่วงสูงสุด 90 วัน เพื่อเขียนทับข้อมูลเก่าที่ดึงมาด้วยสูตร/คอลัมน์เดิมที่ไม่ถูกต้อง
     * - ทยอย sync ทีละบัญชี (sequential) + delay 800ms ต่อบัญชี เพื่อกัน Meta rate limit
     * - upsert ทับเฉพาะ field ที่ดึงจาก Meta — ข้อมูลกรอกมือ (adManualMetrics) ไม่ถูกแตะ
     * - บันทึก syncLog หลังเสร็จเพื่อให้ดูประวัติได้
     * NOTE: auto-sync เบื้องหลังยังคงเป็น 7 วันตามเดิม ไม่กระทบ
     */
    resyncBackfill: ownerProcedure
      .input(
        z.object({
          accountId: z.number().optional(),
          days: z.number().int().min(1).max(90).default(90),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const all = await getAdAccountsByUser(tid);
        const accounts = input.accountId
          ? all.filter((a) => a.id === input.accountId && a.isActive)
          : all.filter((a) => a.isActive);
        const { since, until } = resolveResyncRange(input.days);
        const startedAt = Date.now();
        // ทยอยทีละบัญชี + delay 800ms (สูงกว่า auto-sync 300ms) เพราะดึงช่วงยาวกว่า
        const results = await syncAdInsightsForAccounts(
          accounts,
          since,
          until,
          tid,
          800,
        );
        const rowsSynced = results.reduce((s, r) => s + r.rowsSynced, 0);
        const previewsRefreshed = results.reduce(
          (s, r) => s + r.previewsRefreshed,
          0,
        );
        const failed = results.filter((r) => !r.ok).length;
        // บันทึกประวัติการ re-sync
        try {
          await insertSyncLog({
            jobType: "adInsights",
            tenants: 1,
            newAccounts: 0,
            existingAccounts: accounts.length,
            rowsSynced,
            previewsRefreshed,
            failed,
            durationMs: Date.now() - startedAt,
            status:
              failed === 0 ? "success" : rowsSynced > 0 ? "partial" : "failed",
          });
        } catch {
          /* ignore log failure */
        }
        return {
          accountsProcessed: results.length,
          totalAccounts: accounts.length,
          days: input.days,
          rowsSynced,
          previewsRefreshed,
          failed,
          errors: results
            .filter((r) => !r.ok)
            .map((r) => ({ accountId: r.accountId, message: r.errorMessage })),
        };
      }),
    /** Round 7.32: Lightweight status endpoint for Ad Intelligence auto-sync UI. */
    syncStatus: protectedProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const at = await getLatestSyncedAt(tid);
      return { latestSyncedAt: at };
    }),
  }),

  /* ----- Phase 4: ระบบถังขยะ (soft delete) — ทุก role ยกเว้น content ----- */
  trash: router({
    /** รายการแคมเปญในถังขยะของ tenant */
    list: nonContentProcedure.query(async ({ ctx }) => {
      const tid = await tenantId(ctx);
      const rows = await listTrashedCampaigns(tid);
      return rows.map((r) => ({
        campaignId: String(r.campaignId),
        campaignName: r.campaignName ?? null,
        accountId: r.accountId,
        effectiveStatus: r.effectiveStatus ?? null,
        trashedAt: r.trashedAt,
        trashedReason: r.trashedReason ?? null,
        rejectedAt: r.rejectedAt ?? null,
      }));
    }),
    /** กู้แคมเปญกลับตารางหลัก (A2: reset rejectedAt + ตั้ง restoredAt) */
    restore: nonContentProcedure
      .input(z.object({ campaignId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const ok = await restoreCampaign(tid, input.campaignId);
        return { ok };
      }),
    /**
     * Phase 4.1: ย้ายแคมเปญเข้าถังเอง (manual trash) จากตารางหลัก
     * guard: ต้องมี campaignStatus row ของ tenant นี้ และยังไม่ได้อยู่ในถัง
     */
    moveToTrash: nonContentProcedure
      .input(z.object({ campaignId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        let existing = await getCampaignStatusOne(tid, input.campaignId);
        if (!existing) {
          // 3A.1: แถว insights-based ที่ status sync ยังมาไม่ถึง → auto-create จาก insights แล้ว trash
          const created = await ensureCampaignStatusRow(tid, input.campaignId);
          if (!created) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "ไม่พบแคมเปญนี้",
            });
          }
          existing = await getCampaignStatusOne(tid, input.campaignId);
        }
        if (existing && existing.trashedAt != null) {
          // อยู่ในถังอยู่แล้ว — idempotent ไม่ถือเป็น error
          return { ok: true, alreadyTrashed: true as const };
        }
        const ok = await moveCampaignToTrash(tid, input.campaignId, "manual");
        return { ok, alreadyTrashed: false as const };
      }),
    /** ลบถาวร (ลบจริง insights + manual + campaignStatus row) — กู้ไม่ได้อีก */
    deletePermanent: nonContentProcedure
      .input(z.object({ campaignId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        const deleted = await deleteCampaignPermanently(tid, input.campaignId);
        return { ok: true, deleted };
      }),
  }),

  /* ----- Sync Logs (Round 7.44) — owner/ceo ดูประวัติการ sync ----- */
  syncLogs: router({
    list: ownerProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(200).optional(),
            jobType: z.enum(["adInsights", "bm", "alerts", "tokenCheck"]).optional(),
          })
          .optional(),
      )
      .query(async ({ input }) => {
        return listSyncLogs(input?.limit ?? 50, input?.jobType);
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

  /* ----- Alert System (Round 4) ----- */
  alerts: alertsRouter,

  /* ----- Cohort Analysis (Round 5) ----- */
  cohort: router({
    byAdAge: protectedProcedure
      .input(
        z.object({
          dateRange: z.object({
            preset: z.enum(["today", "yesterday", "3d", "7d", "14d", "30d", "custom"]),
            since: z.string().optional(),
            until: z.string().optional(),
          }),
          accountIds: z.array(z.number()).optional(),
          maxAds: z.number().min(5).max(50).default(20),
          maxDays: z.number().min(7).max(28).default(14),
        }),
      )
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        return getAdAgeCohort(tid, input.dateRange, input.accountIds, input.maxAds, input.maxDays);
      }),
    byStartWeek: protectedProcedure
      .input(
        z.object({
          dateRange: z.object({
            preset: z.enum(["today", "yesterday", "3d", "7d", "14d", "30d", "custom"]),
            since: z.string().optional(),
            until: z.string().optional(),
          }),
          accountIds: z.array(z.number()).optional(),
          maxDays: z.number().min(7).max(28).default(14),
        }),
      )
      .query(async ({ ctx, input }) => {
        const tid = await tenantId(ctx);
        return getWeekStartCohort(tid, input.dateRange, input.accountIds, input.maxDays);
      }),
  }),

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
