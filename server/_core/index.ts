import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { runAlertCheckForTenant } from "../alertEngine";
import { listAllWorkspaceTenantIds, listAllActiveBusinessManagers } from "../db";
import { syncOneBusinessManager, shouldNotifyOwner, summarizeOutcome } from "../bmSync";
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
