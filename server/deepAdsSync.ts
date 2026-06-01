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
} from "./metaApi";
import {
  upsertAdInsightsDaily,
  getAccountGroupMap,
  getLatestPreviewCachedAt,
  updateAdPreviewCache,
  backfillPageName,
} from "./db";
import { cacheAdPreview, isPreviewFresh } from "./previewCache";

export type DeepSyncResult = {
  accountId: number;
  ok: boolean;
  rowsSynced: number;
  previewsRefreshed: number;
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
    const [insights, budgets, groupMap] = await Promise.all([
      fetchAdInsightsDaily(account.adAccountId, token, { since, until }),
      fetchAdsetDailyBudgetMap(account.adAccountId, token),
      getAccountGroupMap(tenantId),
    ]);

    const groupId = groupMap.get(account.id) ?? null;
    let rowsSynced = 0;
    let previewsRefreshed = 0;

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
