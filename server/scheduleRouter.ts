import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { ownerProcedure, router } from "./_core/trpc";
import {
  createHeartbeatJob,
  deleteHeartbeatJob,
  listHeartbeatJobs,
  updateHeartbeatJob,
  type HeartbeatJobInfo,
} from "./_core/heartbeat";

/**
 * Round 7.40: Auto-sync schedule management.
 *
 * จัดการ Heartbeat Cron Jobs 3 ตัวที่ยิงไปยัง scheduled callback endpoints
 * ซึ่งมีอยู่แล้วใน server/_core/index.ts:
 *   - /api/scheduled/syncAdInsights  (ดึง ad-day insights)
 *   - /api/scheduled/syncBM          (auto-discover BM accounts)
 *   - /api/scheduled/checkAlerts     (ตรวจ alert rules)
 *
 * ทั้ง 3 jobs ตั้งค่าให้รันทุก 1 ชั่วโมง (cron 6-field UTC).
 * วินาที = 0, นาที = 0 → ยิงที่ต้นชั่วโมงทุกชั่วโมง
 */

/** นิยาม cron jobs ที่ระบบรองรับ — ทุกตัวรันทุก 1 ชั่วโมง */
export const AUTOSYNC_JOBS = [
  {
    key: "syncAdInsights",
    name: "richbiotech-auto-sync-ad-insights",
    cron: "0 0 * * * *", // ทุกต้นชั่วโมง (sec=0 min=0)
    path: "/api/scheduled/syncAdInsights",
    label: "ซิงค์ข้อมูลโฆษณา (Ad Insights)",
    description: "ดึงข้อมูล ad-day insights จาก Meta อัตโนมัติทุก 1 ชั่วโมง + backfill 7 วันรอบเที่ยงคืน UTC",
  },
  {
    key: "syncBM",
    name: "richbiotech-auto-sync-bm",
    cron: "0 5 * * * *", // ทุกต้นชั่วโมง นาทีที่ 5 (เหลื่อมจาก insights กัน burst)
    path: "/api/scheduled/syncBM",
    label: "ซิงค์บัญชี Business Manager",
    description: "ค้นหา/อัปเดต/ลบบัญชีโฆษณาภายใต้ BM อัตโนมัติทุก 1 ชั่วโมง",
  },
  {
    key: "checkAlerts",
    name: "richbiotech-auto-check-alerts",
    cron: "0 10 * * * *", // ทุกต้นชั่วโมง นาทีที่ 10
    path: "/api/scheduled/checkAlerts",
    label: "ตรวจการแจ้งเตือน (Alerts)",
    description: "ตรวจสอบเงื่อนไข alert rules และส่งแจ้งเตือนอัตโนมัติทุก 1 ชั่วโมง",
  },
] as const;

export type AutoSyncJobKey = (typeof AUTOSYNC_JOBS)[number]["key"];

type JobDef = (typeof AUTOSYNC_JOBS)[number];
const JOB_BY_NAME = new Map<string, JobDef>(AUTOSYNC_JOBS.map((j) => [j.name, j] as [string, JobDef]));

/**
 * เรียก listHeartbeatJobs แล้วการันตีว่าได้ array เสมอ
 * (Forge API อาจละ field `jobs` ออกจาก response เมื่อไม่มี cron job เลย → undefined)
 */
async function listOurJobs(session: string): Promise<HeartbeatJobInfo[]> {
  const res = await listHeartbeatJobs(session, { pageSize: 100 });
  const all = Array.isArray(res?.jobs) ? res.jobs : [];
  return all;
}

/** ดึง decoded app_session_id จาก cookie header (จำเป็นต่อการผูก cron กับ owner) */
function getSessionToken(ctx: { req: { headers: { cookie?: string } } }): string {
  const token = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
  if (!token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "ไม่พบ session — กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
    });
  }
  return token;
}

/** map HeartbeatJobInfo → รูปแบบที่ frontend ใช้ พร้อมรวม metadata ที่เรานิยามไว้ */
function describeJob(info: HeartbeatJobInfo) {
  const def = JOB_BY_NAME.get(info.name);
  return {
    taskUid: info.taskUid,
    name: info.name,
    key: def?.key ?? null,
    label: def?.label ?? info.name,
    cronExpression: info.cronExpression,
    isEnable: info.isEnable,
    lastExecutedAt: info.lastExecutedAt ?? null,
    nextExecutionAt: info.nextExecutionAt ?? null,
    createdAt: info.createdAt ?? null,
  };
}

export const scheduleRouter = router({
  /**
   * ดูสถานะ cron jobs ทั้งหมด + สรุปว่า Auto-sync เปิดใช้งานครบหรือยัง
   */
  status: ownerProcedure.query(async ({ ctx }) => {
    const session = getSessionToken(ctx);
    const jobs = await listOurJobs(session);
    const ours = jobs.filter((j) => JOB_BY_NAME.has(j.name)).map(describeJob);

    const configured = AUTOSYNC_JOBS.map((def) => {
      const existing = ours.find((o) => o.name === def.name);
      return {
        key: def.key,
        name: def.name,
        label: def.label,
        description: def.description,
        cron: def.cron,
        intervalLabel: "ทุก 1 ชั่วโมง",
        exists: !!existing,
        isEnable: existing?.isEnable ?? false,
        taskUid: existing?.taskUid ?? null,
        lastExecutedAt: existing?.lastExecutedAt ?? null,
        nextExecutionAt: existing?.nextExecutionAt ?? null,
      };
    });

    const allExist = configured.every((c) => c.exists);
    const allEnabled = configured.every((c) => c.exists && c.isEnable);

    return {
      autoSyncEnabled: allEnabled,
      partiallyConfigured: configured.some((c) => c.exists) && !allEnabled,
      allConfigured: allExist,
      jobs: configured,
    };
  }),

  /**
   * เปิดใช้งาน Auto-sync — สร้าง cron jobs ที่ยังไม่มี และ resume ตัวที่ปิดอยู่
   * idempotent: เรียกซ้ำได้ปลอดภัย
   */
  enableAll: ownerProcedure.mutation(async ({ ctx }) => {
    const session = getSessionToken(ctx);
    const jobs = await listOurJobs(session);
    const existingByName = new Map(jobs.map((j) => [j.name, j]));

    const results: { key: AutoSyncJobKey; action: "created" | "resumed" | "updated" }[] = [];

    for (const def of AUTOSYNC_JOBS) {
      const existing = existingByName.get(def.name);
      if (!existing) {
        await createHeartbeatJob(
          {
            name: def.name,
            cron: def.cron,
            path: def.path,
            description: def.description,
          },
          session,
        );
        results.push({ key: def.key, action: "created" });
      } else {
        // มีอยู่แล้ว → ตั้ง cron ให้ถูกและ resume (กรณีถูกปิดหรือ cron ไม่ตรง)
        await updateHeartbeatJob(
          existing.taskUid,
          { cron: def.cron, path: def.path, description: def.description, enable: true },
          session,
        );
        results.push({ key: def.key, action: existing.isEnable ? "updated" : "resumed" });
      }
    }

    return { ok: true, results };
  }),

  /**
   * ปิดใช้งาน Auto-sync ทั้งหมด (pause — ไม่ลบ เพื่อให้เปิดกลับได้ง่าย)
   */
  disableAll: ownerProcedure.mutation(async ({ ctx }) => {
    const session = getSessionToken(ctx);
    const jobs = await listOurJobs(session);
    const ours = jobs.filter((j) => JOB_BY_NAME.has(j.name));

    for (const j of ours) {
      if (j.isEnable) {
        await updateHeartbeatJob(j.taskUid, { enable: false }, session);
      }
    }

    return { ok: true, paused: ours.length };
  }),

  /**
   * เปิด/ปิด cron job รายตัวด้วย key
   */
  toggleJob: ownerProcedure
    .input(
      z.object({
        key: z.enum(["syncAdInsights", "syncBM", "checkAlerts"]),
        enable: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = getSessionToken(ctx);
      const def = AUTOSYNC_JOBS.find((j) => j.key === input.key);
      if (!def) throw new TRPCError({ code: "BAD_REQUEST", message: "unknown job key" });

      const jobs = await listOurJobs(session);
      const existing = jobs.find((j) => j.name === def.name);

      if (!existing) {
        if (!input.enable) return { ok: true, noop: true };
        // ยังไม่มี → สร้างใหม่และเปิด
        await createHeartbeatJob(
          { name: def.name, cron: def.cron, path: def.path, description: def.description },
          session,
        );
        return { ok: true, created: true };
      }

      await updateHeartbeatJob(existing.taskUid, { enable: input.enable }, session);
      return { ok: true };
    }),

  /**
   * ลบ cron jobs ทั้งหมด (ใช้กรณีต้องการ reset)
   */
  removeAll: ownerProcedure.mutation(async ({ ctx }) => {
    const session = getSessionToken(ctx);
    const jobs = await listOurJobs(session);
    const ours = jobs.filter((j) => JOB_BY_NAME.has(j.name));

    for (const j of ours) {
      await deleteHeartbeatJob(j.taskUid, session);
    }

    return { ok: true, removed: ours.length };
  }),
});
