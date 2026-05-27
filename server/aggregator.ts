/**
 * Aggregator: combines DB data with Meta API insights into the
 * shapes needed by the frontend (KPI cards, tables, charts).
 *
 * Errors from Meta API are silenced — accounts with bad tokens
 * simply return zero metrics, so the dashboard remains usable.
 */
import {
  AccountKpi,
  AdsetRow,
  DailyKpi,
  DateRangeInput,
  GroupKpi,
} from "../shared/types";
import {
  getAccountGroupsByUser,
  getAdAccountsByUser,
  getAllGroupMembersForUser,
} from "./db";
import {
  AdsetInsight,
  DailyInsight,
  MetaDateRange,
  dateRangeFromPreset,
  fetchAccountDailyInsights,
  fetchAccountInsight,
  fetchAdsetInsights,
} from "./metaApi";

export function resolveDateRange(input: DateRangeInput): MetaDateRange {
  if (input.preset === "custom" && input.since && input.until) {
    return { since: input.since, until: input.until };
  }
  const preset = (["3d", "7d", "14d", "30d"] as const).includes(
    input.preset as any,
  )
    ? (input.preset as "3d" | "7d" | "14d" | "30d")
    : "7d";
  return dateRangeFromPreset(preset);
}

function safeDivide(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

export async function getAccountsKpi(
  tenantId: number,
  dateRange: DateRangeInput,
  filterAccountIds?: number[],
): Promise<AccountKpi[]> {
  const range = resolveDateRange(dateRange);
  let accounts = await getAdAccountsByUser(tenantId);
  accounts = accounts.filter((a) => a.isActive !== false);
  if (filterAccountIds && filterAccountIds.length > 0) {
    accounts = accounts.filter((a) => filterAccountIds.includes(a.id));
  }

  const results = await Promise.all(
    accounts.map(async (acc) => {
      const ins = await fetchAccountInsight(acc.adAccountId, acc.accessToken, range);
      const roas = safeDivide(ins.purchase_value, ins.spend);
      return {
        accountId: acc.id,
        adAccountId: acc.adAccountId,
        nickname: acc.nickname ?? acc.accountName ?? null,
        pageName: acc.pageName ?? null,
        phaseName: acc.phaseName ?? null,
        spend: ins.spend,
        messaging: ins.messaging_conversations_started_7d,
        purchases: ins.purchases,
        purchaseValue: ins.purchase_value,
        impressions: ins.impressions,
        clicks: ins.clicks,
        ctr: ins.ctr,
        cpm: ins.cpm,
        roas,
        costPerMessage: safeDivide(
          ins.spend,
          ins.messaging_conversations_started_7d,
        ),
        costPerPurchase: safeDivide(ins.spend, ins.purchases),
        roasTarget: acc.roasTarget ?? 2.0,
      } satisfies AccountKpi;
    }),
  );
  return results;
}

export async function getGroupsKpi(
  tenantId: number,
  dateRange: DateRangeInput,
): Promise<GroupKpi[]> {
  const groups = await getAccountGroupsByUser(tenantId);
  if (groups.length === 0) return [];
  const members = await getAllGroupMembersForUser(tenantId);
  const accounts = await getAccountsKpi(tenantId, dateRange);
  const accountMap = new Map(accounts.map((a) => [a.accountId, a]));

  return groups.map((g) => {
    const groupAccountIds = members.filter((m) => m.groupId === g.id).map((m) => m.accountId);
    const groupAccounts = groupAccountIds
      .map((id) => accountMap.get(id))
      .filter((x): x is AccountKpi => !!x);
    const sum = groupAccounts.reduce(
      (acc, a) => ({
        spend: acc.spend + a.spend,
        messaging: acc.messaging + a.messaging,
        purchases: acc.purchases + a.purchases,
        purchaseValue: acc.purchaseValue + a.purchaseValue,
        impressions: acc.impressions + a.impressions,
        clicks: acc.clicks + a.clicks,
      }),
      { spend: 0, messaging: 0, purchases: 0, purchaseValue: 0, impressions: 0, clicks: 0 },
    );
    return {
      groupId: g.id,
      groupName: g.groupName,
      color: g.color ?? "#3b82f6",
      accountCount: groupAccounts.length,
      spend: sum.spend,
      messaging: sum.messaging,
      purchases: sum.purchases,
      purchaseValue: sum.purchaseValue,
      impressions: sum.impressions,
      clicks: sum.clicks,
      ctr: safeDivide(sum.clicks, sum.impressions) * 100,
      roas: safeDivide(sum.purchaseValue, sum.spend),
      costPerMessage: safeDivide(sum.spend, sum.messaging),
      costPerPurchase: safeDivide(sum.spend, sum.purchases),
      roasTarget: g.roasTarget ?? 2.0,
      roasThreshold: g.roasThreshold ?? 1.5,
    } satisfies GroupKpi;
  });
}

export async function getSingleAccountTrend(
  tenantId: number,
  accountId: number,
  dateRange: DateRangeInput,
): Promise<DailyKpi[]> {
  const accounts = await getAdAccountsByUser(tenantId);
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return [];
  const range = resolveDateRange(dateRange);
  const daily = await fetchAccountDailyInsights(acc.adAccountId, acc.accessToken, range);
  return daily.map((d) => ({
    date: d.date,
    spend: d.spend,
    messaging: d.messaging,
    purchases: d.purchases,
    purchaseValue: d.purchase_value,
    impressions: d.impressions,
    clicks: d.clicks,
    ctr: safeDivide(d.clicks, d.impressions) * 100,
    roas: safeDivide(d.purchase_value, d.spend),
  }));
}

export async function getAdsetRows(
  tenantId: number,
  dateRange: DateRangeInput,
  filterAccountIds?: number[],
): Promise<AdsetRow[]> {
  const range = resolveDateRange(dateRange);
  let accounts = await getAdAccountsByUser(tenantId);
  accounts = accounts.filter((a) => a.isActive !== false);
  if (filterAccountIds && filterAccountIds.length > 0) {
    accounts = accounts.filter((a) => filterAccountIds.includes(a.id));
  }

  const groups = await getAccountGroupsByUser(tenantId);
  const members = await getAllGroupMembersForUser(tenantId);
  const accountToGroup = new Map<number, { id: number; name: string }>();
  for (const m of members) {
    const g = groups.find((gr) => gr.id === m.groupId);
    if (g) accountToGroup.set(m.accountId, { id: g.id, name: g.groupName });
  }

  const allRows: AdsetRow[] = [];
  await Promise.all(
    accounts.map(async (acc) => {
      const adsets = await fetchAdsetInsights(acc.adAccountId, acc.accessToken, range);
      for (const ad of adsets) {
        const grp = accountToGroup.get(acc.id) ?? null;
        allRows.push({
          adsetId: ad.adset_id,
          adsetName: ad.adset_name,
          campaignId: ad.campaign_id,
          campaignName: ad.campaign_name,
          accountId: acc.id,
          adAccountId: acc.adAccountId,
          pageName: acc.pageName ?? null,
          phaseName: acc.phaseName ?? null,
          groupId: grp?.id ?? null,
          groupName: grp?.name ?? null,
          spend: ad.spend,
          messaging: ad.messaging,
          purchases: ad.purchases,
          purchaseValue: ad.purchase_value,
          impressions: ad.impressions,
          clicks: ad.clicks,
          ctr: ad.ctr,
          cpm: ad.cpm,
          roas: safeDivide(ad.purchase_value, ad.spend),
          costPerMessage: safeDivide(ad.spend, ad.messaging),
          costPerPurchase: safeDivide(ad.spend, ad.purchases),
        });
      }
    }),
  );
  return allRows;
}

/**
 * Smart Scaling Score:
 * score = (ROAS * 0.7) + (CTR * 0.3) — both normalized to ROAS target / 1.0
 * Returns numeric score for sorting; badges decided downstream.
 */
export function calculateScalingScore(
  roas: number,
  ctr: number,
  roasTarget: number,
  ctrThreshold: number,
): number {
  const roasNorm = safeDivide(roas, roasTarget || 2);
  const ctrNorm = safeDivide(ctr, ctrThreshold || 1);
  return roasNorm * 0.7 + ctrNorm * 0.3;
}

export function decideScaleBadge(
  roas: number,
  ctr: number,
  roasTarget: number,
  ctrThreshold: number,
): {
  badge: "scale-up-large" | "scale-up-small" | "watch" | "scale-down-small" | "scale-down-large" | "neutral";
  badgeIcon: string;
  recommendation: string;
} {
  const score = calculateScalingScore(roas, ctr, roasTarget, ctrThreshold);
  if (score >= 1.5) {
    return {
      badge: "scale-up-large",
      badgeIcon: "🚀",
      recommendation: "เพิ่มงบมาก (ROAS สูงเกินเป้า + CTR ดีเยี่ยม)",
    };
  }
  if (score >= 1.1) {
    return {
      badge: "scale-up-small",
      badgeIcon: "✅",
      recommendation: "เพิ่มงบเล็กน้อย (ผลลัพธ์เกินเป้า)",
    };
  }
  if (score >= 0.8) {
    return {
      badge: "watch",
      badgeIcon: "👀",
      recommendation: "เฝ้าดู (อยู่ใกล้เป้าหมาย)",
    };
  }
  if (score >= 0.5) {
    return {
      badge: "scale-down-small",
      badgeIcon: "📉",
      recommendation: "ลดงบเล็กน้อย (ต่ำกว่าเป้า)",
    };
  }
  return {
    badge: "scale-down-large",
    badgeIcon: "⛔",
    recommendation: "ลดงบมาก หรือพิจารณาปิด (ผลลัพธ์ต่ำมาก)",
  };
}


/* =============================================================
 * Performance Comparison + Sparkline helpers (Round 2)
 * ============================================================= */

export type ComparisonMetric =
  | "spend"
  | "messaging"
  | "purchases"
  | "purchaseValue"
  | "impressions"
  | "clicks"
  | "ctr"
  | "roas";

export type ComparisonRow = {
  entityId: string | number;
  label: string;
  sublabel?: string | null;
  color?: string | null;
  current: Record<ComparisonMetric, number>;
  previous: Record<ComparisonMetric, number>;
  deltaPct: Record<ComparisonMetric, number>; // percent change (e.g. 12.5 = +12.5%)
};

const COMPARISON_METRICS: ComparisonMetric[] = [
  "spend",
  "messaging",
  "purchases",
  "purchaseValue",
  "impressions",
  "clicks",
  "ctr",
  "roas",
];

/** Pure helper: compute % delta between two numbers. */
export function computeDelta(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) {
    if (current === 0) return 0;
    return current > 0 ? 100 : -100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Pure helper: derive the previous (same-length) period from a Meta date range. */
export function shiftRangeBack(range: MetaDateRange): MetaDateRange {
  const start = new Date(range.since + "T00:00:00Z");
  const end = new Date(range.until + "T00:00:00Z");
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (days - 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { since: fmt(prevStart), until: fmt(prevEnd) };
}

/** Convert a same-length previous DateRangeInput from the current input. */
export function autoPreviousRange(input: DateRangeInput): DateRangeInput {
  const cur = resolveDateRange(input);
  const prev = shiftRangeBack(cur);
  return { preset: "custom", since: prev.since, until: prev.until };
}

function pickAccountMetrics(a: AccountKpi): Record<ComparisonMetric, number> {
  return {
    spend: a.spend,
    messaging: a.messaging,
    purchases: a.purchases,
    purchaseValue: a.purchaseValue,
    impressions: a.impressions,
    clicks: a.clicks,
    ctr: a.ctr,
    roas: a.roas,
  };
}

function pickGroupMetrics(g: GroupKpi): Record<ComparisonMetric, number> {
  return {
    spend: g.spend,
    messaging: g.messaging,
    purchases: g.purchases,
    purchaseValue: g.purchaseValue,
    impressions: g.impressions,
    clicks: g.clicks,
    ctr: g.ctr,
    roas: g.roas,
  };
}

const ZERO_METRICS: Record<ComparisonMetric, number> = {
  spend: 0,
  messaging: 0,
  purchases: 0,
  purchaseValue: 0,
  impressions: 0,
  clicks: 0,
  ctr: 0,
  roas: 0,
};

function makeDelta(
  cur: Record<ComparisonMetric, number>,
  prev: Record<ComparisonMetric, number>,
): Record<ComparisonMetric, number> {
  const out: Record<ComparisonMetric, number> = { ...ZERO_METRICS };
  for (const k of COMPARISON_METRICS) {
    out[k] = computeDelta(cur[k] ?? 0, prev[k] ?? 0);
  }
  return out;
}

/** Build the comparison rows for accounts. */
export async function compareAccounts(
  tenantId: number,
  rangeA: DateRangeInput,
  rangeB: DateRangeInput,
  accountIds?: number[],
): Promise<ComparisonRow[]> {
  const [aList, bList] = await Promise.all([
    getAccountsKpi(tenantId, rangeA, accountIds),
    getAccountsKpi(tenantId, rangeB, accountIds),
  ]);
  const bMap = new Map(bList.map((x) => [x.accountId, x]));
  return aList.map((a) => {
    const b = bMap.get(a.accountId);
    const current = pickAccountMetrics(a);
    const previous = b ? pickAccountMetrics(b) : ZERO_METRICS;
    return {
      entityId: a.accountId,
      label: a.nickname ?? a.adAccountId,
      sublabel: a.pageName ?? null,
      current,
      previous,
      deltaPct: makeDelta(current, previous),
    } satisfies ComparisonRow;
  });
}

/** Build the comparison rows for groups. */
export async function compareGroups(
  tenantId: number,
  rangeA: DateRangeInput,
  rangeB: DateRangeInput,
  groupIds?: number[],
): Promise<ComparisonRow[]> {
  const [aList, bList] = await Promise.all([
    getGroupsKpi(tenantId, rangeA),
    getGroupsKpi(tenantId, rangeB),
  ]);
  const filtered = groupIds && groupIds.length > 0 ? aList.filter((g) => groupIds.includes(g.groupId)) : aList;
  const bMap = new Map(bList.map((x) => [x.groupId, x]));
  return filtered.map((a) => {
    const b = bMap.get(a.groupId);
    const current = pickGroupMetrics(a);
    const previous = b ? pickGroupMetrics(b) : ZERO_METRICS;
    return {
      entityId: a.groupId,
      label: a.groupName,
      sublabel: `${a.accountCount} บัญชี`,
      color: a.color,
      current,
      previous,
      deltaPct: makeDelta(current, previous),
    } satisfies ComparisonRow;
  });
}

/** Last 7 daily KPI points per account, for sparkline rendering. */
export async function getAccountsSparkline(
  tenantId: number,
  accountIds?: number[],
): Promise<{ accountId: number; days: DailyKpi[] }[]> {
  let accounts = await getAdAccountsByUser(tenantId);
  accounts = accounts.filter((a) => a.isActive !== false);
  if (accountIds && accountIds.length > 0) {
    accounts = accounts.filter((a) => accountIds.includes(a.id));
  }
  const range = dateRangeFromPreset("7d");
  const results = await Promise.all(
    accounts.map(async (acc) => {
      const daily = await fetchAccountDailyInsights(acc.adAccountId, acc.accessToken, range);
      return {
        accountId: acc.id,
        days: daily.map((d) => ({
          date: d.date,
          spend: d.spend,
          messaging: d.messaging,
          purchases: d.purchases,
          purchaseValue: d.purchase_value,
          impressions: d.impressions,
          clicks: d.clicks,
          ctr: d.impressions === 0 ? 0 : (d.clicks / d.impressions) * 100,
          roas: d.spend === 0 ? 0 : d.purchase_value / d.spend,
        })),
      };
    }),
  );
  return results;
}


/* ============================================================
 * Cohort Analysis (Round 5)
 * ============================================================ */

/**
 * Pure helper: aggregate daily insight rows into a single row.
 */
export function aggregateDailyInsights(rows: DailyInsight[]): {
  spend: number;
  messaging: number;
  purchases: number;
  purchaseValue: number;
  impressions: number;
  clicks: number;
  roas: number;
  ctr: number;
} {
  const tot = rows.reduce(
    (acc, r) => {
      acc.spend += r.spend;
      acc.messaging += r.messaging;
      acc.purchases += r.purchases;
      acc.purchaseValue += r.purchase_value;
      acc.impressions += r.impressions;
      acc.clicks += r.clicks;
      return acc;
    },
    { spend: 0, messaging: 0, purchases: 0, purchaseValue: 0, impressions: 0, clicks: 0 },
  );
  return {
    ...tot,
    roas: safeDivide(tot.purchaseValue, tot.spend),
    ctr: tot.impressions > 0 ? (tot.clicks / tot.impressions) * 100 : 0,
  };
}

/**
 * Group daily rows by week starting on Monday (ISO 8601-ish, simplified UTC).
 * Returns { "YYYY-MM-DD" (Monday): rows[] }
 */
export function groupByWeekStart(rows: DailyInsight[]): Map<string, DailyInsight[]> {
  const groups = new Map<string, DailyInsight[]>();
  for (const r of rows) {
    if (!r.date) continue;
    const d = new Date(`${r.date}T00:00:00Z`);
    if (isNaN(d.getTime())) continue;
    // 0=Sun ... 6=Sat; shift so Monday=0
    const dow = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dow);
    const key = d.toISOString().slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return groups;
}

/**
 * Index daily rows by day-N relative to a startDate.
 * Returns array sorted by dayN (0,1,2,...) — missing days included as zeros.
 */
export function indexByDayN(
  rows: DailyInsight[],
  startDate: string,
  maxDays: number,
): Array<{ dayN: number; date: string; insight: DailyInsight | null }> {
  const byDate = new Map<string, DailyInsight>(rows.map((r) => [r.date, r]));
  const start = new Date(`${startDate}T00:00:00Z`);
  if (isNaN(start.getTime())) return [];
  const out: Array<{ dayN: number; date: string; insight: DailyInsight | null }> = [];
  for (let i = 0; i < maxDays; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    out.push({ dayN: i, date: key, insight: byDate.get(key) ?? null });
  }
  return out;
}

/** Color bucket from ROAS — for heatmap display (returns string token, frontend resolves CSS) */
export function roasBucket(roas: number, target = 2): "great" | "good" | "ok" | "warn" | "bad" {
  if (roas >= target * 1.5) return "great";
  if (roas >= target) return "good";
  if (roas >= target * 0.7) return "ok";
  if (roas >= target * 0.4) return "warn";
  return "bad";
}

export type AdAgeCohortRow = {
  adsetId: string;
  adsetName: string;
  accountId: number;
  accountName: string;
  startDate: string;
  totalSpend: number;
  totalRoas: number;
  days: Array<{ dayN: number; date: string; spend: number; roas: number; bucket: string }>;
};

/**
 * Cohort: อายุแอด — แถวคือ Adset, คอลัมน์คือวันที่ N นับจาก first-active-day
 */
export async function getAdAgeCohort(
  tenantId: number,
  dateRange: DateRangeInput,
  filterAccountIds?: number[],
  maxAds = 20,
  maxDays = 14,
): Promise<AdAgeCohortRow[]> {
  const range = resolveDateRange(dateRange);
  let accounts = await getAdAccountsByUser(tenantId);
  accounts = accounts.filter((a) => a.isActive !== false);
  if (filterAccountIds && filterAccountIds.length > 0) {
    accounts = accounts.filter((a) => filterAccountIds.includes(a.id));
  }
  if (accounts.length === 0) return [];

  // Fetch ALL adsets per account
  const rows: AdAgeCohortRow[] = [];
  const { fetchAdsetDailyInsights } = await import("./metaApi");

  await Promise.all(
    accounts.map(async (acc) => {
      const adsets = await fetchAdsetInsights(acc.adAccountId, acc.accessToken, range);
      const top = adsets
        .sort((a, b) => b.spend - a.spend)
        .slice(0, Math.max(1, Math.floor(maxAds / Math.max(1, accounts.length))));

      for (const ad of top) {
        const daily = await fetchAdsetDailyInsights(
          acc.adAccountId,
          ad.adset_id,
          acc.accessToken,
          range,
        );
        if (daily.length === 0) continue;
        // first day with spend > 0 (treated as "ad start")
        const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
        const firstActive = sorted.find((d) => d.spend > 0) ?? sorted[0];
        const idx = indexByDayN(daily, firstActive.date, maxDays);
        let totalSpend = 0;
        let totalPV = 0;
        const days = idx.map((d) => {
          const spend = d.insight?.spend ?? 0;
          const pv = d.insight?.purchase_value ?? 0;
          totalSpend += spend;
          totalPV += pv;
          const roas = spend > 0 ? pv / spend : 0;
          return {
            dayN: d.dayN,
            date: d.date,
            spend,
            roas,
            bucket: roasBucket(roas),
          };
        });
        rows.push({
          adsetId: ad.adset_id,
          adsetName: ad.adset_name,
          accountId: acc.id,
          accountName: acc.nickname ?? acc.accountName ?? acc.adAccountId,
          startDate: firstActive.date,
          totalSpend,
          totalRoas: totalSpend > 0 ? totalPV / totalSpend : 0,
          days,
        });
      }
    }),
  );

  return rows
    .filter((r) => r.totalSpend > 0)
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, maxAds);
}

export type WeekCohortRow = {
  weekStart: string;
  label: string;
  totalSpend: number;
  totalRoas: number;
  adCount: number;
  days: Array<{ dayN: number; spend: number; roas: number; bucket: string }>;
};

/**
 * Cohort: วันเริ่มยิง — แถวคือสัปดาห์ที่เริ่มยิงครั้งแรก, คอลัมน์คือวันที่ N นับจากวันเริ่ม
 */
export async function getWeekStartCohort(
  tenantId: number,
  dateRange: DateRangeInput,
  filterAccountIds?: number[],
  maxDays = 14,
): Promise<WeekCohortRow[]> {
  const adsetCohorts = await getAdAgeCohort(tenantId, dateRange, filterAccountIds, 100, maxDays);
  if (adsetCohorts.length === 0) return [];

  // group adsets by week-of-startDate
  const buckets = new Map<string, AdAgeCohortRow[]>();
  for (const r of adsetCohorts) {
    const d = new Date(`${r.startDate}T00:00:00Z`);
    if (isNaN(d.getTime())) continue;
    const dow = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dow);
    const key = d.toISOString().slice(0, 10);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(r);
  }

  const out: WeekCohortRow[] = [];
  for (const [weekStart, rows] of Array.from(buckets.entries())) {
    let totalSpend = 0;
    let totalPV = 0;
    const dayAgg = new Map<number, { spend: number; pv: number }>();
    for (const r of rows) {
      for (const d of r.days) {
        const cur = dayAgg.get(d.dayN) ?? { spend: 0, pv: 0 };
        cur.spend += d.spend;
        cur.pv += d.spend * d.roas; // back-compute pv
        dayAgg.set(d.dayN, cur);
      }
      totalSpend += r.totalSpend;
      totalPV += r.totalSpend * r.totalRoas;
    }
    const days = Array.from({ length: maxDays }, (_, i) => {
      const a = dayAgg.get(i) ?? { spend: 0, pv: 0 };
      const roas = a.spend > 0 ? a.pv / a.spend : 0;
      return { dayN: i, spend: a.spend, roas, bucket: roasBucket(roas) };
    });
    out.push({
      weekStart,
      label: `สัปดาห์ ${weekStart}`,
      totalSpend,
      totalRoas: totalSpend > 0 ? totalPV / totalSpend : 0,
      adCount: rows.length,
      days,
    });
  }
  return out.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}
