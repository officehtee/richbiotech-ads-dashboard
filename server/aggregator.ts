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
