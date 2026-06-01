/**
 * Deep Ads Analysis (Round 7.24) — ad-day grain
 *
 * 21-column table: 1 row = 1 ad × 1 date.
 * Phase 2/3/4 features:
 *   - Inline editing of 5 manual fields (Orders / SalesCount / SalesAmount / ScaleNew / Note)
 *   - Sortable columns, NEW badge, quick filter chips, freeze first 2 cols
 *   - Export CSV, summary row, conditional formatting (ROAS vs group target)
 *   - Sync Now button (owner) + auto via heartbeat
 */
import DateRangePicker from "@/components/DateRangePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  exportCSV,
  formatCurrency,
  formatDateShortTh,
  formatNumber,
  formatPercent,
  formatRoas,
  presetToDateRange,
} from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { DateRangeInput } from "@shared/types";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Download,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type SortKey =
  | "date"
  | "spend"
  | "ctr"
  | "messages"
  | "costPerClick"
  | "manualOrders"
  | "costPerOrder"
  | "chatToOrderRate"
  | "manualSalesCount"
  | "manualSalesAmount"
  | "roas"
  | "adsSpendPct"
  | "prevDayScale"
  | "manualScaleNextAmount"
  | "dailyBudget";

type QuickFilter = "all" | "high-roas" | "low-roas" | "no-orders" | "new";

// "NEW" if the row's syncedAt - createdAt < 3 days — we approximate using earliest date in range
function isNew(rowDate: string, todayStr: string): boolean {
  const d1 = new Date(`${rowDate}T00:00:00Z`).getTime();
  const d2 = new Date(`${todayStr}T00:00:00Z`).getTime();
  const days = (d2 - d1) / (24 * 60 * 60 * 1000);
  return days <= 2; // within last 3 days (0, 1, 2)
}

export default function AdIntelligence() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "7d" });
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const accountsQuery = trpc.accounts.list.useQuery();
  const groupsQuery = trpc.groups.list.useQuery();

  const { dateFrom, dateTo } = useMemo(
    () => presetToDateRange(dateRange.preset, dateRange.since, dateRange.until),
    [dateRange],
  );

  const listQuery = trpc.deepAds.list.useQuery({
    dateFrom,
    dateTo,
    search: search.trim() || undefined,
    accountId: accountFilter === "all" ? undefined : parseInt(accountFilter, 10),
    groupId: groupFilter === "all" ? undefined : parseInt(groupFilter, 10),
  });

  const syncMutation = trpc.deepAds.syncNow.useMutation({
    onSuccess: (r) => {
      toast.success(
        `Sync เสร็จ: ${r.rowsSynced} แถว · พรีวิว ${r.previewsRefreshed} · ${r.accountsProcessed} บัญชี${r.failed ? ` · ล้มเหลว ${r.failed}` : ""}`,
      );
      listQuery.refetch();
    },
    onError: (e) => toast.error(`Sync ล้มเหลว: ${e.message}`),
  });

  const groupTargetById = useMemo(() => {
    const m = new Map<number, number>();
    for (const g of groupsQuery.data ?? []) m.set(g.id, g.roasTarget ?? 2);
    return m;
  }, [groupsQuery.data]);

  const sorted = useMemo(() => {
    const list = listQuery.data ?? [];
    const todayStr = dateTo;
    const filtered = list.filter((r) => {
      if (quickFilter === "high-roas") {
        const t = r.groupId ? groupTargetById.get(r.groupId) ?? 2 : 2;
        return (r.roas ?? 0) >= t;
      }
      if (quickFilter === "low-roas") {
        const t = r.groupId ? groupTargetById.get(r.groupId) ?? 2 : 2;
        return (r.roas ?? 0) > 0 && (r.roas ?? 0) < t * 0.75;
      }
      if (quickFilter === "no-orders") {
        return (r.manualOrders ?? 0) === 0 && (r.spend ?? 0) > 0;
      }
      if (quickFilter === "new") return isNew(r.date, todayStr);
      return true;
    });
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortBy];
      const bv = (b as any)[sortBy];
      if (sortBy === "date") {
        return sortDir === "desc"
          ? (b.date || "").localeCompare(a.date || "")
          : (a.date || "").localeCompare(b.date || "");
      }
      const an = typeof av === "number" ? av : -Infinity;
      const bn = typeof bv === "number" ? bv : -Infinity;
      return sortDir === "desc" ? bn - an : an - bn;
    });
  }, [listQuery.data, quickFilter, sortBy, sortDir, dateTo, groupTargetById]);

  const summary = useMemo(() => {
    let spend = 0,
      clicks = 0,
      messages = 0,
      orders = 0,
      salesCount = 0,
      salesAmount = 0;
    for (const r of sorted) {
      spend += r.spend ?? 0;
      clicks += r.clicks ?? 0;
      messages += r.messages ?? 0;
      orders += r.manualOrders ?? 0;
      salesCount += r.manualSalesCount ?? 0;
      salesAmount += r.manualSalesAmount ?? 0;
    }
    return {
      spend,
      clicks,
      messages,
      orders,
      salesCount,
      salesAmount,
      roas: spend > 0 && salesAmount > 0 ? salesAmount / spend : null,
      costPerOrder: orders > 0 ? spend / orders : null,
    };
  }, [sorted]);

  const toggleSort = (k: SortKey) => {
    if (sortBy === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(k);
      setSortDir("desc");
    }
  };

  const onExport = () => {
    exportCSV(
      `deep-ads-${dateFrom}_to_${dateTo}.csv`,
      [
        "วันที่",
        "บัญชี",
        "Group",
        "Page",
        "Campaign",
        "Ad",
        "ค่า ADS",
        "CTR%",
        "ทัก",
        "ค่าคลิก",
        "Orders",
        "ต้นทุน/ซื้อ",
        "%ทัก/ลูกค้า",
        "จำนวนขาย",
        "ยอดขาย",
        "ROAS",
        "%ค่า ADS",
        "ยอดเก่า",
        "ยอดใหม่",
        "หมายเหตุ",
        "ยอดยิง",
      ],
      sorted.map((r) => [
        r.date,
        r.accountNickname ?? "",
        r.groupName ?? "",
        r.pageName ?? "",
        r.campaignName ?? "",
        r.adName ?? "",
        r.spend ?? 0,
        r.ctr ?? 0,
        r.messages ?? 0,
        r.costPerClick ?? 0,
        r.manualOrders ?? 0,
        r.costPerOrder ?? 0,
        r.chatToOrderRate ?? 0,
        r.manualSalesCount ?? 0,
        r.manualSalesAmount ?? 0,
        r.roas ?? 0,
        r.adsSpendPct ?? 0,
        r.prevDayScale ?? 0,
        r.manualScaleNextAmount ?? 0,
        r.manualNote ?? "",
        r.dailyBudget ?? 0,
      ]),
    );
  };

  const onSync = () => {
    syncMutation.mutate({ days: 7 });
  };

  // Inline edit mutation
  const utils = trpc.useUtils();
  const updateManual = trpc.deepAds.updateManual.useMutation({
    onSuccess: () => utils.deepAds.list.invalidate(),
    onError: (e) => toast.error(`บันทึกล้มเหลว: ${e.message}`),
  });

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 hover:text-primary"
      onClick={() => toggleSort(k)}
    >
      {label}
      {sortBy === k ? (
        sortDir === "desc" ? (
          <ArrowDownAZ className="h-3 w-3" />
        ) : (
          <ArrowUpAZ className="h-3 w-3" />
        )
      ) : null}
    </button>
  );

  const totalCount = sorted.length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">วิเคราะห์แอดเชิงลึก</h1>
          <p className="text-sm text-muted-foreground mt-1">
            1 แถว = 1 โฆษณา × 1 วัน · ดึงข้อมูลรายวันจาก Meta + กรอก Orders/Sales เพิ่ม
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={syncMutation.isPending}
              className="bg-background"
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1.5">Sync Now</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={sorted.length === 0}
            className="bg-background"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <Card className="p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <div className="h-5 w-px bg-border mx-1" />
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="ทุกบัญชี" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกบัญชี</SelectItem>
              {(accountsQuery.data ?? []).map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.nickname || a.adAccountId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="ทุกกลุ่ม" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกกลุ่ม</SelectItem>
              {(groupsQuery.data ?? []).map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.groupName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา Ad / Adset / Campaign / Page"
              className="h-8 pl-7 w-56 text-xs"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-muted-foreground">กรองด่วน:</span>
          {(
            [
              { k: "all", label: "ทั้งหมด" },
              { k: "high-roas", label: "ROAS ดี" },
              { k: "low-roas", label: "ROAS ต่ำ" },
              { k: "no-orders", label: "ใช้แล้วยังไม่มี Order" },
              { k: "new", label: "NEW (3 วันล่าสุด)" },
            ] as { k: QuickFilter; label: string }[]
          ).map((f) => (
            <Button
              key={f.k}
              size="sm"
              variant={quickFilter === f.k ? "default" : "outline"}
              className={`h-6 text-xs ${quickFilter === f.k ? "" : "bg-background"}`}
              onClick={() => setQuickFilter(f.k)}
            >
              {f.label}
            </Button>
          ))}
          <div className="flex-1" />
          <span className="text-muted-foreground">{formatNumber(totalCount)} แถว</span>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-sm border-separate border-spacing-0">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-4 py-3 sticky left-0 bg-muted/80 z-20 w-[100px] min-w-[100px] whitespace-nowrap">
                  <SortBtn k="date" label="วันที่" />
                </th>
                <th className="px-3 py-3 sticky left-[100px] bg-muted/80 z-20 w-[64px] min-w-[64px] whitespace-nowrap">Preview</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[140px]">บัญชี</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[120px]">Group</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[140px]">Page</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[320px]">Campaign</th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">
                  <SortBtn k="spend" label="ค่า ADS" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[100px]">
                  <SortBtn k="ctr" label="CTR" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[100px]">
                  <SortBtn k="messages" label="ทัก" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">
                  <SortBtn k="costPerClick" label="ค่าคลิก" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px] bg-amber-50 dark:bg-amber-950/30">
                  <SortBtn k="manualOrders" label="Orders" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[120px]">
                  <SortBtn k="costPerOrder" label="ต้นทุน/ซื้อ" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">
                  <SortBtn k="chatToOrderRate" label="%ทัก/ลูก" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[120px] bg-amber-50 dark:bg-amber-950/30">
                  <SortBtn k="manualSalesCount" label="จำนวนขาย" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[120px] bg-amber-50 dark:bg-amber-950/30">
                  <SortBtn k="manualSalesAmount" label="ยอดขาย" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">
                  <SortBtn k="roas" label="ROAS" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">
                  <SortBtn k="adsSpendPct" label="%ค่า ADS" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">
                  <SortBtn k="prevDayScale" label="ยอดเก่า" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[120px] bg-amber-50 dark:bg-amber-950/30">
                  <SortBtn k="manualScaleNextAmount" label="ยอดใหม่" />
                </th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[200px] bg-amber-50 dark:bg-amber-950/30">
                  หมายเหตุ
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">
                  <SortBtn k="dailyBudget" label="ยอดยิง" />
                </th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      <td colSpan={21} className="px-4 py-4">
                        <Skeleton className="h-9 w-full" />
                      </td>
                    </tr>
                  ))
                : sorted.length === 0
                  ? (
                    <tr>
                      <td
                        colSpan={21}
                        className="px-4 py-16 text-center text-sm text-muted-foreground"
                      >
                        ไม่มีข้อมูล — กดปุ่ม "Sync Now" เพื่อดึงจาก Meta หรือลองเลือกช่วงวันที่อื่น
                      </td>
                    </tr>
                  )
                  : sorted.map((r) => {
                      const target = r.groupId
                        ? groupTargetById.get(r.groupId) ?? 2
                        : 2;
                      const roasColor =
                        r.roas == null
                          ? "text-muted-foreground"
                          : r.roas >= target
                            ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                            : r.roas >= target * 0.75
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400";
                      const todayStr = dateTo;
                      const newBadge = isNew(r.date, todayStr);
                      return (
                        <tr
                          key={r.id}
                          className="border-t hover:bg-muted/40 transition-colors"
                        >
                          <td className="px-4 py-4 sticky left-0 bg-background z-10 whitespace-nowrap border-t">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">
                                {formatDateShortTh(r.date)}
                              </span>
                              {newBadge && (
                                <Badge
                                  variant="default"
                                  className="h-4 px-1 text-[9px]"
                                >
                                  NEW
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-4 sticky left-[100px] bg-background z-10 border-t">
                            {r.previewCachedUrl ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <img
                                    src={r.previewCachedUrl}
                                    alt=""
                                    className="h-8 w-8 rounded object-cover border"
                                    loading="lazy"
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p className="text-xs font-medium">{r.adName}</p>
                                  <img
                                    src={r.previewCachedUrl}
                                    alt=""
                                    className="mt-1 max-h-48 max-w-[16rem] rounded"
                                  />
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="h-8 w-8 rounded border bg-muted/40 flex items-center justify-center">
                                <ImageIcon className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap border-t">
                            {r.accountNickname ?? r.accountMetaId ?? "—"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap border-t">
                            {r.groupName ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5"
                                style={
                                  r.groupColor
                                    ? {
                                        borderColor: r.groupColor,
                                        color: r.groupColor,
                                      }
                                    : undefined
                                }
                              >
                                {r.groupName}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap border-t">
                            {r.pageName ?? "—"}
                          </td>
                          <td className="px-4 py-4 border-t">
                            <Tooltip>
                              <TooltipTrigger className="text-left leading-snug">
                                {r.campaignName ?? "—"}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs font-medium">
                                  Ad: {r.adName ?? "—"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Adset: {r.adsetName ?? "—"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Campaign: {r.campaignName ?? "—"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t">
                            {formatCurrency(r.spend ?? 0, 0)}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t">
                            {formatPercent(r.ctr ?? 0, 2)}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t">
                            {formatNumber(r.messages ?? 0)}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t">
                            {r.costPerClick != null
                              ? formatCurrency(r.costPerClick, 2)
                              : "—"}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t bg-amber-50/30 dark:bg-amber-950/10">
                            <InlineNumber
                              value={r.manualOrders}
                              onSave={(v) =>
                                updateManual.mutate({
                                  adId: r.adId,
                                  date: r.date,
                                  field: "orders",
                                  value: v,
                                })
                              }
                            />
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t">
                            {r.costPerOrder != null
                              ? formatCurrency(r.costPerOrder, 0)
                              : "—"}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t">
                            {r.chatToOrderRate != null
                              ? formatPercent(r.chatToOrderRate, 1)
                              : "—"}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t bg-amber-50/30 dark:bg-amber-950/10">
                            <InlineNumber
                              value={r.manualSalesCount}
                              onSave={(v) =>
                                updateManual.mutate({
                                  adId: r.adId,
                                  date: r.date,
                                  field: "salesCount",
                                  value: v,
                                })
                              }
                            />
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t bg-amber-50/30 dark:bg-amber-950/10">
                            <InlineNumber
                              value={r.manualSalesAmount}
                              onSave={(v) =>
                                updateManual.mutate({
                                  adId: r.adId,
                                  date: r.date,
                                  field: "salesAmount",
                                  value: v,
                                })
                              }
                              fmt={(v) => formatNumber(v, 0)}
                            />
                          </td>
                          <td
                            className={`px-4 py-4 text-right tabular-nums border-t ${roasColor}`}
                          >
                            {r.roas != null ? formatRoas(r.roas) : "—"}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t">
                            {r.adsSpendPct != null
                              ? formatPercent(r.adsSpendPct, 1)
                              : "—"}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t text-muted-foreground">
                            {r.prevDayScale != null
                              ? formatNumber(r.prevDayScale, 0)
                              : "—"}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t bg-amber-50/30 dark:bg-amber-950/10">
                            <InlineNumber
                              value={r.manualScaleNextAmount}
                              onSave={(v) =>
                                updateManual.mutate({
                                  adId: r.adId,
                                  date: r.date,
                                  field: "scaleNextAmount",
                                  value: v,
                                })
                              }
                              fmt={(v) => formatNumber(v, 0)}
                            />
                          </td>
                          <td className="px-4 py-4 border-t bg-amber-50/30 dark:bg-amber-950/10">
                            <InlineText
                              value={r.manualNote}
                              onSave={(v) =>
                                updateManual.mutate({
                                  adId: r.adId,
                                  date: r.date,
                                  field: "note",
                                  value: v,
                                })
                              }
                            />
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t">
                            {r.dailyBudget != null ? (
                              <span>
                                {formatCurrency(r.dailyBudget, 0)}
                                {r.budgetSource === "campaign" && (
                                  <span className="ml-1 text-[9px] text-muted-foreground">
                                    (CBO)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
            </tbody>
            {sorted.length > 0 && (
              <tfoot className="bg-muted/50 font-semibold sticky bottom-0">
                <tr className="border-t-2">
                  <td
                    className="px-4 py-3 sticky left-0 bg-muted/70 z-10 border-t-2"
                    colSpan={6}
                  >
                    รวม ({sorted.length})
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums border-t-2">
                    {formatCurrency(summary.spend, 0)}
                  </td>
                  <td className="px-4 py-3 border-t-2"></td>
                  <td className="px-4 py-3 text-right tabular-nums border-t-2">
                    {formatNumber(summary.messages)}
                  </td>
                  <td className="px-4 py-3 border-t-2"></td>
                  <td className="px-4 py-3 text-right tabular-nums border-t-2">
                    {formatNumber(summary.orders)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums border-t-2">
                    {summary.costPerOrder != null
                      ? formatCurrency(summary.costPerOrder, 0)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 border-t-2"></td>
                  <td className="px-4 py-3 text-right tabular-nums border-t-2">
                    {formatNumber(summary.salesCount)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums border-t-2">
                    {formatNumber(summary.salesAmount)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums border-t-2">
                    {summary.roas != null ? formatRoas(summary.roas) : "—"}
                  </td>
                  <td className="px-4 py-3 border-t-2"></td>
                  <td className="px-4 py-3 border-t-2"></td>
                  <td className="px-4 py-3 border-t-2"></td>
                  <td className="px-4 py-3 border-t-2"></td>
                  <td className="px-4 py-3 border-t-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
 * Inline editors
 * ============================================================ */

function InlineNumber({
  value,
  onSave,
  fmt,
}: {
  value: number | null | undefined;
  onSave: (v: number | null) => void;
  fmt?: (v: number) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value == null ? "" : String(value));

  if (!editing) {
    return (
      <button
        type="button"
        className="w-full text-right hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded px-1.5 py-1 -mx-1"
        onClick={() => {
          setText(value == null ? "" : String(value));
          setEditing(true);
        }}
      >
        {value == null ? (
          <span className="text-muted-foreground italic text-xs">+ กรอก</span>
        ) : fmt ? (
          fmt(value)
        ) : (
          formatNumber(value)
        )}
      </button>
    );
  }
  return (
    <Input
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setEditing(false);
        const n = text.trim() === "" ? null : Number(text);
        if (n !== value && !(n != null && !Number.isFinite(n))) onSave(n);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setText(value == null ? "" : String(value));
          setEditing(false);
        }
      }}
      className="h-8 text-right text-sm"
      inputMode="decimal"
    />
  );
}

function InlineText({
  value,
  onSave,
}: {
  value: string | null | undefined;
  onSave: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? "");

  if (!editing) {
    return (
      <button
        type="button"
        className="w-full text-left hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded px-1.5 py-1 -mx-1 block"
        onClick={() => {
          setText(value ?? "");
          setEditing(true);
        }}
        title={value ?? ""}
      >
        {value ? (
          <span className="leading-snug">{value}</span>
        ) : (
          <span className="text-muted-foreground italic text-xs">+ กรอก</span>
        )}
      </button>
    );
  }
  return (
    <Input
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setEditing(false);
        const v = text.trim() === "" ? null : text;
        if (v !== value) onSave(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setText(value ?? "");
          setEditing(false);
        }
      }}
      className="h-8 text-sm"
    />
  );
}
