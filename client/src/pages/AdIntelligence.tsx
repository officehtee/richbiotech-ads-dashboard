/**
 * Deep Ads Analysis (Round 7.24) — ad-day grain
 *
 * 21-column table: 1 row = 1 ad × 1 date.
 * Phase 2/3/4 features:
 *   - Inline editing of 5 manual fields (Orders / SalesCount / SalesAmount / ScaleNew / Note)
 *   - Sortable columns, NEW badge, quick filter chips, freeze first 3 cols (วันที่, Preview, บัญชี)
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  exportCSV,
  formatCurrency,
  formatDateNumeric,
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
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type SortKey =
  | "date"
  | "spend"
  | "ctr"
  | "reach"
  | "messages"
  | "costPerMessage"
  | "metaOrders"
  | "costPerOrder"
  | "chatToOrderRate"
  | "metaSalesAmount"
  | "roas"
  | "adsSpendPct"
  | "prevDayScale"
  | "manualScaleNextAmount"
  | "dailyBudget";

type QuickFilter =
  | "all"
  | "high-roas"
  | "low-roas"
  | "no-orders"
  | "new"
  | "wait"
  | "reject";

/**
 * "NEW" if the campaign's first-ever ad run is within the last 3 days
 * (compared with the actual current date — NOT the dateTo filter).
 *
 * - campaignFirstDate: MIN(date) of the campaign across the entire dataset
 *   (already provided by the backend, not constrained by the date filter)
 * - today: actual current date (Date object); fall back to new Date() when omitted
 * - returns true when (today - firstDate) <= 3 days
 *
 * The function is exported only for testing purposes.
 */
/**
 * Format Date → "HH:MM" (24h, local timezone) — ใช้ข้างปุ่ม Sync Now
 * ถ้า sync ช่วง ± 24 ชม. ให้แสดงเฉพาะเวลา (HH:MM); ถ้าเกินกว่านั้นให้แสดง DD/MM HH:MM
 */
export function formatLastSync(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (sameDay) return `${hh}:${mm}`;
  const dd = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mon} ${hh}:${mm}`;
}

export function isCampaignNew(
  campaignFirstDate: string | null | undefined,
  today: Date = new Date(),
): boolean {
  if (!campaignFirstDate) return false;
  const m = campaignFirstDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const first = new Date(
    Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)),
  ).getTime();
  // Normalize "today" to UTC midnight to avoid local-time drift.
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const days = (todayUtc - first) / (24 * 60 * 60 * 1000);
  return days >= 0 && days <= 3;
}

export default function AdIntelligence() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  // Round 7.32: default "เมื่อวาน" — flow พนักงานลงข้อมูลย้อนหลัง 1 วัน
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "yesterday" });
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // Round 7.26: Preview click → popup zoom
  const [previewModal, setPreviewModal] = useState<
    { url: string; title: string } | null
  >(null);

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

  // Round 7.32: silent auto-sync ทุก 15 นาที + show "อัปเดตล่าสุด: HH:MM"
  const statusQuery = trpc.deepAds.syncStatus.useQuery(undefined, {
    refetchInterval: 60_000, // ทุก 1 นาที ตรวจเวลา sync ล่าสุดของ server (cron ยิงทุก 15 นาที)
    refetchOnWindowFocus: true,
  });
  const lastSyncedAt = statusQuery.data?.latestSyncedAt ?? null;

  const syncMutation = trpc.deepAds.syncNow.useMutation({
    onSuccess: (r) => {
      toast.success(
        `Sync เสร็จ: ${r.rowsSynced} แถว · พรีวิว ${r.previewsRefreshed} · ${r.accountsProcessed} บัญชี${r.failed ? ` · ล้มเหลว ${r.failed}` : ""}`,
      );
      listQuery.refetch();
      statusQuery.refetch();
    },
    onError: (e) => toast.error(`Sync ล้มเหลว: ${e.message}`),
  });

  // Round 7.32: silent refresh ทุก 15 นาที เพื่อดึงข้อมูลล่าสุดจาก server
  // (server มี cron sync ทุก 15 นาที เขียนข้อมูลสดลง DB — client แค่ refetch)
  // ไม่ยิง syncNow เองเพื่อป้องกันชน Meta API rate limit จากหลาย client พร้อมกัน
  useEffect(() => {
    const id = setInterval(() => {
      // refetch ทั้งข้อมูลและเวลาสดล่าสุด — silent (ไม่มี toast)
      listQuery.refetch();
      statusQuery.refetch();
    }, 15 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupTargetById = useMemo(() => {
    const m = new Map<number, number>();
    for (const g of groupsQuery.data ?? []) m.set(g.id, g.roasTarget ?? 2);
    return m;
  }, [groupsQuery.data]);

  const sorted = useMemo(() => {
    const list = listQuery.data ?? [];
    // Use real "today" (system clock) for NEW detection, never dateTo.
    const todayObj = new Date();
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
        return (r.metaOrders ?? 0) === 0 && (r.spend ?? 0) > 0;
      }
      if (quickFilter === "new")
        return (
          (r as any).statusBadge === "NEW" ||
          isCampaignNew((r as any).campaignFirstDate, todayObj)
        );
      if (quickFilter === "wait") return (r as any).statusBadge === "WAIT";
      if (quickFilter === "reject") return (r as any).statusBadge === "REJECT";
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
      salesAmount = 0;
    for (const r of sorted) {
      spend += r.spend ?? 0;
      clicks += r.clicks ?? 0;
      messages += r.messages ?? 0;
      orders += r.metaOrders ?? 0;
      salesAmount += r.metaSalesAmount ?? 0;
    }
    return {
      spend,
      clicks,
      messages,
      orders,
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
        "การเข้าถึง",
        "ทัก",
        "ค่าคลิก",
        "Orders",
        "ต้นทุน/ซื้อ",
        "%ทัก/ลูกค้า",
        "ค่าคอนเวอร์ชั่นการซื้อ",
        "ROAS",
        "%ค่า ADS",
        "ยอดเก่า",
        "ยอดใหม่",
        "หมายเหตุ",
        "ยอดยิง",
      ],
      sorted.map((r) => [
        formatDateNumeric(r.date),
        r.accountNickname ?? "",
        r.groupName ?? "",
        r.pageName ?? "",
        r.campaignName ?? "",
        r.adName ?? "",
        r.spend ?? 0,
        r.ctr ?? 0,
        r.reach ?? 0,
        r.messages ?? 0,
        r.costPerMessage ?? 0,
        r.metaOrders ?? 0,
        r.costPerOrder ?? 0,
        r.chatToOrderRate ?? 0,
        r.metaSalesAmount ?? 0,
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

  // Inline edit mutation — Optimistic Update (Round 7.29)
  // อัพ UI ทันทีโดยไม่รอ server; ถ้า server error ให้ revert กลับ
  const utils = trpc.useUtils();
  const updateManual = trpc.deepAds.updateManual.useMutation({
    onMutate: async (input) => {
      // ยกเลิก query ที่กำลัง in-flight เพื่อไม่ให้ overwrite optimistic
      await utils.deepAds.list.cancel();
      // snapshot ค่าเดิมไว้ rollback
      const prev = utils.deepAds.list.getData({
        dateFrom,
        dateTo,
        search: search.trim() || undefined,
        accountId: accountFilter === "all" ? undefined : parseInt(accountFilter, 10),
        groupId: groupFilter === "all" ? undefined : parseInt(groupFilter, 10),
      });
      // อัพ cache ทันที
      utils.deepAds.list.setData(
        {
          dateFrom,
          dateTo,
          search: search.trim() || undefined,
          accountId: accountFilter === "all" ? undefined : parseInt(accountFilter, 10),
          groupId: groupFilter === "all" ? undefined : parseInt(groupFilter, 10),
        },
        (old) => {
          if (!old) return old;
          return old.map((row) => {
            if (row.adId !== input.adId || row.date !== input.date) return row;
            const numVal =
              input.value == null || input.value === ""
                ? null
                : typeof input.value === "number"
                  ? input.value
                  : Number(input.value);
            if (input.field === "scaleNextAmount") return { ...row, manualScaleNextAmount: numVal };
            if (input.field === "note")
              return {
                ...row,
                manualNote:
                  input.value == null ? null : String(input.value),
              };
            return row;
          });
        },
      );
      return { prev };
    },
    onError: (e, _input, ctx) => {
      // revert กลับค่าเดิม
      if (ctx?.prev !== undefined) {
        utils.deepAds.list.setData(
          {
            dateFrom,
            dateTo,
            search: search.trim() || undefined,
            accountId: accountFilter === "all" ? undefined : parseInt(accountFilter, 10),
            groupId: groupFilter === "all" ? undefined : parseInt(groupFilter, 10),
          },
          ctx.prev,
        );
      }
      toast.error(`บันทึกล้มเหลว: ${e.message}`);
    },
    onSettled: () => {
      // sync กับ server เสมอหลัง mutation เสร็จ (ทั้ง success + error)
      utils.deepAds.list.invalidate();
    },
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
        <div className="flex flex-col items-end gap-1.5">
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
          {/* Round 7.32: แสดงเวลาสิงค์ล่าสุด (auto-sync ทุก 15 นาที) */}
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
              aria-hidden="true"
            />
            <span>
              {lastSyncedAt
                ? `อัปเดตล่าสุด: ${formatLastSync(lastSyncedAt)}`
                : "ยังไม่มีข้อมูล sync"}
            </span>
            <span className="text-muted-foreground/70">· sync อัตโนมัติทุก 15 นาที</span>
          </div>
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
              { k: "new", label: "NEW (แคมเปญใหม่ไม่เกิน 3 วัน)" },
              { k: "wait", label: "WAIT (รออนุมัติ)" },
              { k: "reject", label: "REJECT (ถูกปฏิเสธ)" },
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
            <thead className="bg-muted/50 sticky top-0 z-20">
              {/* Tier 1: column group headers */}
              <tr className="text-center text-[11px] uppercase tracking-wider text-muted-foreground">
                <th
                  colSpan={6}
                  className="px-3 py-2 bg-muted/80 border-b border-r border-border font-semibold"
                >
                  มิติ (Dimensions)
                </th>
                <th
                  colSpan={11}
                  className="px-3 py-2 bg-muted/80 border-b border-r border-border font-semibold"
                >
                  ตัวชี้วัด (Metrics)
                </th>
                <th
                  colSpan={2}
                  className="px-3 py-2 bg-cyan-50 dark:bg-cyan-950/30 border-b border-border font-semibold text-cyan-700 dark:text-cyan-300 scaling-zone-edge-left scaling-zone-edge-right"
                >
                  ต่อแอด (Scaling)
                </th>
                <th
                  colSpan={2}
                  className="px-3 py-2 bg-muted/80 border-b border-l border-border font-semibold"
                >
                  หมายเหตุ + งบ
                </th>
              </tr>
              {/* Tier 2: individual columns */}
              <tr className="text-left">
                <th className="px-4 py-3 sticky left-0 bg-muted/80 z-20 w-[120px] min-w-[120px] whitespace-nowrap">
                  <SortBtn k="date" label="วันที่" />
                </th>
                <th className="px-3 py-3 sticky left-[120px] bg-muted/80 z-20 w-[72px] min-w-[72px] whitespace-nowrap">Preview</th>
                <th className="px-4 py-3 sticky left-[192px] bg-muted/80 z-20 min-w-[140px] whitespace-nowrap">บัญชี</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[120px]">Group</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[140px]">Page</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[320px] border-r border-border">Campaign</th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">
                  <SortBtn k="spend" label="ค่า ADS" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[100px]">
                  <SortBtn k="ctr" label="CTR" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[100px]">
                  <SortBtn k="reach" label="การเข้าถึง" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[100px]">
                  <SortBtn k="messages" label="ทัก" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">
                  <SortBtn k="costPerMessage" label="ค่าคลิก" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">
                  <SortBtn k="metaOrders" label="Orders" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[120px]">
                  <SortBtn k="costPerOrder" label="ต้นทุน/ซื้อ" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">
                  <SortBtn k="chatToOrderRate" label="%ทัก/ลูกค้า" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[120px]">
                  <SortBtn k="metaSalesAmount" label="ค่าคอนเวอร์ชั่นการซื้อ" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">
                  <SortBtn k="roas" label="ROAS" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px] border-r border-border">
                  <SortBtn k="adsSpendPct" label="%ค่า ADS" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px] scaling-zone-edge-left bg-cyan-50/40 dark:bg-cyan-950/15">
                  <SortBtn k="prevDayScale" label="ยอดเก่า" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[120px] scaling-zone-edge-right bg-cyan-50/40 dark:bg-cyan-950/15">
                  <SortBtn k="manualScaleNextAmount" label="ยอดใหม่" />
                </th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[260px] bg-amber-50 dark:bg-amber-950/30">
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
                      const newBadgeLegacy = isCampaignNew(
                        (r as any).campaignFirstDate,
                        new Date(),
                      );
                      // Round 7.35: ป้ายสถานะจาก backend (WAIT/NEW/REJECT) มาก่อน
                      // NEW เดิม (legacy by first-run date) ใช้เป็น fallback ถ้า backend ไม่มี badge
                      const backendBadge = (r as any).statusBadge as
                        | "WAIT"
                        | "NEW"
                        | "REJECT"
                        | "NORMAL"
                        | undefined;
                      const statusKind: "WAIT" | "NEW" | "REJECT" | "NORMAL" =
                        backendBadge && backendBadge !== "NORMAL"
                          ? backendBadge
                          : newBadgeLegacy
                            ? "NEW"
                            : "NORMAL";
                      const isReject = statusKind === "REJECT";
                      const isNoSpend = (r as any).isNoSpendRow === true;
                      return (
                        <tr
                          key={r.id}
                          className="border-t hover:bg-muted/40 transition-colors"
                        >
                          <td className="px-4 py-4 sticky left-0 bg-background z-10 whitespace-nowrap border-t">
                            <span className="font-medium tabular-nums">
                              {formatDateNumeric(r.date)}
                            </span>
                          </td>
                          <td className="px-3 py-4 sticky left-[120px] bg-background z-10 border-t">
                            {r.previewCachedUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewModal({
                                    url: r.previewCachedUrl!,
                                    title: r.adName ?? r.campaignName ?? "Preview",
                                  })
                                }
                                className="block h-[60px] w-[48px] rounded-md border bg-muted/30 overflow-hidden hover:ring-2 hover:ring-primary transition"
                                title="คลิกเพื่อดูรูปเต็ม"
                              >
                                <img
                                  src={r.previewCachedUrl}
                                  alt={r.adName ?? ""}
                                  className="h-full w-full object-contain"
                                  loading="lazy"
                                />
                              </button>
                            ) : (
                              <div className="h-[60px] w-[48px] rounded-md border bg-muted/40 flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 sticky left-[192px] bg-background z-10 whitespace-nowrap border-t">
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
                          <td className="px-4 py-4 border-t border-r border-border">
                            <div className="flex items-start gap-2">
                              <Tooltip>
                                <TooltipTrigger
                                  className={`text-left leading-snug flex-1 min-w-0 ${
                                    isReject
                                      ? "text-red-600 dark:text-red-400 font-semibold"
                                      : ""
                                  }`}
                                >
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
                                  {(r as any).effectiveStatus && (
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      Meta status: {(r as any).effectiveStatus}
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                              {statusKind === "WAIT" && (
                                <span
                                  className="neon-blink-wait inline-flex items-center rounded px-1.5 text-[10px] font-bold leading-4 tracking-wider shrink-0 mt-0.5"
                                  title="รอ Meta อนุมัติ"
                                >
                                  WAIT
                                </span>
                              )}
                              {statusKind === "NEW" && (
                                <span
                                  className="neon-blink inline-flex items-center rounded px-1.5 text-[10px] font-bold leading-4 tracking-wider shrink-0 mt-0.5"
                                  title="แคมเปญใหม่ — อนุมัติไม่เกิน 3 วัน"
                                >
                                  NEW
                                </span>
                              )}
                              {statusKind === "REJECT" && (
                                <span
                                  className="neon-blink-reject inline-flex items-center rounded px-1.5 text-[10px] font-bold leading-4 tracking-wider shrink-0 mt-0.5"
                                  title="ถูก Meta ปฏิเสธ — จะแสดงค้าง 5 วันแล้วลบออก"
                                >
                                  REJECT
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t text-orange-600 dark:text-orange-400 font-medium">
                            {isNoSpend ? (
                              <span className="text-muted-foreground font-normal">—</span>
                            ) : (
                              formatCurrency(r.spend ?? 0, 0)
                            )}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t">
                            {isNoSpend ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              formatPercent(r.ctr ?? 0, 2)
                            )}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t">
                            {isNoSpend ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              formatNumber(r.reach ?? 0)
                            )}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t text-blue-600 dark:text-blue-400 font-medium">
                            {isNoSpend ? (
                              <span className="text-muted-foreground font-normal">—</span>
                            ) : (
                              formatNumber(r.messages ?? 0)
                            )}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t">
                            {r.costPerMessage != null
                              ? formatCurrency(r.costPerMessage, 2)
                              : "—"}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t text-emerald-700 dark:text-emerald-400 font-medium">
                            {isNoSpend ? (
                              <span className="text-muted-foreground font-normal">—</span>
                            ) : (
                              formatNumber(r.metaOrders ?? 0)
                            )}
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
                          <td className="px-4 py-4 text-right tabular-nums border-t text-amber-700 dark:text-amber-400 font-medium">
                            {isNoSpend ? (
                              <span className="text-muted-foreground font-normal">—</span>
                            ) : (
                              formatNumber(r.metaSalesAmount ?? 0, 0)
                            )}
                          </td>
                          <td
                            className={`px-4 py-4 text-right tabular-nums border-t font-semibold ${
                              r.roas == null
                                ? "text-muted-foreground"
                                : "text-violet-600 dark:text-violet-400"
                            } ${roasColor}`}
                          >
                            {r.roas != null ? formatRoas(r.roas) : "—"}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t border-r border-border">
                            {r.adsSpendPct != null
                              ? formatPercent(r.adsSpendPct, 1)
                              : "—"}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t scaling-zone-edge-left scaling-zone-cell text-muted-foreground">
                            {r.prevDayScale != null
                              ? formatNumber(r.prevDayScale, 0)
                              : "—"}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums border-t scaling-zone-edge-right scaling-zone-cell">
                            <InlineNumber
                              dashedNeon
                              accentClass="text-cyan-700 dark:text-cyan-300"
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
                          <td className="px-4 py-4 border-t bg-amber-50/30 dark:bg-amber-950/10 align-top">
                            <NoteCell
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
                          <td className="px-4 py-4 text-right tabular-nums border-t text-orange-600 dark:text-orange-400 font-medium">
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
                    รวม ({sorted.length}) — ตัวชี้วัดรวม
                  </td>
                  {/* spend */}
                  <td className="px-4 py-3 text-right tabular-nums border-t-2">
                    {formatCurrency(summary.spend, 0)}
                  </td>
                  {/* ctr */}
                  <td className="px-4 py-3 border-t-2"></td>
                  {/* reach */}
                  <td className="px-4 py-3 border-t-2"></td>
                  {/* messages */}
                  <td className="px-4 py-3 text-right tabular-nums border-t-2">
                    {formatNumber(summary.messages)}
                  </td>
                  {/* costPerMessage */}
                  <td className="px-4 py-3 border-t-2"></td>
                  {/* orders */}
                  <td className="px-4 py-3 text-right tabular-nums border-t-2">
                    {formatNumber(summary.orders)}
                  </td>
                  {/* costPerOrder */}
                  <td className="px-4 py-3 text-right tabular-nums border-t-2">
                    {summary.costPerOrder != null
                      ? formatCurrency(summary.costPerOrder, 0)
                      : "—"}
                  </td>
                  {/* chatToOrderRate */}
                  <td className="px-4 py-3 border-t-2"></td>
                  {/* salesAmount */}
                  <td className="px-4 py-3 text-right tabular-nums border-t-2">
                    {formatNumber(summary.salesAmount)}
                  </td>
                  {/* roas */}
                  <td className="px-4 py-3 text-right tabular-nums border-t-2">
                    {summary.roas != null ? formatRoas(summary.roas) : "—"}
                  </td>
                  {/* adsSpendPct (border-r) */}
                  <td className="px-4 py-3 border-t-2 border-r border-border"></td>
                  {/* prevDayScale (scaling left) */}
                  <td className="px-4 py-3 border-t-2 scaling-zone-edge-left scaling-zone-cell"></td>
                  {/* scaleNew (scaling right) */}
                  <td className="px-4 py-3 border-t-2 scaling-zone-edge-right scaling-zone-cell"></td>
                  {/* note */}
                  <td className="px-4 py-3 border-t-2"></td>
                  {/* dailyBudget */}
                  <td className="px-4 py-3 border-t-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Round 7.26 — Legend + วิธีอ่านโซนต่อแอด */}
      <Card className="p-4 space-y-3">
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            อธิบายสี (Legend)
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <LegendDot color="bg-orange-500" label="ค่า ADS / ยอดยิง" />
            <LegendDot color="bg-blue-500" label="ทัก" />
            <LegendDot color="bg-emerald-500" label="Orders" />
            <LegendDot color="bg-amber-500" label="ค่าคอนเวอร์ชั่นการซื้อ" />
            <LegendDot color="bg-violet-500" label="ROAS" />
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded border-2 border-dashed border-cyan-500" />
              <span>ช่องกรอกมือ — ยังไม่ได้กรอก (เส้นประ)</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded border-2 border-solid border-cyan-500" />
              <span>ช่องกรอกมือ — กรอกแล้ว (เส้นทึบ)</span>
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Orders · ค่าคอนเวอร์ชั่นการซื้อ · ROAS · ยอดยิง — ดึงจาก Meta อัตโนมัติ (ไม่ต้องกรอกมือ)
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            วิธีอ่านโซน “ต่อแอด (Scaling)”
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="font-semibold text-foreground">ยอดเก่า</span>
              <span className="text-muted-foreground">
                {" "}= ยอด “ยอดใหม่” ที่ผู้สเกลแอดกรอกไว้เมื่อวาน (ระบบเลื่อนให้เอง · ย้อนได้ 1 วัน · แก้ไม่ได้)
              </span>
            </div>
            <div>
              <span className="font-semibold text-foreground">ยอดใหม่</span>
              <span className="text-muted-foreground">
                {" "}= ผู้สเกลแอดกรอกหลังเที่ยงคืน สั่งงบสำหรับพรุ่งนี้
              </span>
            </div>
            <div>
              <span className="font-semibold text-foreground">หมายเหตุ</span>
              <span className="text-muted-foreground">
                {" "}= ผู้สเกลแอดเขียนเหตุผลที่สเกล
              </span>
            </div>
            <div>
              <span className="font-semibold text-foreground">ยอดยิง</span>
              <span className="text-muted-foreground">
                {" "}= งบจริงที่พนักงานยิงวันนี้ (ดึงจาก Meta)
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Preview popup (Round 7.26) */}
      <Dialog
        open={!!previewModal}
        onOpenChange={(open) => {
          if (!open) setPreviewModal(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl p-4">
          <DialogTitle className="text-sm pr-6 truncate">
            {previewModal?.title}
          </DialogTitle>
          {previewModal && (
            <div className="mt-2 flex justify-center bg-muted/40 rounded-lg p-3">
              <img
                src={previewModal.url}
                alt={previewModal.title}
                className="max-h-[78vh] max-w-full rounded-md object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* Round 7.26 — Legend dot helper (kept local since only used in this file) */
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block w-3 h-3 rounded-sm ${color}`} />
      <span>{label}</span>
    </span>
  );
}

/* ============================================================
 * Inline editors
 * ============================================================ */

function InlineNumber({
  value,
  onSave,
  fmt,
  dashedNeon = false,
  accentClass = "",
}: {
  value: number | null | undefined;
  onSave: (v: number | null) => void;
  fmt?: (v: number) => string;
  dashedNeon?: boolean;
  accentClass?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value == null ? "" : String(value));

  if (!editing) {
    return (
      <button
        type="button"
        className={`w-full text-right hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded px-1.5 py-1 -mx-1 ${dashedNeon ? (value == null ? "editable-neon-dashed" : "editable-neon-solid") : ""} ${accentClass}`}
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
      className={`h-8 text-right text-sm ${accentClass}`}
      inputMode="decimal"
    />
  );
}

/**
 * NoteCell — Round 7.26
 * - อยู่ในโหมดปกติ: clamp 2 บรรทัด + ... → ทุกแถวสูงเท่ากัน
 * - hover ขึ้น tooltip popup ชี้ข้อความเต็ม + ขึ้นบรรทัดใหม่ได้
 * - คลิก → เข้า edit mode (textarea พิมพ์ยาวได้) จนกว่าจะ blur/Ctrl+Enter จึงบันทึก
 */
function NoteCell({
  value,
  onSave,
}: {
  value: string | null | undefined;
  onSave: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? "");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      const el = ref.current;
      if (el) {
        // ขยาย textarea ตามเนื้อหา + cursor ไปท้าย
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
  }, [editing]);

  if (editing) {
    return (
      <Textarea
        ref={ref}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
        }}
        onBlur={() => {
          setEditing(false);
          const v = text.trim() === "" ? null : text;
          if (v !== value) onSave(v);
        }}
        onKeyDown={(e) => {
          // Ctrl/Cmd + Enter = save; Escape = cancel; พิมพ์ Enter ธรรมดาขึ้นบรรทัดใหม่ได้
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            (e.target as HTMLTextAreaElement).blur();
          }
          if (e.key === "Escape") {
            setText(value ?? "");
            setEditing(false);
          }
        }}
        placeholder="เหตุผลที่สเกล / สิ่งที่สังเกต..."
        className="min-h-[64px] max-h-[240px] text-sm leading-snug"
      />
    );
  }

  const hasNote = !!(value && value.trim().length);
  const trigger = (
    <button
      type="button"
      onClick={() => {
        setText(value ?? "");
        setEditing(true);
      }}
      className={`w-full text-left hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded px-1.5 py-1 -mx-1 block ${hasNote ? "editable-neon-solid" : "editable-neon-dashed"}`}
    >
      {hasNote ? (
        <span className="note-clamp text-sm">{value}</span>
      ) : (
        <span className="text-muted-foreground italic text-xs">+ กรอก</span>
      )}
    </button>
  );

  if (!hasNote) return trigger;

  // hover ขึ้น tooltip popup แสดงข้อความเต็ม
  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap break-words text-sm">
        {value}
      </TooltipContent>
    </Tooltip>
  );
}
