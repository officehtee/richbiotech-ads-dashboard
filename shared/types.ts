/**
 * Shared types between frontend and backend
 */

export type DatePreset = "1d" | "3d" | "7d" | "14d" | "30d" | "custom";

export type DateRangeInput = {
  preset: DatePreset;
  since?: string; // YYYY-MM-DD (custom)
  until?: string;
};

export type AccountKpi = {
  accountId: number;
  adAccountId: string;
  nickname: string | null;
  pageName: string | null;
  phaseName: string | null;
  spend: number;
  messaging: number;
  purchases: number;
  purchaseValue: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  roas: number;
  costPerMessage: number;
  costPerPurchase: number;
  roasTarget: number;
};

export type GroupKpi = {
  groupId: number;
  groupName: string;
  color: string;
  accountCount: number;
  spend: number;
  messaging: number;
  purchases: number;
  purchaseValue: number;
  impressions: number;
  clicks: number;
  ctr: number;
  roas: number;
  costPerMessage: number;
  costPerPurchase: number;
  roasTarget: number;
  roasThreshold: number;
};

export type DailyKpi = {
  date: string;
  spend: number;
  messaging: number;
  purchases: number;
  purchaseValue: number;
  impressions: number;
  clicks: number;
  ctr: number;
  roas: number;
};

export type AdsetRow = {
  adsetId: string;
  adsetName: string;
  campaignId: string;
  campaignName: string;
  accountId: number;
  adAccountId: string;
  pageName: string | null;
  phaseName: string | null;
  groupId: number | null;
  groupName: string | null;
  spend: number;
  messaging: number;
  purchases: number;
  purchaseValue: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  roas: number;
  costPerMessage: number;
  costPerPurchase: number;
};

export type ScalingScoreData = {
  adsetId: string;
  adsetName: string;
  campaignName: string;
  accountId: number;
  pageName: string | null;
  phaseName: string | null;
  groupId: number | null;
  groupName: string | null;
  spend: number;
  roas: number;
  ctr: number;
  score: number;
  badge: "scale-up-large" | "scale-up-small" | "watch" | "scale-down-small" | "scale-down-large" | "neutral";
  badgeIcon: string;
  recommendation: string;
  trend7d: { date: string; spend: number; roas: number }[];
};

export type CommissionRow = {
  campaignName: string;
  messaging: number;
  purchases: number;
  purchaseValue: number;
  spend: number;
  roas: number;
  adsPercent: number; // (spend / purchaseValue) * 100
};

export type CommissionClipBlock = {
  clipNumber: string;
  staffName: string | null;
  staffId: number | null;
  gradeName: string | null;
  gradeAmount: number;
  rows: CommissionRow[];
};

export type CommissionGroupBlock = {
  groupId: number;
  groupName: string;
  color: string;
  clips: CommissionClipBlock[];
};

export type CommissionSnapshot = {
  groups: CommissionGroupBlock[];
};

// Re-export from shared/const for convenience
export const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "1d", label: "1 วัน" },
  { key: "3d", label: "3 วันล่าสุด" },
  { key: "7d", label: "7 วันล่าสุด" },
  { key: "14d", label: "14 วันล่าสุด" },
  { key: "30d", label: "30 วันล่าสุด" },
  { key: "custom", label: "กำหนดเอง" },
];
