/**
 * Meta Marketing API client (Graph v22.0)
 * Handles: insights, campaigns/adsets/ads, daily breakdowns
 *
 * NOTE: This module is NOT for live API calls in dev preview without
 * real tokens. It will gracefully return empty arrays when token is invalid.
 * All errors are caught and logged so the dashboard never crashes.
 */

const META_API_VERSION = "v22.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export type MetaDateRange = {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
};

export type AccountInsight = {
  spend: number;
  messaging_conversations_started_7d: number;
  purchases: number;
  purchase_value: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  reach: number;
};

export type AdsetInsight = {
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  daily_budget?: number;
  status?: string;
  effective_status?: string;
  spend: number;
  messaging: number;
  purchases: number;
  purchase_value: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  reach: number;
};

export type DailyInsight = {
  date: string; // YYYY-MM-DD
  spend: number;
  messaging: number;
  purchases: number;
  purchase_value: number;
  impressions: number;
  clicks: number;
};

export type AdInsight = {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  thumbnail_url?: string;
  spend: number;
  messaging: number;
  purchases: number;
  purchase_value: number;
  impressions: number;
  clicks: number;
  ctr: number;
};

const EMPTY_ACCOUNT_INSIGHT: AccountInsight = {
  spend: 0,
  messaging_conversations_started_7d: 0,
  purchases: 0,
  purchase_value: 0,
  impressions: 0,
  clicks: 0,
  ctr: 0,
  cpm: 0,
  reach: 0,
};

function parseNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function extractAction(actions: any[] | undefined, type: string): number {
  if (!actions) return 0;
  const found = actions.find((a: any) => a.action_type === type);
  return parseNum(found?.value);
}

function extractMessaging(actions: any[] | undefined): number {
  if (!actions) return 0;
  // Try several common action types
  const types = [
    "onsite_conversion.messaging_conversation_started_7d",
    "onsite_conversion.total_messaging_connection",
    "messaging_conversation_started_7d",
  ];
  for (const t of types) {
    const v = extractAction(actions, t);
    if (v > 0) return v;
  }
  return 0;
}

function extractPurchases(actions: any[] | undefined): number {
  if (!actions) return 0;
  const types = ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"];
  let total = 0;
  for (const t of types) {
    total += extractAction(actions, t);
  }
  return total;
}

function extractPurchaseValue(actionValues: any[] | undefined): number {
  if (!actionValues) return 0;
  const types = ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"];
  let total = 0;
  for (const t of types) {
    total += extractAction(actionValues, t);
  }
  return total;
}

async function metaFetch<T = any>(
  url: string,
  accessToken: string,
): Promise<T | null> {
  try {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${sep}access_token=${encodeURIComponent(accessToken)}`, {
      method: "GET",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[MetaAPI] ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn("[MetaAPI] fetch failed:", (e as Error).message);
    return null;
  }
}

export function dateRangeFromPreset(
  preset: "1d" | "3d" | "7d" | "14d" | "30d",
): MetaDateRange {
  const today = new Date();
  const map: Record<string, number> = { "1d": 1, "3d": 3, "7d": 7, "14d": 14, "30d": 30 };
  const days = map[preset] ?? 7;
  const since = new Date(today);
  since.setDate(today.getDate() - days + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { since: fmt(since), until: fmt(today) };
}

export async function fetchAccountInsight(
  adAccountId: string,
  accessToken: string,
  dateRange: MetaDateRange,
): Promise<AccountInsight> {
  const fields = [
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpm",
    "reach",
    "actions",
    "action_values",
  ].join(",");
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    level: "account",
  });
  const url = `${META_BASE}/${adAccountId}/insights?${params.toString()}`;
  const res = await metaFetch<{ data: any[] }>(url, accessToken);
  if (!res || !res.data || res.data.length === 0) return EMPTY_ACCOUNT_INSIGHT;
  const r = res.data[0];
  return {
    spend: parseNum(r.spend),
    messaging_conversations_started_7d: extractMessaging(r.actions),
    purchases: extractPurchases(r.actions),
    purchase_value: extractPurchaseValue(r.action_values),
    impressions: parseNum(r.impressions),
    clicks: parseNum(r.clicks),
    ctr: parseNum(r.ctr),
    cpm: parseNum(r.cpm),
    reach: parseNum(r.reach),
  };
}

export async function fetchAdsetInsights(
  adAccountId: string,
  accessToken: string,
  dateRange: MetaDateRange,
): Promise<AdsetInsight[]> {
  const fields = [
    "adset_id",
    "adset_name",
    "campaign_id",
    "campaign_name",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpm",
    "reach",
    "actions",
    "action_values",
  ].join(",");
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    level: "adset",
    limit: "200",
  });
  const url = `${META_BASE}/${adAccountId}/insights?${params.toString()}`;
  const res = await metaFetch<{ data: any[] }>(url, accessToken);
  if (!res || !res.data) return [];
  return res.data.map((r: any) => ({
    adset_id: r.adset_id,
    adset_name: r.adset_name,
    campaign_id: r.campaign_id,
    campaign_name: r.campaign_name,
    spend: parseNum(r.spend),
    messaging: extractMessaging(r.actions),
    purchases: extractPurchases(r.actions),
    purchase_value: extractPurchaseValue(r.action_values),
    impressions: parseNum(r.impressions),
    clicks: parseNum(r.clicks),
    ctr: parseNum(r.ctr),
    cpm: parseNum(r.cpm),
    reach: parseNum(r.reach),
  }));
}

export async function fetchAdsetDailyInsights(
  adAccountId: string,
  adsetId: string,
  accessToken: string,
  dateRange: MetaDateRange,
): Promise<DailyInsight[]> {
  const fields = ["spend", "impressions", "clicks", "actions", "action_values"].join(",");
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    time_increment: "1",
    filtering: JSON.stringify([{ field: "adset.id", operator: "IN", value: [adsetId] }]),
  });
  const url = `${META_BASE}/${adAccountId}/insights?${params.toString()}`;
  const res = await metaFetch<{ data: any[] }>(url, accessToken);
  if (!res || !res.data) return [];
  return res.data.map((r: any) => ({
    date: r.date_start,
    spend: parseNum(r.spend),
    messaging: extractMessaging(r.actions),
    purchases: extractPurchases(r.actions),
    purchase_value: extractPurchaseValue(r.action_values),
    impressions: parseNum(r.impressions),
    clicks: parseNum(r.clicks),
  }));
}

export async function fetchAccountDailyInsights(
  adAccountId: string,
  accessToken: string,
  dateRange: MetaDateRange,
): Promise<DailyInsight[]> {
  const fields = ["spend", "impressions", "clicks", "actions", "action_values"].join(",");
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    time_increment: "1",
    level: "account",
  });
  const url = `${META_BASE}/${adAccountId}/insights?${params.toString()}`;
  const res = await metaFetch<{ data: any[] }>(url, accessToken);
  if (!res || !res.data) return [];
  return res.data.map((r: any) => ({
    date: r.date_start,
    spend: parseNum(r.spend),
    messaging: extractMessaging(r.actions),
    purchases: extractPurchases(r.actions),
    purchase_value: extractPurchaseValue(r.action_values),
    impressions: parseNum(r.impressions),
    clicks: parseNum(r.clicks),
  }));
}

export async function fetchAdsForAdset(
  adAccountId: string,
  adsetId: string,
  accessToken: string,
  dateRange: MetaDateRange,
): Promise<AdInsight[]> {
  const fields = [
    "ad_id",
    "ad_name",
    "adset_id",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "actions",
    "action_values",
  ].join(",");
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    level: "ad",
    filtering: JSON.stringify([{ field: "adset.id", operator: "IN", value: [adsetId] }]),
    limit: "100",
  });
  const url = `${META_BASE}/${adAccountId}/insights?${params.toString()}`;
  const res = await metaFetch<{ data: any[] }>(url, accessToken);
  if (!res || !res.data) return [];
  return res.data.map((r: any) => ({
    ad_id: r.ad_id,
    ad_name: r.ad_name,
    adset_id: r.adset_id,
    spend: parseNum(r.spend),
    messaging: extractMessaging(r.actions),
    purchases: extractPurchases(r.actions),
    purchase_value: extractPurchaseValue(r.action_values),
    impressions: parseNum(r.impressions),
    clicks: parseNum(r.clicks),
    ctr: parseNum(r.ctr),
  }));
}

export async function validateToken(adAccountId: string, accessToken: string): Promise<boolean> {
  const url = `${META_BASE}/${adAccountId}?fields=id,name`;
  const res = await metaFetch<{ id: string }>(url, accessToken);
  return res !== null && !!res.id;
}

/**
 * Hourly insights breakdown (24 buckets per day, 0-23).
 * Returns rows with `date` (YYYY-MM-DD) and `hour` (0-23).
 * Used for Live Activity Hero + Hourly Heatmap.
 */
export type HourlyInsight = {
  date: string;
  hour: number; // 0..23
  spend: number;
  messaging: number;
  impressions: number;
  clicks: number;
};

export async function fetchAccountHourlyInsights(
  adAccountId: string,
  accessToken: string,
  dateRange: MetaDateRange,
): Promise<HourlyInsight[]> {
  const fields = ["spend", "impressions", "clicks", "actions"].join(",");
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    breakdowns: "hourly_stats_aggregated_by_advertiser_time_zone",
    level: "account",
  });
  const url = `${META_BASE}/${adAccountId}/insights?${params.toString()}`;
  const res = await metaFetch<{ data: any[] }>(url, accessToken);
  if (!res || !res.data) return [];
  return res.data.map((r: any) => {
    // hourly_stats_aggregated_by_advertiser_time_zone returns e.g. "14:00:00 - 14:59:59"
    const hourStr: string = r.hourly_stats_aggregated_by_advertiser_time_zone || "00:00:00 - 00:59:59";
    const hour = parseInt(hourStr.slice(0, 2), 10) || 0;
    return {
      date: r.date_start,
      hour,
      spend: parseNum(r.spend),
      messaging: extractMessaging(r.actions),
      impressions: parseNum(r.impressions),
      clicks: parseNum(r.clicks),
    };
  });
}
