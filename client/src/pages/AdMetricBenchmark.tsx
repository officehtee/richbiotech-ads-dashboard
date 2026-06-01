import DateRangePicker from "@/components/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { computeExplodeOffset, truncateLabel } from "@/lib/donutExplode";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRoas,
} from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { DateRangeInput } from "@shared/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Mode = "messaging" | "purchase";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#14b8a6",
  "#84cc16",
  "#f97316",
];

/**
 * Custom shape that renders the active (exploded) slice slightly
 * pushed outward from the donut centre.
 */
function ExplodedSlice(props: any) {
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;
  const offset = computeExplodeOffset(midAngle, 10);
  return (
    <g
      style={{
        transition: "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)",
        transform: `translate(${offset.dx}px, ${offset.dy}px)`,
      }}
    >
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="hsl(var(--background))"
        strokeWidth={2}
      />
    </g>
  );
}

export default function AdMetricBenchmark() {
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "30d" });
  const [mode, setMode] = useState<Mode>("messaging");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const adsQuery = trpc.ads.list.useQuery({ dateRange });

  const sorted = useMemo(() => {
    const list = adsQuery.data ?? [];
    if (mode === "messaging") {
      return [...list].sort((a, b) => b.messaging - a.messaging);
    }
    return [...list].sort((a, b) => b.purchases - a.purchases);
  }, [adsQuery.data, mode]);

  const totalSpend = useMemo(
    () => sorted.reduce((s, a) => s + a.spend, 0),
    [sorted],
  );
  const top10 = sorted.slice(0, 10);

  // Spend ของ Top 10 (สำหรับคำนวณ %)
  const top10Spend = useMemo(
    () => top10.reduce((s, a) => s + a.spend, 0),
    [top10],
  );

  const visibleLegend = showAll ? top10 : top10.slice(0, 5);
  const activeAd = activeIdx !== null ? top10[activeIdx] : null;
  const activePct =
    activeAd && top10Spend > 0 ? (activeAd.spend / top10Spend) * 100 : 0;

  // Tier classification
  const tiers = useMemo(() => {
    const target = mode === "messaging" ? 25 : 600;
    const cpField = (a: any) =>
      mode === "messaging" ? a.costPerMessage : a.costPerPurchase;
    const top: typeof sorted = [];
    const mid: typeof sorted = [];
    const low: typeof sorted = [];
    for (const a of sorted) {
      const cp = cpField(a);
      if (cp === 0 || !isFinite(cp)) low.push(a);
      else if (cp <= target * 0.7) top.push(a);
      else if (cp <= target * 1.3) mid.push(a);
      else low.push(a);
    }
    return { top, mid, low };
  }, [sorted, mode]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Ads Metric Benchmark
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            เปรียบเทียบประสิทธิภาพ Adset แบบ Messaging vs Purchase
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="messaging">Messaging</TabsTrigger>
              <TabsTrigger value="purchase">Purchase</TabsTrigger>
            </TabsList>
          </Tabs>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="font-semibold tracking-tight mb-1">
            สัดส่วน Spend ของ Top 10
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            จาก Spend รวม {formatCurrency(totalSpend)}
          </p>
          {adsQuery.isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : top10.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
              ไม่มีข้อมูล
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {/* Donut: 2/5 ของความกว้างใน sm+, full ใน mobile */}
              <div
                className="relative h-72 sm:col-span-2"
                onClick={() => setActiveIdx(null)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={top10}
                      dataKey="spend"
                      nameKey="adsetName"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={92}
                      paddingAngle={2}
                      activeIndex={activeIdx ?? undefined}
                      activeShape={ExplodedSlice}
                      onClick={(_, idx, e) => {
                        if (e && (e as any).stopPropagation) {
                          (e as any).stopPropagation();
                        }
                        setActiveIdx((cur) => (cur === idx ? null : idx));
                      }}
                      isAnimationActive
                    >
                      {top10.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                          style={{ cursor: "pointer", outline: "none" }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, _name: any, p: any) => {
                        const pct =
                          top10Spend > 0
                            ? ((p.payload.spend / top10Spend) * 100).toFixed(1)
                            : "0.0";
                        return [
                          `${formatCurrency(v as number)} (${pct}%)`,
                          p.payload.adsetName,
                        ];
                      }}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                        maxWidth: 280,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center label — Spend รวม Top 10 (หรือชิ้นที่คลิก) */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  {activeAd ? (
                    <>
                      <p
                        className="text-[10px] uppercase tracking-wider text-muted-foreground"
                        style={{ color: COLORS[activeIdx! % COLORS.length] }}
                      >
                        เลือก
                      </p>
                      <p
                        className="font-mono text-base font-bold tabular-nums"
                        title={activeAd.adsetName}
                      >
                        {formatCurrency(activeAd.spend)}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        {activePct.toFixed(1)}%
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Spend รวม
                      </p>
                      <p className="font-mono text-base font-bold tabular-nums">
                        {formatCurrency(top10Spend)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Top 10
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Custom Legend — ขวาของ donut */}
              <div className="sm:col-span-3 flex flex-col">
                <ul className="space-y-1.5 flex-1">
                  {visibleLegend.map((a, i) => {
                    const pct =
                      top10Spend > 0 ? (a.spend / top10Spend) * 100 : 0;
                    const isActive = activeIdx === i;
                    return (
                      <li key={a.adsetId}>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveIdx((cur) => (cur === i ? null : i))
                          }
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                            isActive
                              ? "bg-accent/60"
                              : "hover:bg-accent/30"
                          }`}
                          title={a.adsetName}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{
                              background: COLORS[i % COLORS.length],
                              boxShadow: isActive
                                ? `0 0 0 2px ${COLORS[i % COLORS.length]}40`
                                : "none",
                            }}
                          />
                          <span className="text-xs flex-1 truncate min-w-0">
                            {truncateLabel(a.adsetName, 50)}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground tabular-nums shrink-0">
                            {pct.toFixed(1)}%
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {top10.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 self-start text-xs"
                    onClick={() => setShowAll((v) => !v)}
                  >
                    {showAll ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5 mr-1" />
                        ย่อกลับ
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5 mr-1" />
                        ดูเพิ่มเติม ({top10.length - 5} อัน)
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <p className="font-semibold tracking-tight mb-1">
            CTR / CPM ของ Top 10
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            เรียงจาก {mode === "messaging" ? "ทักมากสุด" : "Orders มากสุด"}
          </p>
          {adsQuery.isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10}>
                  <XAxis dataKey="adsetName" tick={false} />
                  <YAxis yAxisId="ctr" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="cpm"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="ctr" dataKey="ctr" name="CTR %" fill="#3b82f6" />
                  <Bar yAxisId="cpm" dataKey="cpm" name="CPM" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-l-4 border-l-emerald-500">
          <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
            Top Tier
          </p>
          <p className="text-3xl font-bold mt-1">{tiers.top.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Adset ที่ต้นทุนต่ำกว่าเป้าหมาย
          </p>
        </Card>
        <Card className="p-5 border-l-4 border-l-amber-500">
          <p className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
            Mid Tier
          </p>
          <p className="text-3xl font-bold mt-1">{tiers.mid.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ต้นทุนใกล้เคียงเป้าหมาย
          </p>
        </Card>
        <Card className="p-5 border-l-4 border-l-rose-500">
          <p className="text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 font-semibold">
            Low Tier
          </p>
          <p className="text-3xl font-bold mt-1">{tiers.low.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ต้นทุนสูงเกินเป้าหมาย
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs text-muted-foreground border-b">
                <th className="py-2 px-4 text-left">Adset</th>
                <th className="py-2 px-4 text-right">Spend</th>
                <th className="py-2 px-4 text-right">
                  {mode === "messaging" ? "ทัก" : "Orders"}
                </th>
                <th className="py-2 px-4 text-right">
                  {mode === "messaging" ? "Cost/Msg" : "Cost/Order"}
                </th>
                <th className="py-2 px-4 text-right">CTR</th>
                <th className="py-2 px-4 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground text-sm"
                  >
                    ไม่มีข้อมูล
                  </td>
                </tr>
              ) : (
                sorted.slice(0, 30).map((a) => (
                  <tr
                    key={a.adsetId}
                    className="border-b last:border-0 hover:bg-accent/30"
                  >
                    <td
                      className="py-2 px-4 font-medium max-w-[300px] truncate"
                      title={a.adsetName}
                    >
                      {a.adsetName}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-xs">
                      {formatCurrency(a.spend)}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-xs">
                      {formatNumber(
                        mode === "messaging" ? a.messaging : a.purchases,
                      )}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-xs">
                      {formatCurrency(
                        mode === "messaging"
                          ? a.costPerMessage
                          : a.costPerPurchase,
                      )}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-xs">
                      {formatPercent(a.ctr)}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-xs">
                      {formatRoas(a.roas)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
