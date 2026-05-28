import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock metaApi before importing aggregator
vi.mock("./metaApi", async () => {
  const actual = await vi.importActual<typeof import("./metaApi")>("./metaApi");
  return {
    ...actual,
    fetchAccountInsight: vi.fn(),
    fetchAccountDailyInsights: vi.fn(),
    fetchAdsetInsights: vi.fn(),
    fetchAccountHourlyInsights: vi.fn(),
  };
});

vi.mock("./db", async () => {
  return {
    getAdAccountsByUser: vi.fn(),
    getAccountGroupsByUser: vi.fn(),
    getAllGroupMembersForUser: vi.fn(),
  };
});

import {
  getRevenueVsSpendDaily,
  getGroupBreakdown,
  getTopAds,
  getSmartScalingRecommend,
  getAccountsTableWithTrend,
} from "./aggregator";
import { getAdAccountsByUser, getAccountGroupsByUser, getAllGroupMembersForUser } from "./db";
import {
  fetchAccountDailyInsights,
  fetchAccountInsight,
  fetchAdsetInsights,
} from "./metaApi";

const mockedAcc = vi.mocked(getAdAccountsByUser);
const mockedGroups = vi.mocked(getAccountGroupsByUser);
const mockedMembers = vi.mocked(getAllGroupMembersForUser);
const mockedDaily = vi.mocked(fetchAccountDailyInsights);
const mockedInsight = vi.mocked(fetchAccountInsight);
const mockedAdsets = vi.mocked(fetchAdsetInsights);

beforeEach(() => {
  vi.clearAllMocks();
});

const sampleAccounts = [
  {
    id: 1,
    userId: 1,
    adAccountId: "act_111",
    accessToken: "tok",
    accountName: "A",
    nickname: "Brand A",
    pageName: "Page A",
    phaseName: null,
    isActive: true,
    sortOrder: 0,
    roasTarget: 2.5,
    defaultDateRange: "7d",
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any,
  {
    id: 2,
    userId: 1,
    adAccountId: "act_222",
    accessToken: "tok",
    accountName: "B",
    nickname: "Brand B",
    pageName: "Page B",
    phaseName: null,
    isActive: true,
    sortOrder: 1,
    roasTarget: 2.0,
    defaultDateRange: "7d",
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any,
];

describe("getRevenueVsSpendDaily", () => {
  it("aggregates revenue and spend across accounts by date", async () => {
    mockedAcc.mockResolvedValue(sampleAccounts);
    mockedDaily.mockImplementation(async (id: string) => {
      if (id === "act_111")
        return [
          { date: "2026-05-01", spend: 100, messaging: 5, purchases: 1, purchase_value: 300, impressions: 1000, clicks: 50 },
          { date: "2026-05-02", spend: 200, messaging: 8, purchases: 2, purchase_value: 600, impressions: 2000, clicks: 80 },
        ];
      return [
        { date: "2026-05-01", spend: 50, messaging: 3, purchases: 1, purchase_value: 150, impressions: 800, clicks: 30 },
        { date: "2026-05-02", spend: 100, messaging: 4, purchases: 2, purchase_value: 400, impressions: 1500, clicks: 60 },
      ];
    });

    const result = await getRevenueVsSpendDaily(1, { preset: "7d" });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: "2026-05-01", revenue: 450, spend: 150 });
    expect(result[1]).toEqual({ date: "2026-05-02", revenue: 1000, spend: 300 });
  });

  it("returns empty array when no accounts", async () => {
    mockedAcc.mockResolvedValue([]);
    const result = await getRevenueVsSpendDaily(1, { preset: "7d" });
    expect(result).toEqual([]);
  });
});

describe("getGroupBreakdown", () => {
  it("returns groups sorted by spend desc with spendPct & roasPct", async () => {
    mockedAcc.mockResolvedValue(sampleAccounts);
    mockedGroups.mockResolvedValue([
      { id: 10, userId: 1, groupName: "G1", color: "#f00", roasTarget: 2.0, ctrThreshold: 1.0, createdAt: new Date(), updatedAt: new Date() } as any,
      { id: 20, userId: 1, groupName: "G2", color: "#0f0", roasTarget: 2.0, ctrThreshold: 1.0, createdAt: new Date(), updatedAt: new Date() } as any,
    ]);
    mockedMembers.mockResolvedValue([
      { groupId: 10, accountId: 1 } as any,
      { groupId: 20, accountId: 2 } as any,
    ]);
    mockedInsight.mockImplementation(async (id: string) => {
      if (id === "act_111")
        return {
          spend: 1000,
          messaging: 100,
          purchases: 20,
          purchase_value: 3000,
          impressions: 10000,
          clicks: 500,
          ctr: 5,
          cpm: 10,
          reach: 5000,
        };
      return {
        spend: 500,
        messaging: 50,
        purchases: 10,
        purchase_value: 1500,
        impressions: 5000,
        clicks: 250,
        ctr: 5,
        cpm: 10,
        reach: 2500,
      };
    });

    const result = await getGroupBreakdown(1, { preset: "7d" });
    expect(result).toHaveLength(2);
    expect(result[0].groupName).toBe("G1"); // higher spend first
    expect(result[0].spend).toBe(1000);
    expect(result[0].spendPct).toBeCloseTo((1000 / 1500) * 100, 1);
    expect(result[1].spend).toBe(500);
    expect(result[0].roasPct).toBeGreaterThan(0);
  });
});

describe("getTopAds", () => {
  it("returns up to 5 adsets sorted by ROAS desc", async () => {
    mockedAcc.mockResolvedValue(sampleAccounts);
    mockedGroups.mockResolvedValue([]);
    mockedMembers.mockResolvedValue([]);
    mockedAdsets.mockImplementation(async (id: string) => {
      if (id === "act_111")
        return [
          { adset_id: "1", adset_name: "Ad 1", campaign_id: "c1", campaign_name: "C1", spend: 200, messaging: 10, purchases: 5, purchase_value: 1000, impressions: 1000, clicks: 50, ctr: 5, cpm: 10, reach: 500 },
          { adset_id: "2", adset_name: "Ad 2", campaign_id: "c2", campaign_name: "C2", spend: 150, messaging: 5, purchases: 3, purchase_value: 600, impressions: 800, clicks: 40, ctr: 5, cpm: 10, reach: 400 },
          // Below minSpend 100 — filtered out
          { adset_id: "3", adset_name: "Ad 3", campaign_id: "c3", campaign_name: "C3", spend: 50, messaging: 2, purchases: 1, purchase_value: 500, impressions: 100, clicks: 5, ctr: 5, cpm: 10, reach: 50 },
        ];
      return [];
    });

    const result = await getTopAds(1, { preset: "7d" });
    expect(result).toHaveLength(2);
    expect(result[0].rank).toBe(1);
    expect(result[0].roas).toBeGreaterThanOrEqual(result[1].roas);
    // Ad 1: roas=5, Ad 2: roas=4
    expect(result[0].adsetName).toBe("Ad 1");
    // Without prior-period data, deltaPct defaults to 0; with same data both periods, also 0.
    expect(typeof result[0].deltaPct).toBe("number");
  });

  it("filters out zero-roas adsets", async () => {
    mockedAcc.mockResolvedValue(sampleAccounts);
    mockedGroups.mockResolvedValue([]);
    mockedMembers.mockResolvedValue([]);
    mockedAdsets.mockResolvedValue([
      { adset_id: "1", adset_name: "Ad 1", campaign_id: "c1", campaign_name: "C1", spend: 200, messaging: 10, purchases: 0, purchase_value: 0, impressions: 1000, clicks: 50, ctr: 5, cpm: 10, reach: 500 },
    ]);
    const result = await getTopAds(1, { preset: "7d" });
    expect(result).toEqual([]);
  });
});

describe("getSmartScalingRecommend", () => {
  it("classifies actions and computes from→to budget", async () => {
    mockedAcc.mockResolvedValue([sampleAccounts[0]]);
    mockedGroups.mockResolvedValue([]);
    mockedMembers.mockResolvedValue([]);
    mockedAdsets.mockResolvedValue([
      // High ROAS -> scale up large
      { adset_id: "1", adset_name: "Star", campaign_id: "c1", campaign_name: "C1", spend: 1000, messaging: 50, purchases: 20, purchase_value: 5000, impressions: 10000, clicks: 200, ctr: 2, cpm: 10, reach: 5000 },
      // Low ROAS -> scale down large / stop
      { adset_id: "2", adset_name: "Loser", campaign_id: "c2", campaign_name: "C2", spend: 500, messaging: 5, purchases: 0, purchase_value: 0, impressions: 5000, clicks: 5, ctr: 0.1, cpm: 10, reach: 2500 },
    ]);

    const settings = {
      increaseSmallPercent: 20,
      increaseLargePercent: 50,
      decreaseSmallPercent: 20,
      decreaseLargePercent: 30,
    };
    const result = await getSmartScalingRecommend(1, { preset: "7d" }, settings);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const star = result.find((r) => r.adsetName === "Star");
    expect(star).toBeDefined();
    expect(star!.actionLabel).toBe("เพิ่มงบ");
    expect(star!.toBudget).toBeGreaterThan(star!.fromBudget);

    const loser = result.find((r) => r.adsetName === "Loser");
    if (loser) {
      expect(["ลดงบ", "หยุด"]).toContain(loser.actionLabel);
      expect(loser.toBudget).toBeLessThanOrEqual(loser.fromBudget);
    }
  });
});

describe("getAccountsTableWithTrend", () => {
  it("returns accounts with status & 14d trend", async () => {
    mockedAcc.mockResolvedValue(sampleAccounts);
    mockedGroups.mockResolvedValue([
      { id: 10, userId: 1, groupName: "G1", color: "#abc", roasTarget: 2.0, ctrThreshold: 1.0, createdAt: new Date(), updatedAt: new Date() } as any,
    ]);
    mockedMembers.mockResolvedValue([{ groupId: 10, accountId: 1 } as any]);
    mockedInsight.mockImplementation(async (id: string) => ({
      spend: id === "act_111" ? 1000 : 500,
      messaging: 100,
      purchases: 20,
      purchase_value: id === "act_111" ? 3000 : 500, // A: roas 3.0, B: roas 1.0
      impressions: 10000,
      clicks: 500,
      ctr: 5,
      cpm: 10,
      reach: 5000,
    }));
    mockedDaily.mockImplementation(async () => [
      { date: "2026-05-01", spend: 100, messaging: 5, purchases: 1, purchase_value: 200, impressions: 1000, clicks: 50 },
      { date: "2026-05-02", spend: 100, messaging: 5, purchases: 1, purchase_value: 250, impressions: 1000, clicks: 50 },
    ]);

    const result = await getAccountsTableWithTrend(1, { preset: "7d" });
    expect(result).toHaveLength(2);
    const a = result.find((r) => r.adAccountId === "act_111");
    expect(a?.status).toBe("ดี"); // roas 3.0 >= target 2.5
    expect(a?.groupName).toBe("G1");
    expect(a?.groupColor).toBe("#abc");
    expect(a?.trend14d.length).toBeGreaterThan(0);

    const b = result.find((r) => r.adAccountId === "act_222");
    // B: roas 1.0, target 2.0 → 0.5 of target → "ต่ำกว่าเป้า"
    expect(b?.status).toBe("ต่ำกว่าเป้า");
  });
});


describe("getTopAds prior-period delta", () => {
  it("computes deltaPct from prior period when available", async () => {
    mockedAcc.mockResolvedValue([sampleAccounts[0]]);
    mockedGroups.mockResolvedValue([]);
    mockedMembers.mockResolvedValue([]);

    let callCount = 0;
    mockedAdsets.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // current period: ROAS = 5.0
        return [
          { adset_id: "a1", adset_name: "AdA", campaign_id: "c", campaign_name: "C", spend: 200, messaging: 5, purchases: 5, purchase_value: 1000, impressions: 1000, clicks: 50, ctr: 5, cpm: 10, reach: 500 },
        ];
      }
      // prior period: ROAS = 2.0 → delta = +150%
      return [
        { adset_id: "a1", adset_name: "AdA", campaign_id: "c", campaign_name: "C", spend: 200, messaging: 5, purchases: 2, purchase_value: 400, impressions: 1000, clicks: 50, ctr: 5, cpm: 10, reach: 500 },
      ];
    });

    const result = await getTopAds(1, { preset: "7d" });
    expect(result).toHaveLength(1);
    expect(result[0].deltaPct).toBe(150);
  });
});
