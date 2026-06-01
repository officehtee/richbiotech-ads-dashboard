import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { runAlertCheckForTenant } from "../alertEngine";
import {
  listAllWorkspaceTenantIds,
  listAllActiveBusinessManagers,
  getAdAccountsByUser,
} from "../db";
import { syncOneBusinessManager, shouldNotifyOwner, summarizeOutcome } from "../bmSync";
import { syncAdInsightsForAccounts, dateOffsetString } from "../deepAdsSync";
import { notifyOwner } from "./notification";
import { sdk } from "./sdk";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Scheduled: BM Auto-Discovery — sync รายการบัญชีจาก BM ทุก 6 ชม. (Round 7.23 Phase 4)
  app.post("/api/scheduled/syncBM", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req as any);
      if (!user?.isCron) {
        return res.status(403).json({ error: "cron-only" });
      }
      const bms = await listAllActiveBusinessManagers();
      let totalNew = 0;
      let totalRemoved = 0;
      let totalFailed = 0;
      const notifyResults: { bmId: number; sent: boolean }[] = [];
      for (const bm of bms) {
        try {
          const outcome = await syncOneBusinessManager(bm, bm.userId, "auto");
          if (!outcome.ok) totalFailed += 1;
          else {
            totalNew += outcome.newCount;
            totalRemoved += outcome.removedCount;
          }
          if (shouldNotifyOwner(outcome)) {
            const msg = summarizeOutcome(bm, outcome);
            const sent = await notifyOwner(msg).catch(() => false);
            notifyResults.push({ bmId: bm.id, sent });
          }
        } catch (err) {
          console.error(`[syncBM] bmId=${bm.id} failed`, err);
          totalFailed += 1;
        }
      }
      return res.json({
        ok: true,
        bmTotal: bms.length,
        newAccounts: totalNew,
        removedAccounts: totalRemoved,
        failed: totalFailed,
        notifications: notifyResults.length,
      });
    } catch (e: any) {
      console.error("[syncBM] failed", e);
      return res.status(500).json({
        error: e?.message ?? String(e),
        stack: e?.stack,
        context: { url: req.url },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Scheduled: Deep Ads Sync — sync ad-day grain.
  // Round 7.32: รองรับการตั้ง cron ทุก 15 นาที (ค่า min interval ของ Heartbeat = 60s)
  // - ทุก trigger ปกติ: sync today only (1 day) — ครอบคลุมทั้ง 15 นาที / 1 ชม.
  // - เที่ยงคืน UTC (hourUtc === 0 และ minuteUtc < 15): sync ย้อนหลัง 7 วัน เพื่อ backfill
  // กัน Meta API rate limit: deepAdsSync ใช้ concurrency 5 + 300ms delay ต่อบัญชี อยู่แล้ว
  app.post("/api/scheduled/syncAdInsights", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req as any);
      if (!user?.isCron) {
        return res.status(403).json({ error: "cron-only" });
      }
      const now = new Date();
      const hourUtc = now.getUTCHours();
      const minuteUtc = now.getUTCMinutes();
      // Backfill 7 วัน เฉพาะรอบเที่ยงคืน UTC ช่วง 00:00–00:14 เท่านั้น (ครั้งเดียวต่อวัน)
      const days = hourUtc === 0 && minuteUtc < 15 ? 7 : 1;
      const since = dateOffsetString(days - 1);
      const until = dateOffsetString(0);
      const tenants = await listAllWorkspaceTenantIds();
      let totalRows = 0;
      let totalPreviews = 0;
      let totalFailed = 0;
      for (const tid of tenants) {
        try {
          const accounts = await getAdAccountsByUser(tid);
          const active = accounts.filter((a) => a.isActive);
          if (active.length === 0) continue;
          const results = await syncAdInsightsForAccounts(active, since, until, tid);
          totalRows += results.reduce((s, r) => s + r.rowsSynced, 0);
          totalPreviews += results.reduce((s, r) => s + r.previewsRefreshed, 0);
          totalFailed += results.filter((r) => !r.ok).length;
        } catch (err) {
          console.error(`[syncAdInsights] tenant=${tid} failed`, err);
          totalFailed += 1;
        }
      }
      return res.json({
        ok: true,
        tenants: tenants.length,
        days,
        since,
        until,
        rowsSynced: totalRows,
        previewsRefreshed: totalPreviews,
        failed: totalFailed,
      });
    } catch (e: any) {
      console.error("[syncAdInsights] failed", e);
      return res.status(500).json({
        error: e?.message ?? String(e),
        stack: e?.stack,
        context: { url: req.url },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Scheduled: ตรวจ alert ทุก 3 ชม. (cron-only)
  app.post("/api/scheduled/checkAlerts", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req as any);
      if (!user?.isCron) {
        return res.status(403).json({ error: "cron-only" });
      }
      const tenants = await listAllWorkspaceTenantIds();
      let totalTriggered = 0;
      for (const tid of tenants) {
        const r = await runAlertCheckForTenant(tid).catch((e) => {
          console.error(`[checkAlerts] tenant=${tid}`, e);
          return { triggered: 0, skipped: 0 };
        });
        totalTriggered += r.triggered;
      }
      return res.json({ ok: true, tenants: tenants.length, triggered: totalTriggered });
    } catch (e: any) {
      console.error("[checkAlerts] failed", e);
      return res.status(500).json({
        error: e?.message ?? String(e),
        stack: e?.stack,
        context: { url: req.url },
        timestamp: new Date().toISOString(),
      });
    }
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
