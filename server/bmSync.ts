/**
 * BM Auto-Discovery shared sync helper (Round 7.23 Phase 4)
 *
 * \u0e23\u0e27\u0e1a\u0e23\u0e27\u0e21 logic ที่ใช้ทั้งใน:
 *   • tRPC `bm.sync` (manual จาก UI)
 *   • Heartbeat `/api/scheduled/syncBM` (auto ทุก 6 ชม.)
 *
 * Idempotent: ถ้าไม่มีอะไรเปลี่ยน, return counts = 0 ทุกตัว
 *
 * รองรับ:
 *   - bumpStatus เมื่อ token expired/blocked
 *   - mark link "removed" เมื่อบัญชีหายจาก BM
 *   - เพิ่ม link/ad account ใหม่ที่เพิ่งโผล่
 *   - log ลง bmDiscoveryLogs
 */
import {
  createAdAccount,
  ensureAccountGroupMember,
  findAdAccountByMetaId,
  insertBmDiscoveryLog,
  insertBmLink,
  listBmLinks,
  markBmLinkRemoved,
  updateBmLinkLastSeen,
  updateBusinessManager,
} from "./db";
import { decrypt as decryptToken } from "./encryption";
import type { BusinessManager } from "../drizzle/schema";
import { discoverBMAccounts } from "./metaApi";

export type SyncTrigger = "manual" | "auto";

export type SyncOutcome =
  | {
      ok: true;
      bmId: number;
      newCount: number;
      existingCount: number;
      removedCount: number;
      totalFound: number;
    }
  | {
      ok: false;
      bmId: number;
      error: { category: string; title?: string; message: string };
    };

/**
 * Sync รายการบัญชีจาก Meta สำหรับ BM 1 ตัว
 *
 * \u0e0a\u0e34\u0e07: ฟังก์ชันนี้จะ insert log + อัปเดต status ของ BM โดยอัตโนมัติ
 */
export async function syncOneBusinessManager(
  bm: BusinessManager,
  tenantId: number,
  trigger: SyncTrigger,
): Promise<SyncOutcome> {
  const token = decryptToken(bm.accessTokenEncrypted);
  const result = await discoverBMAccounts(bm.bmId, token);

  if (!result.ok) {
    await insertBmDiscoveryLog({
      bmId: bm.id,
      userId: tenantId,
      runAt: new Date(),
      status: "failed",
      triggerSource: trigger,
      foundCount: 0,
      addedCount: 0,
      linkedCount: 0,
      removedCount: 0,
      errorMessage: result.message,
    });
    await updateBusinessManager(bm.id, {
      status: result.category === "token_expired" ? "token_expired" : "blocked",
      lastSyncAt: new Date(),
    });
    return {
      ok: false,
      bmId: bm.id,
      error: {
        category: result.category,
        title: (result as any).title,
        message: result.message,
      },
    };
  }

  const existingLinks = await listBmLinks(bm.id);
  const seen = new Set<string>();
  let newCount = 0;
  let existingCount = 0;

  const linkByAdAcct = new Map<number, (typeof existingLinks)[number]>();
  for (const l of existingLinks) linkByAdAcct.set(l.adAccountId, l);

  for (const acc of [...result.ownedAccounts, ...result.clientAccounts]) {
    let dbAcct = await findAdAccountByMetaId(tenantId, acc.bmAdAccountId);
    if (!dbAcct) {
      const acctId = await createAdAccount({
        userId: tenantId,
        adAccountId: acc.bmAdAccountId,
        accessToken: token,
        nickname: acc.name,
        pageName: null,
        phaseName: null,
        ownerUserId: bm.defaultOwnerUserId ?? null, // Prompt A: บัญชีใหม่ที่ discover ได้เจ้าของ default ของ BM
        tokenStatus: "active",
        roasTarget: 2.0,
        isActive: true,
        bmId: bm.id,
        discoveredAt: new Date(),
      } as any);
      dbAcct = { id: acctId } as any;
      newCount += 1;
    } else {
      existingCount += 1;
    }

    if (dbAcct) {
      const adId = (dbAcct as any).id as number;
      seen.add(String(adId));
      const link = linkByAdAcct.get(adId);
      if (link) {
        await updateBmLinkLastSeen(link.id);
      } else {
        await insertBmLink({
          bmId: bm.id,
          adAccountId: adId,
          type: acc.ownership,
          status: "active",
          discoveredAt: new Date(),
          lastSeenAt: new Date(),
        });
      }
      await ensureAccountGroupMember(bm.accountGroupId, adId);
    }
  }

  let removedCount = 0;
  for (const link of existingLinks) {
    if (!seen.has(String(link.adAccountId)) && link.status === "active") {
      await markBmLinkRemoved(link.id);
      removedCount += 1;
    }
  }

  await insertBmDiscoveryLog({
    bmId: bm.id,
    userId: tenantId,
    runAt: new Date(),
    status: "success",
    triggerSource: trigger,
    foundCount: result.totalCount,
    addedCount: newCount,
    linkedCount: existingCount,
    removedCount,
  });
  await updateBusinessManager(bm.id, {
    status: "active",
    lastSyncAt: new Date(),
  });

  return {
    ok: true,
    bmId: bm.id,
    newCount,
    existingCount,
    removedCount,
    totalFound: result.totalCount,
  };
}

/**
 * เมื่อมีบัญชีใหม่ / บัญชีถูกถอด → ส่งข้อความให้ owner
 * คืนค่า true ถ้ามีอะไรเปลี่ยน (จะใช้ตัดสินว่า notify หรือไม่)
 */
export function shouldNotifyOwner(outcome: SyncOutcome): boolean {
  if (!outcome.ok) return true; // error = แจ้งเสมอ
  return outcome.newCount > 0 || outcome.removedCount > 0;
}

export function summarizeOutcome(bm: BusinessManager, outcome: SyncOutcome): { title: string; content: string } {
  if (!outcome.ok) {
    return {
      title: `BM Sync ล้มเหลว: ${bm.name}`,
      content: `Business Manager "${bm.name}" (${bm.bmId}) sync ไม่สำเร็จ\n\nสาเหตุ: ${outcome.error.title ?? outcome.error.category}\nรายละเอียด: ${outcome.error.message}`,
    };
  }
  const lines: string[] = [
    `Business Manager "${bm.name}" (${bm.bmId}) มีการเปลี่ยนแปลง:`,
  ];
  if (outcome.newCount > 0) lines.push(`• พบบัญชีใหม่ ${outcome.newCount} บัญชี`);
  if (outcome.removedCount > 0) lines.push(`• ถอดบัญชี ${outcome.removedCount} บัญชี (หายจาก BM)`);
  lines.push(`• รวมบัญชีใน BM ตอนนี้: ${outcome.totalFound}`);
  return {
    title: `BM Sync: พบการเปลี่ยนแปลงใน "${bm.name}"`,
    content: lines.join("\n"),
  };
}
