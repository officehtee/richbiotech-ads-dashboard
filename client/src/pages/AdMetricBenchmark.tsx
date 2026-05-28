import DateRangePicker from "@/components/DateRangePicker";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRoas,
} from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { DateRangeInput } from "@shared/types";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Mode = "messaging" | "purchase";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6", "#84cc16", "#f97316"];

export default function AdMetricBenchmark() {
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "30d" });
  const [mode, setMode] = useState<Mode>("messaging");
  const adsQuery = trpc.ads.list.useQuery({ dateRange });

  const sorted = useMemo(() => {
    const list = adsQuery.data ?? [];
    if (mode === "messaging") {
      return [...list].sort((a, b) => b.messaging - a.messaging);
    }
    return [...list].sort((a, b) => b.purchases - a.purchases);
  }, [adsQuery.data, mode]);

  const totalSpend = useMemo(() => sorted.reduce((s, a) => s + a.spend, 0), [sorted]);
  const top10 = sorted.slice(0, 10);

  // Tier classification
  const tiers = useMemo(() => {
    const target = mode === "messaging" ? 25 : 600;
    const cpField = (a: any) => (mode === "messaging" ? a.costPerMessage : a.costPerPurchase);
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
          <h1 className="text-2xl font-bold tracking-tight">Ads Metric Benchmark</h1>
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
          <p className="font-semibold tracking-tight mb-1">สัดส่วน Spend ของ Top 10</p>
          <p className="text-xs text-muted-foreground mb-4">
            จาก Spend รวม {formatCurrency(totalSpend)}
          </p>
          {adsQuery.isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={top10}
                    dataKey="spend"
                    nameKey="adsetName"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {top10.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => formatCurrency(v as number)}
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <p className="font-semibold tracking-tight mb-1">CTR / CPM ของ Top 10</p>
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
                  <YAxis yAxisId="cpm" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
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
          <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">Top Tier</p>
          <p className="text-3xl font-bold mt-1">{tiers.top.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Adset ที่ต้นทุนต่ำกว่าเป้าหมาย</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-amber-500">
          <p className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">Mid Tier</p>
          <p className="text-3xl font-bold mt-1">{tiers.mid.length}</p>
          <p className="text-xs text-muted-foreground mt-1">ต้นทุนใกล้เคียงเป้าหมาย</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-rose-500">
          <p className="text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 font-semibold">Low Tier</p>
          <p className="text-3xl font-bold mt-1">{tiers.low.length}</p>
          <p className="text-xs text-muted-foreground mt-1">ต้นทุนสูงเกินเป้าหมาย</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs text-muted-foreground border-b">
                <th className="py-2 px-4 text-left">Adset</th>
                <th className="py-2 px-4 text-right">Spend</th>
                <th className="py-2 px-4 text-right">{mode === "messaging" ? "ทัก" : "Orders"}</th>
                <th className="py-2 px-4 text-right">{mode === "messaging" ? "Cost/Msg" : "Cost/Order"}</th>
                <th className="py-2 px-4 text-right">CTR</th>
                <th className="py-2 px-4 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">ไม่มีข้อมูล</td></tr>
              ) : (
                sorted.slice(0, 30).map((a) => (
                  <tr key={a.adsetId} className="border-b last:border-0 hover:bg-accent/30">
                    <td className="py-2 px-4 font-medium max-w-[300px] truncate" title={a.adsetName}>{a.adsetName}</td>
                    <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(a.spend)}</td>
                    <td className="py-2 px-4 text-right font-mono text-xs">{formatNumber(mode === "messaging" ? a.messaging : a.purchases)}</td>
                    <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(mode === "messaging" ? a.costPerMessage : a.costPerPurchase)}</td>
                    <td className="py-2 px-4 text-right font-mono text-xs">{formatPercent(a.ctr)}</td>
                    <td className="py-2 px-4 text-right font-mono text-xs">{formatRoas(a.roas)}</td>
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
