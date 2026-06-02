/**
 * Deep Ads Sync orchestrator (Round 7.24)
 *
 * Pulls ad-level daily insights from Meta API and writes to adInsightsDaily.
 * - 1 row per ad_id × date
 * - Budget lookup: adset.daily_budget → campaign.daily_budget (CBO fallback)
 * - Preview image: cached to S3, refreshed every 7 days
 * - Rate-limit: small delay between accounts + try/catch isolation
 *
 * Used by:
 *   • tRPC `deepAds.syncNow` (manual)
 *   • Heartbeat `/api/scheduled/syncAdInsights` (auto hourly + midnight 7d)
 */
import type { AdAccount } from "../drizzle/schema";
import {
  fetchAdInsightsDaily,
  fetchAdsetDailyBudgetMap,
  fetchAdPreviewThumb,
  fetchPageName,
  fetchCampaignStatuses,
} from "./metaApi";
import {
  upsertAdInsightsDaily,
  getAccountGroupMap,
  getLatestPreviewCachedAt,
  updateAdPreviewCache,
  backfillPageName,
  getCampaignStatusMap,
  upsertCampaignStatus,
  hardDeleteCampaignData,
} from "./db";
import { cacheAdPreview, isPreviewFresh } from "./previewCache";
import { reconcileStatus, todayString } from "./campaignStatus";

export type DeepSyncResult = {
  accountId: number;
  ok: boolean;
  rowsSynced: number;
  previewsRefreshed: number;
  campaignsReconciled?: number;
  campaignsDeleted?: number;
  errorMessage?: string;
};

export type BudgetMap = { adset: Record<string, number>; campaign: Record<string, number> };

/**
 * Decide budget + source for an insight row.
 * Pure function — easy to unit test.
 */
export function pickBudgetForInsight(
  adsetId: string | undefined,
  campaignId: string | undefined,
  budgets: BudgetMap,
): { value: number | null; source: "adset" | "campaign" | "none" } {
  if (adsetId && budgets.adset[adsetId] != null) {
    return { value: budgets.adset[adsetId], source: "adset" };
  }
  if (campaignId && budgets.campaign[campaignId] != null) {
    return { value: budgets.campaign[campaignId], source: "campaign" };
  }
  return { value: null, source: "none" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sync one ad account for a given date range.
 *
 * - Does not throw — captures errors per-account
 * - Caches new preview images async (limited to 5 concurrent)
 */
export async function syncAdInsightsForAccount(
  account: AdAccount,
  since: string,
  until: string,
  tenantId: number,
): Promise<DeepSyncResult> {
  try {
    const token = account.accessToken;
    const [insights, budgets, groupMap, campaignStatuses, statusMap] =
      await Promise.all([
        fetchAdInsightsDaily(account.adAccountId, token, { since, until }),
        fetchAdsetDailyBudgetMap(account.adAccountId, token),
        getAccountGroupMap(tenantId),
        fetchCampaignStatuses(account.adAccountId, token),
        getCampaignStatusMap(tenantId),
      ]);

    const groupId = groupMap.get(account.id) ?? null;
    let rowsSynced = 0;
    let previewsRefreshed = 0;
    let campaignsReconciled = 0;
    let campaignsDeleted = 0;

    // ----- Round 7.35: reconcile campaign statuses (WAIT/NEW/REJECT) -----
    // ทำก่อน upsert insights เพื่อให้ hard-delete ที่ครบ 5 วันถูกลบ
    // (insights รอบนี้ของแคมเปญที่ลบจะไม่ถูกเขียนกลับ เพราะ spend=0 ไม่อยู่ใน insights)
    const today = todayString();
    for (const cs of campaignStatuses) {
      const prev = statusMap.get(cs.campaign_id);
      const result = reconcileStatus({
        effectiveStatus: cs.effective_status,
        approvedAt: prev?.approvedAt ?? null,
        rejectedAt: prev?.rejectedAt ?? null,
        rejectedExpired: prev?.rejectedExpired ?? false,
        today,
      });
      await upsertCampaignStatus({
        userId: tenantId,
        accountId: account.id,
        campaignId: cs.campaign_id,
        campaignName: cs.campaign_name || prev?.campaignName || null,
        effectiveStatus: cs.effective_status,
        approvedAt: result.approvedAt,
        rejectedAt: result.rejectedAt,
        rejectedExpired: result.rejectedExpired,
      });
      campaignsReconciled += 1;
      if (result.action === "hard_delete") {
        try {
          await hardDeleteCampaignData(tenantId, cs.campaign_id);
          campaignsDeleted += 1;
        } catch (e) {
          console.warn(
            `[deepAdsSync] hardDelete fail campaign=${cs.campaign_id}:`,
            (e as Error).message,
          );
        }
      }
    }

    // pageName cache (per page_id) to avoid duplicate lookups
    const pageNameCache = new Map<string, string | null>();
    // preview-cache decision per adId (latest cachedAt) — load lazily
    const adIdsToCachePreview = new Set<string>();

    for (const row of insights) {
      const budget = pickBudgetForInsight(row.adset_id, row.campaign_id, budgets);
      await upsertAdInsightsDaily({
        userId: tenantId,
        accountId: account.id,
        adId: row.ad_id,
        adName: row.ad_name,
        adsetId: row.adset_id,
        adsetName: row.adset_name,
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        groupId,
        pageName: null, // will be backfilled below
        date: row.date,
        spend: row.spend,
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: row.ctr,
        messages: row.messages,
        dailyBudget: budget.value,
        budgetSource: budget.source,
        metaOrders: row.purchases,
        metaSalesAmount: row.purchase_value,
      });
      rowsSynced += 1;
      adIdsToCachePreview.add(row.ad_id);
    }

    // Async preview cache (limited concurrency 5)
    const adIds = Array.from(adIdsToCachePreview);
    const concurrency = 5;
    let idx = 0;
    const worker = async () => {
      while (idx < adIds.length) {
        const myIdx = idx++;
        const adId = adIds[myIdx];
        try {
          const lastCached = await getLatestPreviewCachedAt(tenantId, adId);
          if (isPreviewFresh(lastCached)) continue;
          const thumb = await fetchAdPreviewThumb(adId, token);
          if (!thumb) continue;
          // Cache page name once per page_id
          let pageName: string | null = null;
          if (thumb.pageId) {
            if (pageNameCache.has(thumb.pageId)) {
              pageName = pageNameCache.get(thumb.pageId) ?? null;
            } else {
              pageName = await fetchPageName(thumb.pageId, token);
              pageNameCache.set(thumb.pageId, pageName);
            }
          }
          const cached = await cacheAdPreview(adId, thumb.thumbnailUrl);
          if (cached) {
            await updateAdPreviewCache(tenantId, adId, "", cached.url, cached.cachedAt);
            previewsRefreshed += 1;
          }
          await sleep(50);
        } catch (e) {
          console.warn(`[deepAdsSync] preview fail adId=${adId}:`, (e as Error).message);
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    // Backfill pageName to adAccounts if currently NULL
    try {
      await backfillPageName(account.adAccountId, pageNameCache);
    } catch (e) {
      console.warn(`[deepAdsSync] backfillPageName fail:`, (e as Error).message);
    }

    return {
      accountId: account.id,
      ok: true,
      rowsSynced,
      previewsRefreshed,
      campaignsReconciled,
      campaignsDeleted,
    };
  } catch (e) {
    return {
      accountId: account.id,
      ok: false,
      rowsSynced: 0,
      previewsRefreshed: 0,
      errorMessage: (e as Error).message,
    };
  }
}

/**
 * Format a YYYY-MM-DD date string offset by N days from today (UTC).
 */
export function dateOffsetString(daysBack: number, base = new Date()): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

/**
 * Sync many accounts sequentially with a small delay between each.
 */
export async function syncAdInsightsForAccounts(
  accounts: AdAccount[],
  since: string,
  until: string,
  tenantId: number,
  delayMs = 300,
): Promise<DeepSyncResult[]> {
  const out: DeepSyncResult[] = [];
  for (const acc of accounts) {
    if (!acc.isActive) continue;
    const r = await syncAdInsightsForAccount(acc, since, until, tenantId);
    out.push(r);
    if (delayMs > 0) await sleep(delayMs);
  }
  return out;
}
