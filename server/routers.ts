import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { aiRouter } from "./aiAdvisor";
import { alertsRouter } from "./alertsRouter";
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
  listBusinessManagers,
  getBusinessManagerById,
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
} from "./db";
import {
  fetchAdsForAdset,
  fetchAdsetDailyInsights,
  testAdAccountToken,
  validateToken,
  testBMConnection,
  discoverBMAccounts,
} from "./metaApi";
import { encrypt as encryptToken, decrypt as decryptToken, maskToken } from "./encryption";
import { syncOneBusinessManager } from "./bmSync";

const tokenAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const generateToken = customAlphabet(tokenAlphabet, 24);
const generateCompanyCode = customAlphabet(tokenAlphabet, 8);

const dateRangeInput = z.object({
  preset: z.enum(["1d", "3d", "7d", "14d", "30d", "custom"]),
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
          role: z.enum(["ceo", "content", "staff"]),
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
        return await testAdAccountToken(acc.adAccountId, acc.accessToken);
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
            tokenPreview, // มาสก์จาก token จริงที่ decrypt ออกมา
            accountGroupId: bm.accountGroupId,
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

        // เข้ารหัส token
        const encrypted = encryptToken(input.accessToken);

        const newBmId = await insertBusinessManager({
          userId: tid,
          bmId: input.bmId,
          name: input.name,
          accessTokenEncrypted: encrypted,
          accountGroupId: input.accountGroupId,
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
              roasTarget: sel.roasTarget ?? 2.0,
              isActive: true,
              bmId: newBmId,
              discoveredAt: new Date(),
            } as any);
            acct = { id: acctId } as any;
            createdAccounts += 1;
          } else {
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
          removedCount: outcome.removedCount,
          totalFound: outcome.totalFound,
        };
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
            preset: z.enum(["1d", "3d", "7d", "14d", "30d", "custom"]),
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
            preset: z.enum(["1d", "3d", "7d", "14d", "30d", "custom"]),
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
