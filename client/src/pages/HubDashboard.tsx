import DateRangePicker from "@/components/DateRangePicker";
import KpiCard from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  getRoasStatusClass,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { DateRangeInput } from "@shared/types";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Banknote,
  Clock,
  Download,
  ExternalLink,
  Flame,
  MessageCircle,
  Minus,
  Moon,
  Package,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

type Persona = "buyer" | "sales";

const URGENCY_ICON: Record<string, typeof Flame> = { Flame, TrendingUp, Clock, Moon };

function PersonaToggle({ value, onChange }: { value: Persona; onChange: (v: Persona) => void }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as Persona)}>
      <TabsList>
        <TabsTrigger value="buyer">มุมมอง: ผู้ซื้อสื่อ</TabsTrigger>
        <TabsTrigger value="sales">มุมมอง: เซลส์</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function LiveActivityHero() {
  const realtime = trpc.dashboard.realtime.useQuery(undefined, {
    refetchInterval: 60 * 1000,
  });
  const data = realtime.data;
  const u = data?.urgency;
  const Icon = u ? URGENCY_ICON[u.iconName] ?? Activity : Activity;
  const colorClass = u?.color === "danger"
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
              {realtime.isLoading ? <Skeleton className="h-8 w-16 bg-current/10" /> : formatNumber(data?.messagingLast1h ?? 0)}
            </p>
            <p className="text-xs opacity-70 mt-1">เทียบเฉลี่ย {formatNumber(data?.baseline ?? 0, 1)} ทัก/ชม.</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">รวมวันนี้</p>
            <p className="num text-3xl font-bold mt-0.5 leading-none">
              {realtime.isLoading ? <Skeleton className="h-8 w-16 bg-current/10" /> : formatNumber(data?.messagingToday ?? 0)}
            </p>
            <p className="text-xs opacity-70 mt-1">ตั้งแต่ 00:00</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">vs. ค่าเฉลี่ย</p>
            <p className="num text-3xl font-bold mt-0.5 leading-none flex items-center gap-1">
              {(data?.deltaPct ?? 0) > 0 ? <ArrowUp className="h-6 w-6" /> : (data?.deltaPct ?? 0) < 0 ? <ArrowDown className="h-6 w-6" /> : <Minus className="h-6 w-6" />}
              {Math.abs(data?.deltaPct ?? 0).toFixed(0)}%
            </p>
            <p className="text-xs opacity-70 mt-1">ชั่วโมงเดียวกัน 7 วัน</p>
          </div>
        </div>

        <div className="md:w-72">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1.5">กราฟ 24 ชม. (ทัก/ชม.)</p>
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
          <div className="flex justify-between text-[10px] opacity-60 mt-1 num">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
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
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
                <Link href={`/single?accountId=${p.accountId}`} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent transition-colors">
                  <span className="w-5 text-xs font-semibold text-muted-foreground num">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.pageName}</p>
                    {p.nickname && <p className="text-[11px] text-muted-foreground truncate">{p.nickname}</p>}
                  </div>
                  <div className="text-right">
                    <p className="num text-base font-bold">{formatNumber(p.messagingToday)}</p>
                    <span className={cn("text-[10px] num inline-flex items-center gap-0.5", isUp ? "text-emerald-600" : isDown ? "text-rose-600" : "text-muted-foreground")}>
                      {isUp ? <ArrowUp className="h-2.5 w-2.5" /> : isDown ? <ArrowDown className="h-2.5 w-2.5" /> : null}
                      {delta > 0 ? "+" : ""}{delta}%
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
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>น้อย</span>
          {[0.1, 0.3, 0.6, 0.9].map((v) => (
            <span key={v} className="h-3 w-3 rounded-sm" style={{ backgroundColor: `color-mix(in oklch, var(--primary) ${v * 100}%, transparent)` }} />
          ))}
          <span>มาก</span>
        </div>
      </div>
      {q.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: "32px repeat(24, minmax(0, 1fr))" }}>
              <div />
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className={cn("text-center text-[9px] text-muted-foreground num", h % 3 === 0 ? "" : "opacity-0")}>
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
                            <div className="font-medium">{d} · {String(h).padStart(2, "0")}:00</div>
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

function ConversionFunnel({ dateRange }: { dateRange: DateRangeInput }) {
  const q = trpc.dashboard.funnel.useQuery({ dateRange });
  if (q.isLoading) return <Card className="p-5"><Skeleton className="h-48 w-full" /></Card>;
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
              <div className={cn("h-full rounded-md bg-gradient-to-r border border-border/50 transition-all duration-700", stepColors[i])} style={{ width: `${Math.max(s.widthPct, 4)}%` }} />
            </div>
            {i < drops.length && (
              <div className="flex items-center justify-end gap-1.5 mt-1 mb-2 text-[11px] text-muted-foreground">
                <ChevronRight className="h-3 w-3 rotate-90" />
                <span>
                  {drops[i].label}:{" "}
                  <span className="num font-semibold text-foreground">
                    {drops[i].label === "AOV" ? formatCurrency(drops[i].rate) : `${drops[i].rate.toFixed(2)}%`}
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
            <Link href="/ai-advisor" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
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

export default function HubDashboard() {
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "7d" });
  const [persona, setPersona] = useState<Persona>(() => (localStorage.getItem("hub.persona") as Persona) || "buyer");
  useEffect(() => { localStorage.setItem("hub.persona", persona); }, [persona]);

  const utils = trpc.useUtils();
  const accountsQuery = trpc.dashboard.hub.useQuery({ dateRange }, { refetchInterval: 5 * 60 * 1000 });
  const sparkQuery = trpc.dashboard.kpiSparklines.useQuery(undefined, { refetchInterval: 10 * 60 * 1000 });

  const totals = useMemo(() => {
    const list = accountsQuery.data ?? [];
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
  }, [accountsQuery.data]);

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

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const lastUpdated = accountsQuery.dataUpdatedAt;
  const secondsAgo = Math.max(0, Math.floor((now - lastUpdated) / 1000));

  const onExport = () => {
    const rows = accountsQuery.data ?? [];
    exportCSV(
      `hub-${new Date().toISOString().slice(0, 10)}.csv`,
      ["บัญชี", "เพจ", "Phase", "Spend", "ทัก", "Orders", "Revenue", "ROAS", "CTR%", "Cost/Msg", "Cost/Order"],
      rows.map((r) => [
        r.nickname ?? r.adAccountId,
        r.pageName ?? "",
        r.phaseName ?? "",
        r.spend,
        r.messaging,
        r.purchases,
        r.purchaseValue,
        r.roas,
        r.ctr,
        r.costPerMessage,
        r.costPerPurchase,
      ]),
    );
  };

  const onRefreshAll = () => utils.dashboard.hub.invalidate();

  const buyerCards = (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard label="Spend" numericValue={totals.spend} formatter={(n) => formatCurrency(n)} icon={Wallet} accent="spend" sparkline={sparkQuery.data?.spend} deltaPct={deltas.spend} goodWhen="down" hint="ใช้งบ" />
      <KpiCard label="คนทักรวม" numericValue={totals.messaging} formatter={(n) => formatNumber(n)} icon={MessageCircle} accent="messaging" sparkline={sparkQuery.data?.messaging} deltaPct={deltas.messaging} goodWhen="up" hint={totals.costPerMessage > 0 ? `Cost/Msg ${formatCurrency(totals.costPerMessage)}` : undefined} />
      <KpiCard label="Orders" numericValue={totals.purchases} formatter={(n) => formatNumber(n)} icon={Package} accent="orders" sparkline={sparkQuery.data?.purchases} deltaPct={deltas.orders} goodWhen="up" />
      <KpiCard label="Revenue" numericValue={totals.revenue} formatter={(n) => formatCurrency(n)} icon={Banknote} accent="revenue" sparkline={sparkQuery.data?.purchaseValue} deltaPct={deltas.revenue} goodWhen="up" />
      <KpiCard label="ROAS" numericValue={totals.roas} formatter={(n) => formatRoas(n)} icon={Target} accent="roas" sparkline={sparkQuery.data?.roas} deltaPct={deltas.roas} goodWhen="up" hint={`เป้า ${formatRoas(2)}x`} />
    </div>
  );

  const salesCards = (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="คนทักรวม" numericValue={totals.messaging} formatter={(n) => formatNumber(n)} icon={MessageCircle} accent="messaging" sparkline={sparkQuery.data?.messaging} deltaPct={deltas.messaging} goodWhen="up" hint="งวดที่เลือก" />
      <KpiCard label="Orders" numericValue={totals.purchases} formatter={(n) => formatNumber(n)} icon={Package} accent="orders" sparkline={sparkQuery.data?.purchases} deltaPct={deltas.orders} goodWhen="up" hint={totals.messaging > 0 ? `${((totals.purchases / totals.messaging) * 100).toFixed(1)}% ปิดดีล` : undefined} />
      <KpiCard label="Revenue" numericValue={totals.revenue} formatter={(n) => formatCurrency(n)} icon={Banknote} accent="revenue" sparkline={sparkQuery.data?.purchaseValue} deltaPct={deltas.revenue} goodWhen="up" hint={totals.purchases > 0 ? `AOV ${formatCurrency(totals.revenue / totals.purchases)}` : undefined} />
      <KpiCard label="ค่าเฉลี่ยทัก/วัน" numericValue={(sparkQuery.data?.messaging ?? []).length > 0 ? totals.messaging / (sparkQuery.data?.messaging ?? []).length : 0} formatter={(n) => formatNumber(n, 0)} icon={Activity} accent="primary" sparkline={sparkQuery.data?.messaging} goodWhen="up" hint="ใช้วางแผนกำลังคน" />
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">หน้าหลัก</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ภาพรวมประสิทธิภาพโฆษณาทุกบัญชี
            {lastUpdated > 0 && (
              <span className="ml-2 text-xs num">
                · อัปเดตล่าสุด {secondsAgo < 60 ? `${secondsAgo} วินาที` : `${Math.floor(secondsAgo / 60)} นาที`}ที่แล้ว
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PersonaToggle value={persona} onChange={setPersona} />
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" size="sm" onClick={onRefreshAll} disabled={accountsQuery.isFetching} title="รีเฟรชทุกการ์ด">
            <RefreshCw className={cn("h-3.5 w-3.5", accountsQuery.isFetching && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" onClick={onExport} disabled={!accountsQuery.data?.length}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            CSV
          </Button>
        </div>
      </header>

      <LiveActivityHero />

      {persona === "buyer" ? buyerCards : salesCards}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AIInsightCard />
          <HourlyHeatmap />
        </div>
        <div className="space-y-4">
          <HotPages />
          <ConversionFunnel dateRange={dateRange} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">รายการบัญชี</h3>
            <p className="text-xs text-muted-foreground mt-0.5">คลิกแถวเพื่อดูแดชบอร์ดบัญชีเดี่ยว</p>
          </div>
          <Badge variant="secondary" className="num">{accountsQuery.data?.length ?? 0} บัญชี</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>บัญชี</TableHead>
                <TableHead>เพจ</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">ทัก</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Cost/Msg</TableHead>
                <TableHead className="text-right">Cost/Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountsQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              ) : !accountsQuery.data || accountsQuery.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                    ยังไม่มีบัญชีโฆษณา — เพิ่มได้ในหน้า "จัดการบัญชี"
                  </TableCell>
                </TableRow>
              ) : (
                accountsQuery.data.map((a) => (
                  <TableRow key={a.accountId} className="cursor-pointer hover:bg-accent/50">
                    <TableCell className="font-medium">
                      <Link href={`/single?accountId=${a.accountId}`} className="hover:underline">
                        {a.nickname ?? a.adAccountId}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.pageName ?? "—"}</TableCell>
                    <TableCell>
                      {a.phaseName ? <Badge variant="secondary" className="text-[10px]">{a.phaseName}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-right num text-xs">{formatCurrency(a.spend)}</TableCell>
                    <TableCell className="text-right num text-xs">{formatNumber(a.messaging)}</TableCell>
                    <TableCell className="text-right num text-xs">{formatNumber(a.purchases)}</TableCell>
                    <TableCell className="text-right num text-xs">{formatCurrency(a.purchaseValue)}</TableCell>
                    <TableCell className={cn("text-right num text-xs font-semibold", getRoasStatusClass(a.roas, a.roasTarget))}>{formatRoas(a.roas)}</TableCell>
                    <TableCell className="text-right num text-xs">{formatPercent(a.ctr)}</TableCell>
                    <TableCell className="text-right num text-xs">{formatCurrency(a.costPerMessage)}</TableCell>
                    <TableCell className="text-right num text-xs">{formatCurrency(a.costPerPurchase)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
