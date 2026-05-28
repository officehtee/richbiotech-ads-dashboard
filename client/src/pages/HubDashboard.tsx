import DateRangePicker from "@/components/DateRangePicker";
import KpiCard from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  exportCSV,
  formatCompact,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRoas,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { DateRangeInput } from "@shared/types";
import {
  Activity,
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Banknote,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Flame,
  LineChart as LineChartIcon,
  MessageCircle,
  Minus,
  Moon,
  Package,
  RefreshCw,
  Rocket,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  ShoppingCart,
  Megaphone,
  Pause,
  Check,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Link } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

type Persona = "buyer" | "sales";

const URGENCY_ICON: Record<string, typeof Flame> = { Flame, TrendingUp, Moon };

/* ============================================================
 * Top Toolbar
 * ============================================================ */
function PersonaPills({ value, onChange }: { value: Persona; onChange: (v: Persona) => void }) {
  const items: { key: Persona; label: string; icon: typeof Target }[] = [
    { key: "buyer", label: "Buyer", icon: Target },
    { key: "sales", label: "Sales", icon: MessageCircle },
  ];
  return (
    <div className="inline-flex h-9 items-center rounded-lg border border-border bg-muted/50 p-0.5">
      {items.map((it) => {
        const active = value === it.key;
        const Icon = it.icon;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-all",
              active
                ? "bg-blue-600 text-white shadow-[0_2px_8px_-2px_rgba(37,99,235,0.6)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function AccountSelector({
  value,
  onChange,
  totalCount,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  totalCount: number;
}) {
  const accounts = trpc.accounts.list.useQuery();
  const list = accounts.data ?? [];
  const label =
    value === null
      ? `ทุกบัญชี · ${totalCount} accounts`
      : list.find((a) => a.id === value)?.nickname ?? `Account #${value}`;
  return (
    <Select
      value={value === null ? "all" : String(value)}
      onValueChange={(v) => onChange(v === "all" ? null : Number(v))}
    >
      <SelectTrigger className="h-9 w-[220px] border-border bg-muted/50 text-foreground [&>svg]:text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.7)]" />
          <span className="truncate text-sm">{label}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">ทุกบัญชี · {totalCount} accounts</SelectItem>
        {list.map((a) => (
          <SelectItem key={a.id} value={String(a.id)}>
            {a.nickname ?? a.adAccountId}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ============================================================
 * Section: Revenue vs Spend area chart (30 days)
 * ============================================================ */
function RevenueVsSpendChart({ dateRange }: { dateRange: DateRangeInput }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const chartColors = {
    grid: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    axis: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    tick: isDark ? "#71717a" : "#52525b",
    tooltipBg: isDark ? "#0a0d12" : "#ffffff",
    tooltipBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    tooltipLabel: isDark ? "#a1a1aa" : "#52525b",
    activeDotFill: isDark ? "#0d1117" : "#ffffff",
  };
  // Always force 30d preset for this chart per reference design
  const q = trpc.dashboard.revenueVsSpend.useQuery(
    { dateRange: { preset: "30d" } },
    { refetchInterval: 5 * 60 * 1000 },
  );
  const data = (q.data ?? []).map((d, i) => ({
    idx: i + 1,
    date: d.date.slice(5),
    revenue: Math.round(d.revenue),
    spend: Math.round(d.spend),
  }));

  return (
    <Card className="bg-card border-border p-5 lg:col-span-2">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground inline-flex items-center gap-2">
            <LineChartIcon className="h-4 w-4 text-blue-400" />
            รายได้ vs. ค่าโฆษณา
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">30 วันล่าสุด · รายวัน</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            รายได้
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            ค่าโฆษณา
          </span>
        </div>
      </div>
      <div className="h-[280px]">
        {q.isLoading ? (
          <Skeleton className="h-full w-full bg-muted" />
        ) : data.length < 2 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            ยังไม่มีข้อมูล 30 วันล่าสุด
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="spdGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                dataKey="idx"
                tick={{ fill: chartColors.tick, fontSize: 10 }}
                axisLine={{ stroke: chartColors.axis }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCompact(Number(v))}
                tick={{ fill: chartColors.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <RTooltip
                contentStyle={{
                  background: chartColors.tooltipBg,
                  border: `1px solid ${chartColors.tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: isDark ? "#fff" : "#18181b",
                }}
                labelStyle={{ color: chartColors.tooltipLabel }}
                formatter={(v: number, name: string) => [formatCurrency(v), name]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="รายได้"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#revGrad)"
                dot={false}
                activeDot={{ r: 4, stroke: "#3b82f6", fill: chartColors.activeDotFill }}
              />
              <Line
                type="monotone"
                dataKey="spend"
                name="ค่าโฆษณา"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Legend wrapperStyle={{ display: "none" }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

/* ============================================================
 * Section: Group breakdown with Spend/ROAS toggle
 * ============================================================ */
function GroupBreakdown({ dateRange }: { dateRange: DateRangeInput }) {
  const [mode, setMode] = useState<"spend" | "roas">("spend");
  const q = trpc.dashboard.groupBreakdown.useQuery(
    { dateRange },
    { refetchInterval: 5 * 60 * 1000 },
  );
  const rows = q.data ?? [];
  return (
    <Card className="bg-card border-border p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground inline-flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-fuchsia-400" />
            แยกตามกลุ่มสินค้า
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mode === "spend" ? "สัดส่วนการใช้จ่าย" : "ROAS เทียบเป้า"} · งวดที่เลือก
          </p>
        </div>
        <div className="inline-flex h-7 rounded-md border border-border bg-muted/50 p-0.5 text-xs">
          {(["spend", "roas"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "h-6 rounded px-3 font-medium transition-all",
                mode === m ? "bg-muted-foreground/30 text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "spend" ? "Spend" : "ROAS"}
            </button>
          ))}
        </div>
      </div>
      {q.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">ยังไม่มีกลุ่มสินค้า</p>
      ) : (
        <ul className="space-y-3">
          {rows.slice(0, 5).map((g) => {
            const pct = mode === "spend" ? g.spendPct : g.roasPct;
            const value =
              mode === "spend" ? formatCurrency(g.spend) : `${formatRoas(g.roas)}x`;
            return (
              <li key={g.groupId} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="inline-flex items-center gap-2 min-w-0 text-foreground">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: g.color }}
                    />
                    <span className="truncate">{g.groupName}</span>
                  </span>
                  <span className="num font-semibold text-white shrink-0">{value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      backgroundColor: g.color,
                      boxShadow: `0 0 6px ${g.color}88`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ============================================================
 * Section: Smart Scaling recommendations
 * ============================================================ */
const ACTION_BADGE: Record<
  "เพิ่มงบ" | "คงงบ" | "ลดงบ" | "หยุด",
  { color: string; icon: typeof Rocket }
> = {
  เพิ่มงบ: { color: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30", icon: Rocket },
  คงงบ: { color: "bg-blue-500/15 text-blue-400 ring-blue-500/30", icon: Check },
  ลดงบ: { color: "bg-amber-500/15 text-amber-400 ring-amber-500/30", icon: ArrowDown },
  หยุด: { color: "bg-rose-500/15 text-rose-400 ring-rose-500/30", icon: Pause },
};

function SmartScalingPanel({ dateRange }: { dateRange: DateRangeInput }) {
  const q = trpc.dashboard.smartScalingRecommend.useQuery(
    { dateRange },
    { refetchInterval: 10 * 60 * 1000 },
  );
  const rows = q.data ?? [];
  return (
    <Card className="bg-card border-border p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Smart Scaling — แนะนำการปรับงบ
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            5 adset เด่นจาก score = ROAS×0.7 + CTR×0.3
          </p>
        </div>
        <Link
          href="/smart-scaling"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted/50 px-3 text-xs text-foreground hover:text-foreground hover:border-border transition-colors"
        >
          ดูทั้งหมด
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          ยังไม่มี adset ที่ผ่านเงื่อนไข minSpend
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {rows.map((r) => {
            const badge = ACTION_BADGE[r.actionLabel];
            const Icon = badge.icon;
            const isStop = r.actionLabel === "หยุด";
            return (
              <li
                key={r.adsetId}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{r.adsetName}</p>
                  <p className="text-[11px] text-muted-foreground truncate num">
                    {r.pageName ?? "—"} · score {r.score.toFixed(2)}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                    badge.color,
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {r.actionLabel}
                </span>
                <div className="text-right shrink-0 num text-sm">
                  <div className="text-muted-foreground text-xs">{formatCurrency(r.fromBudget)}</div>
                  <div
                    className={cn(
                      "font-semibold",
                      r.toBudget > r.fromBudget && "text-emerald-400",
                      r.toBudget < r.fromBudget && !isStop && "text-amber-400",
                      isStop && "text-rose-400",
                      r.toBudget === r.fromBudget && "text-white",
                    )}
                  >
                    → {formatCurrency(r.toBudget)}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-border bg-muted/50 text-xs text-foreground hover:bg-muted hover:text-foreground"
                  asChild
                >
                  <Link href={`/smart-scaling`}>ปรับ</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ============================================================
 * Section: Top Performing Ads
 * ============================================================ */
function TopPerformingAds({ dateRange }: { dateRange: DateRangeInput }) {
  const q = trpc.dashboard.topAds.useQuery(
    { dateRange },
    { refetchInterval: 10 * 60 * 1000 },
  );
  const rows = q.data ?? [];
  const rankColors = [
    "bg-amber-500 text-amber-950",  // 1
    "bg-blue-500 text-white",       // 2
    "bg-muted-foreground/40 text-foreground",       // 3
    "bg-muted-foreground/30 text-foreground",    // 4
    "bg-muted-foreground/30 text-foreground",    // 5
  ];
  return (
    <Card className="bg-card border-border p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground inline-flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-emerald-400" />
            Top Performing Ads
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Rising Stars · 7 วันล่าสุด</p>
        </div>
      </div>
      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          ยังไม่มี ads ที่ผ่านเงื่อนไข
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.adsetId}
              className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5 ring-1 ring-border hover:ring-border transition-colors"
            >
              <span
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold num shrink-0",
                  rankColors[r.rank - 1] ?? rankColors[4],
                )}
              >
                {r.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{r.adsetName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{r.pageName ?? "—"}</p>
              </div>
              <span className="num text-sm font-bold text-emerald-400 shrink-0">
                {formatRoas(r.roas)}x
              </span>
              <span className="num inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-400 shrink-0">
                <ArrowUp className="h-3 w-3" />+{r.deltaPct}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ============================================================
 * Section: Accounts Table (full-width sortable + 14D sparkline)
 * ============================================================ */
type SortKey = "spend" | "messaging" | "purchases" | "purchaseValue" | "roas" | "status";

function MiniSparkline({ data, status }: { data: number[]; status: string }) {
  if (!data || data.length < 2) return <span className="text-[10px] text-muted-foreground">—</span>;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" L ");
  const color =
    status === "ดี" ? "#10b981" : status === "เฝ้าระวัง" ? "#f59e0b" : "#ef4444";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-6 w-20">
      <path
        d={`M ${pts}`}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function StatusPill({ status }: { status: "ดี" | "เฝ้าระวัง" | "ต่ำกว่าเป้า" }) {
  const cls =
    status === "ดี"
      ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
      : status === "เฝ้าระวัง"
        ? "bg-amber-500/15 text-amber-400 ring-amber-500/30"
        : "bg-rose-500/15 text-rose-400 ring-rose-500/30";
  const dot =
    status === "ดี" ? "bg-emerald-400" : status === "เฝ้าระวัง" ? "bg-amber-400" : "bg-rose-400";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        cls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {status}
    </span>
  );
}

function avatarColor(seed: string): { bg: string; text: string; initials: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const palette = [
    { bg: "#a855f7", text: "#fff" },
    { bg: "#06b6d4", text: "#fff" },
    { bg: "#f59e0b", text: "#fff" },
    { bg: "#ec4899", text: "#fff" },
    { bg: "#14b8a6", text: "#fff" },
    { bg: "#f97316", text: "#fff" },
    { bg: "#6366f1", text: "#fff" },
  ];
  const c = palette[h % palette.length];
  const words = seed.trim().split(/\s+/);
  const initials =
    (words[0]?.[0] ?? "?") + (words[1]?.[0] ?? words[0]?.[1] ?? "");
  return { ...c, initials: initials.toUpperCase() };
}

function AccountsTable({ dateRange }: { dateRange: DateRangeInput }) {
  const q = trpc.dashboard.accountsTable.useQuery(
    { dateRange },
    { refetchInterval: 5 * 60 * 1000 },
  );
  const [sortBy, setSortBy] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const data = q.data ?? [];
  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      if (sortBy === "status") {
        const order = { ดี: 0, เฝ้าระวัง: 1, "ต่ำกว่าเป้า": 2 } as const;
        av = order[a.status as keyof typeof order];
        bv = order[b.status as keyof typeof order];
      } else {
        av = (a as any)[sortBy] ?? 0;
        bv = (b as any)[sortBy] ?? 0;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [data, sortBy, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortBy === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(k);
      setSortDir("desc");
    }
  };

  const Sortable = ({ k, children, align = "right" }: { k: SortKey; children: React.ReactNode; align?: "left" | "right" }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors",
        align === "right" && "justify-end w-full",
      )}
    >
      {children}
      <ArrowDownUp className={cn("h-3 w-3 opacity-60", sortBy === k && "opacity-100 text-blue-400")} />
    </button>
  );

  const onExport = () => {
    exportCSV(
      `accounts-${new Date().toISOString().slice(0, 10)}.csv`,
      ["บัญชี", "กลุ่ม", "Spend", "คนทัก", "Orders", "Revenue", "ROAS", "สถานะ"],
      sorted.map((r) => [
        r.nickname ?? r.adAccountId,
        r.groupName ?? "",
        r.spend,
        r.messaging,
        r.purchases,
        r.purchaseValue,
        r.roas,
        r.status,
      ]),
    );
  };

  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-white">บัญชีโฆษณาทั้งหมด</h3>
          <p className="text-xs text-muted-foreground mt-0.5 num">
            {sorted.length} บัญชีที่กำลังรัน · เรียงตาม {sortBy === "spend" ? "Spend" : sortBy}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-border bg-muted/50 text-foreground hover:bg-muted"
            asChild
          >
            <Link href="/ad-intelligence">
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              วิเคราะห์
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-border bg-muted/50 text-foreground hover:bg-muted"
            onClick={onExport}
            disabled={sorted.length === 0}
          >
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            คอลัมน์
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                บัญชี
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                กลุ่ม
              </TableHead>
              <TableHead className="text-right">
                <Sortable k="spend">Spend</Sortable>
              </TableHead>
              <TableHead className="text-right">
                <Sortable k="messaging">คนทัก</Sortable>
              </TableHead>
              <TableHead className="text-right">
                <Sortable k="purchases">ออเดอร์</Sortable>
              </TableHead>
              <TableHead className="text-right">
                <Sortable k="purchaseValue">รายได้</Sortable>
              </TableHead>
              <TableHead className="text-right">
                <Sortable k="roas">ROAS</Sortable>
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Trend 14D
              </TableHead>
              <TableHead className="text-right">
                <Sortable k="status">สถานะ</Sortable>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell colSpan={9}>
                    <Skeleton className="h-8 w-full bg-muted" />
                  </TableCell>
                </TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  ยังไม่มีบัญชีโฆษณา
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((a) => {
                const seed = a.nickname ?? a.adAccountId;
                const av = avatarColor(seed);
                const roasGood = a.roas >= a.roasTarget;
                return (
                  <TableRow
                    key={a.accountId}
                    className="border-border hover:bg-muted/50 cursor-pointer"
                  >
                    <TableCell>
                      <Link
                        href={`/dashboard?accountId=${a.accountId}`}
                        className="flex items-center gap-3 min-w-0"
                      >
                        <span
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-xs font-bold shrink-0"
                          style={{ backgroundColor: av.bg, color: av.text }}
                        >
                          {av.initials}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-white truncate">
                            {a.nickname ?? a.adAccountId}
                          </span>
                          <span className="block text-[11px] text-muted-foreground truncate num">
                            {a.adAccountId}
                            {a.phaseName ? ` · ${a.phaseName}` : ""}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {a.groupName ? (
                        <span className="text-sm text-foreground">{a.groupName}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right num text-sm text-white font-semibold">
                      {formatCurrency(a.spend)}
                    </TableCell>
                    <TableCell className="text-right num text-sm text-foreground">
                      {formatNumber(a.messaging)}
                    </TableCell>
                    <TableCell className="text-right num text-sm text-foreground">
                      {formatNumber(a.purchases)}
                    </TableCell>
                    <TableCell className="text-right num text-sm text-foreground">
                      {formatCurrency(a.purchaseValue)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right num text-sm font-bold",
                        roasGood ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      {formatRoas(a.roas)}
                    </TableCell>
                    <TableCell>
                      <MiniSparkline data={a.trend14d} status={a.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusPill status={a.status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* ============================================================
 * Existing sections preserved below
 * ============================================================ */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _LiveActivityHero() {
  const realtime = trpc.dashboard.realtime.useQuery(undefined, {
    refetchInterval: 60 * 1000,
  });
  const data = realtime.data;
  const u = data?.urgency;
  const Icon = u ? URGENCY_ICON[u.iconName] ?? Activity : Activity;
  const colorClass =
    u?.color === "danger"
      ? "from-rose-500/15 to-rose-500/5 border-rose-500/30 text-rose-600 dark:text-rose-400"
      : u?.color === "warning"
        ? "from-amber-500/15 to-amber-500/5 border-amber-500/30 text-amber-600 dark:text-amber-400"
        : u?.color === "muted"
          ? "from-muted/40 to-muted/10 border-muted text-muted-foreground"
          : "from-sky-500/15 to-sky-500/5 border-sky-500/30 text-sky-600 dark:text-sky-400";

  const bars = data?.todayBars ?? [];
  const maxBar = Math.max(1, ...bars.map((b) => b.messaging));

  return (
    <Card className={cn("relative overflow-hidden border bg-gradient-to-br p-5", colorClass)}>
      <div className="flex flex-col md:flex-row md:items-center md:gap-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-current opacity-30 animate-ping" />
            <span className="relative block h-3 w-3 rounded-full bg-current" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">สถานะตอนนี้</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Icon className="h-5 w-5" />
              <span className="text-xl font-bold">{u?.label ?? "—"}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-4 md:gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">ทักมาชั่วโมงนี้</p>
            <p className="num text-3xl font-bold mt-0.5 leading-none">
              {realtime.isLoading ? (
                <Skeleton className="h-8 w-16 bg-current/10" />
              ) : (
                formatNumber(data?.messagingLast1h ?? 0)
              )}
            </p>
            <p className="text-xs opacity-70 mt-1">
              เทียบเฉลี่ย {formatNumber(data?.baseline ?? 0, 1)} ทัก/ชม.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">รวมวันนี้</p>
            <p className="num text-3xl font-bold mt-0.5 leading-none">
              {realtime.isLoading ? (
                <Skeleton className="h-8 w-16 bg-current/10" />
              ) : (
                formatNumber(data?.messagingToday ?? 0)
              )}
            </p>
            <p className="text-xs opacity-70 mt-1">ตั้งแต่ 00:00</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">vs. ค่าเฉลี่ย</p>
            <p className="num text-3xl font-bold mt-0.5 leading-none flex items-center gap-1">
              {(data?.deltaPct ?? 0) > 0 ? (
                <ArrowUp className="h-6 w-6" />
              ) : (data?.deltaPct ?? 0) < 0 ? (
                <ArrowDown className="h-6 w-6" />
              ) : (
                <Minus className="h-6 w-6" />
              )}
              {Math.abs(data?.deltaPct ?? 0).toFixed(0)}%
            </p>
            <p className="text-xs opacity-70 mt-1">ชั่วโมงเดียวกัน 7 วัน</p>
          </div>
        </div>

        <div className="md:w-72">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1.5">
            กราฟ 24 ชม. (ทัก/ชม.)
          </p>
          <div className="flex items-end gap-[2px] h-12">
            {bars.length === 0 ? (
              <Skeleton className="h-full w-full bg-current/10" />
            ) : (
              bars.map((b) => {
                const isNow = b.hour === (data?.currentHour ?? -1);
                const heightPct = (b.messaging / maxBar) * 100;
                return (
                  <Tooltip key={b.hour}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex-1 rounded-sm transition-all",
                          isNow ? "bg-current" : "bg-current/35 hover:bg-current/55",
                        )}
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <div className="font-medium">{String(b.hour).padStart(2, "0")}:00</div>
                        <div>{formatNumber(b.messaging)} ทัก</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function HotPages() {
  const q = trpc.dashboard.hotPages.useQuery(undefined, { refetchInterval: 5 * 60 * 1000 });
  const rows = q.data ?? [];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            เพจมาแรงวันนี้
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Top 5 — เรียงตามจำนวนทักวันนี้</p>
        </div>
      </div>
      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">ยังไม่มีข้อมูลทักวันนี้</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((p, idx) => {
            const delta = Math.round(p.deltaPct);
            const isUp = delta > 5;
            const isDown = delta < -5;
            return (
              <li key={p.accountId}>
                <Link
                  href={`/dashboard?accountId=${p.accountId}`}
                  className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent transition-colors"
                >
                  <span className="w-5 text-xs font-semibold text-muted-foreground num">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.pageName}</p>
                    {p.nickname && <p className="text-[11px] text-muted-foreground truncate">{p.nickname}</p>}
                  </div>
                  <div className="text-right">
                    <p className="num text-base font-bold">{formatNumber(p.messagingToday)}</p>
                    <span
                      className={cn(
                        "text-[10px] num inline-flex items-center gap-0.5",
                        isUp ? "text-emerald-600" : isDown ? "text-rose-600" : "text-muted-foreground",
                      )}
                    >
                      {isUp ? <ArrowUp className="h-2.5 w-2.5" /> : isDown ? <ArrowDown className="h-2.5 w-2.5" /> : null}
                      {delta > 0 ? "+" : ""}
                      {delta}%
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function HourlyHeatmap() {
  const q = trpc.dashboard.hourlyHeatmap.useQuery(undefined, { refetchInterval: 5 * 60 * 1000 });
  const data = q.data ?? [];
  const max = Math.max(1, ...data.map((d) => d.messaging));
  const days = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Heatmap คนทัก (7 วัน × 24 ชม.)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">เห็นชั่วโมงทองทันที</p>
        </div>
      </div>
      {q.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div
              className="grid gap-[2px]"
              style={{ gridTemplateColumns: "32px repeat(24, minmax(0, 1fr))" }}
            >
              <div />
              {Array.from({ length: 24 }).map((_, h) => (
                <div
                  key={h}
                  className={cn(
                    "text-center text-[9px] text-muted-foreground num",
                    h % 3 === 0 ? "" : "opacity-0",
                  )}
                >
                  {String(h).padStart(2, "0")}
                </div>
              ))}
              {days.map((d, dIdx) => (
                <div key={dIdx} className="contents">
                  <div className="text-[10px] text-muted-foreground flex items-center">{d}</div>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const cell = data.find((c) => c.weekday === dIdx && c.hour === h);
                    const ratio = cell ? cell.messaging / max : 0;
                    return (
                      <Tooltip key={h}>
                        <TooltipTrigger asChild>
                          <div
                            className="h-5 rounded-sm transition-all hover:ring-1 hover:ring-primary cursor-pointer"
                            style={{
                              backgroundColor:
                                ratio === 0
                                  ? "color-mix(in oklch, var(--muted) 50%, transparent)"
                                  : `color-mix(in oklch, var(--primary) ${Math.min(ratio * 100, 95)}%, transparent)`,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <div className="font-medium">
                              {d} · {String(h).padStart(2, "0")}:00
                            </div>
                            <div>{formatNumber(cell?.messaging ?? 0)} ทัก</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _ConversionFunnel({ dateRange }: { dateRange: DateRangeInput }) {
  const q = trpc.dashboard.funnel.useQuery({ dateRange });
  if (q.isLoading)
    return (
      <Card className="p-5">
        <Skeleton className="h-48 w-full" />
      </Card>
    );
  if (!q.data) return null;
  const { steps, drops } = q.data;
  const stepColors = [
    "from-sky-500/20 to-sky-500/5",
    "from-indigo-500/20 to-indigo-500/5",
    "from-violet-500/20 to-violet-500/5",
    "from-fuchsia-500/20 to-fuchsia-500/5",
    "from-emerald-500/20 to-emerald-500/5",
  ];
  return (
    <Card className="p-5">
      <div className="mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-violet-500" />
          เส้นทางลูกค้า (5 ขั้น)
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">เห็นจุดรั่วทันที + AOV</p>
      </div>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={s.key}>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{s.label}</span>
              <span className="num font-semibold text-foreground">
                {s.suffix === "฿" ? formatCurrency(s.value) : formatCompact(s.value)}
              </span>
            </div>
            <div className="h-7 bg-muted/40 rounded-md overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-md bg-gradient-to-r border border-border/50 transition-all duration-700",
                  stepColors[i],
                )}
                style={{ width: `${Math.max(s.widthPct, 4)}%` }}
              />
            </div>
            {i < drops.length && (
              <div className="flex items-center justify-end gap-1.5 mt-1 mb-2 text-[11px] text-muted-foreground">
                <ChevronRight className="h-3 w-3 rotate-90" />
                <span>
                  {drops[i].label}:{" "}
                  <span className="num font-semibold text-foreground">
                    {drops[i].label === "AOV"
                      ? formatCurrency(drops[i].rate)
                      : `${drops[i].rate.toFixed(2)}%`}
                  </span>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function AIInsightCard() {
  const q = trpc.dashboard.aiInsight.useQuery(undefined, {
    refetchInterval: 15 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return (
    <Card className="p-5 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-transparent">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">AI Insight วันนี้</h3>
            <Link
              href="/ai-advisor"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              ขอคำแนะนำเพิ่มเติม
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          {q.isLoading ? (
            <div className="space-y-1.5 mt-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : q.data?.text ? (
            <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap">{q.data.text}</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              ยังไม่มี insight — กรุณาเชื่อมต่อบัญชีโฆษณาและรอข้อมูลสะสมก่อน
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
 * Page
 * ============================================================ */
export default function HubDashboard() {
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "1d" });
  const [persona, setPersona] = useState<Persona>(
    () => (localStorage.getItem("hub.persona") as Persona) || "buyer",
  );
  useEffect(() => {
    localStorage.setItem("hub.persona", persona);
  }, [persona]);

  const [accountFilter, setAccountFilter] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const accountsQuery = trpc.dashboard.hub.useQuery(
    { dateRange },
    { refetchInterval: 5 * 60 * 1000 },
  );
  const sparkQuery = trpc.dashboard.kpiSparklines.useQuery(undefined, {
    refetchInterval: 10 * 60 * 1000,
  });
  const realtimeQ = trpc.dashboard.realtime.useQuery(undefined, {
    refetchInterval: 60 * 1000,
  });
  const accountsList = trpc.accounts.list.useQuery();

  const filtered = useMemo(() => {
    const list = accountsQuery.data ?? [];
    if (accountFilter === null) return list;
    return list.filter((a) => a.accountId === accountFilter);
  }, [accountsQuery.data, accountFilter]);

  const totals = useMemo(() => {
    const list = filtered;
    const t = list.reduce(
      (acc, a) => ({
        spend: acc.spend + a.spend,
        messaging: acc.messaging + a.messaging,
        purchases: acc.purchases + a.purchases,
        revenue: acc.revenue + a.purchaseValue,
        impressions: acc.impressions + a.impressions,
        clicks: acc.clicks + a.clicks,
      }),
      { spend: 0, messaging: 0, purchases: 0, revenue: 0, impressions: 0, clicks: 0 },
    );
    return {
      ...t,
      roas: t.spend > 0 ? t.revenue / t.spend : 0,
      costPerMessage: t.messaging > 0 ? t.spend / t.messaging : 0,
      ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0,
    };
  }, [filtered]);

  const deltas = useMemo(() => {
    const s = sparkQuery.data;
    if (!s) return { spend: 0, messaging: 0, orders: 0, revenue: 0, roas: 0 };
    const calc = (arr: number[]) => {
      if (arr.length < 2) return 0;
      const last = arr[arr.length - 1];
      const prev = arr.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(1, arr.length - 1);
      return prev > 0 ? ((last - prev) / prev) * 100 : 0;
    };
    return {
      spend: calc(s.spend),
      messaging: calc(s.messaging),
      orders: calc(s.purchases),
      revenue: calc(s.purchaseValue),
      roas: calc(s.roas),
    };
  }, [sparkQuery.data]);

  // Derived KPI footer values
  const todaySpend = sparkQuery.data?.spend?.[sparkQuery.data.spend.length - 1] ?? 0;
  const todayMsg = sparkQuery.data?.messaging?.[sparkQuery.data.messaging.length - 1] ?? 0;
  const todayOrders = sparkQuery.data?.purchases?.[sparkQuery.data.purchases.length - 1] ?? 0;
  const todayRevenue =
    sparkQuery.data?.purchaseValue?.[sparkQuery.data.purchaseValue.length - 1] ?? 0;
  const realtimeMsgPerHr = realtimeQ.data?.messagingPerHourNow ?? 0;
  const realtimeSpendPerHr = todaySpend > 0 ? Math.round(todaySpend / 24) : 0;
  const aov = totals.purchases > 0 ? totals.revenue / totals.purchases : 0;
  const peakRoas = Math.max(0, ...(sparkQuery.data?.roas ?? [0]));
  const liveStatus: "live" | "idle" | "danger" =
    realtimeMsgPerHr > 0 ? "live" : "idle";

  const onRefreshAll = () => {
    utils.dashboard.hub.invalidate();
    utils.dashboard.kpiSparklines.invalidate();
    utils.dashboard.revenueVsSpend.invalidate();
    utils.dashboard.groupBreakdown.invalidate();
    utils.dashboard.topAds.invalidate();
    utils.dashboard.smartScalingRecommend.invalidate();
    utils.dashboard.accountsTable.invalidate();
  };

  const totalAccounts = accountsList.data?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* ====== Top toolbar (Persona + Account + Date pills) ====== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PersonaPills value={persona} onChange={setPersona} />
          <AccountSelector
            value={accountFilter}
            onChange={setAccountFilter}
            totalCount={totalAccounts}
          />
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-border bg-muted/50 text-foreground hover:bg-muted"
            onClick={onRefreshAll}
            disabled={accountsQuery.isFetching}
            title="รีเฟรชทุกการ์ด"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", accountsQuery.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ====== KPI Row (5 dark cards with full sparkline + footer) ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Spend"
          numericValue={totals.spend}
          formatter={(n) => formatCurrency(n)}
          accent="spend"
          sparkline={sparkQuery.data?.spend}
          deltaPct={deltas.spend}
          goodWhen="down"
          liveStatus={liveStatus}
          hint={`today ${formatCurrency(todaySpend)}`}
          footer={`now ${formatCurrency(realtimeSpendPerHr)}/hr`}
        />
        <KpiCard
          label="คนทัก"
          numericValue={totals.messaging}
          formatter={(n) => formatNumber(n)}
          accent="messaging"
          sparkline={sparkQuery.data?.messaging}
          deltaPct={deltas.messaging}
          goodWhen="up"
          liveStatus={liveStatus}
          hint={`today ${formatNumber(todayMsg)}`}
          footer={`now ${formatNumber(realtimeMsgPerHr)}/hr`}
        />
        <KpiCard
          label="Orders"
          numericValue={totals.purchases}
          formatter={(n) => formatNumber(n)}
          accent="orders"
          sparkline={sparkQuery.data?.purchases}
          deltaPct={deltas.orders}
          goodWhen="up"
          liveStatus={liveStatus}
          hint={`today ${formatNumber(todayOrders)}`}
          footer={aov > 0 ? `AOV ${formatCurrency(aov)}` : undefined}
        />
        <KpiCard
          label="Revenue"
          numericValue={totals.revenue}
          formatter={(n) => formatCurrency(n)}
          accent="revenue"
          sparkline={sparkQuery.data?.purchaseValue}
          deltaPct={deltas.revenue}
          goodWhen="up"
          liveStatus={liveStatus}
          hint={`today ${formatCurrency(todayRevenue)}`}
          footer={
            deltas.revenue !== 0
              ? `vs target ${deltas.revenue > 0 ? "+" : ""}${deltas.revenue.toFixed(0)}%`
              : undefined
          }
        />
        <KpiCard
          label="ROAS"
          numericValue={totals.roas}
          formatter={(n) => formatRoas(n)}
          accent="roas"
          sparkline={sparkQuery.data?.roas}
          deltaPct={deltas.roas}
          goodWhen="up"
          liveStatus={liveStatus}
          hint={`target ${formatRoas(2.5)}`}
          footer={peakRoas > 0 ? `peak ${formatRoas(peakRoas)}x` : undefined}
        />
      </div>

      {/* ====== Row 2: AI Insight (50%) + Hot Pages (50%) ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AIInsightCard />
        <HotPages />
      </div>

      {/* ====== Row 3: Hourly Heatmap (full-width) ====== */}
      <HourlyHeatmap />

      {/* ====== Row 4: Revenue vs Spend (65%) + Group breakdown (35%) ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RevenueVsSpendChart dateRange={dateRange} />
        <GroupBreakdown dateRange={dateRange} />
      </div>

      {/* ====== Row 5: Smart Scaling (full-width) ====== */}
      <SmartScalingPanel dateRange={dateRange} />

      {/* ====== Row 6: Top Performing Ads (full-width) ====== */}
      <TopPerformingAds dateRange={dateRange} />

      {/* ====== Row 7: All ad accounts (full-width) ====== */}
      <AccountsTable dateRange={dateRange} />
    </div>
  );
}
