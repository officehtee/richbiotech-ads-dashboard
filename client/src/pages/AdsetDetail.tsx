import DateRangePicker from "@/components/DateRangePicker";
import KpiCard from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRoas,
} from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { DateRangeInput } from "@shared/types";
import { ArrowLeft, Banknote, MessageCircle, Package, Target, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocation, useRoute } from "wouter";

export default function AdsetDetail() {
  const [, params] = useRoute("/adset/:accountId/:adsetId");
  const [, navigate] = useLocation();
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "14d" });

  const accountId = params?.accountId ? parseInt(params.accountId, 10) : 0;
  const adsetId = params?.adsetId ?? "";

  const detail = trpc.ads.adsetDetail.useQuery(
    { accountId, adsetId, dateRange },
    { enabled: accountId > 0 && adsetId.length > 0 },
  );

  const totals = useMemo(() => {
    const daily = detail.data?.daily ?? [];
    const sum = daily.reduce(
      (a, d) => ({
        spend: a.spend + d.spend,
        messaging: a.messaging + d.messaging,
        purchases: a.purchases + d.purchases,
        revenue: a.revenue + d.purchase_value,
      }),
      { spend: 0, messaging: 0, purchases: 0, revenue: 0 },
    );
    return { ...sum, roas: sum.spend > 0 ? sum.revenue / sum.spend : 0 };
  }, [detail.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/ads")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          กลับ
        </Button>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">Adset Detail</h1>
        <p className="text-xs text-muted-foreground font-mono mt-1">{adsetId}</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Spend" value={formatCurrency(totals.spend)} icon={Wallet} accent="spend" />
        <KpiCard label="คนทัก" value={formatNumber(totals.messaging)} icon={MessageCircle} accent="messaging" />
        <KpiCard label="Orders" value={formatNumber(totals.purchases)} icon={Package} accent="orders" />
        <KpiCard label="Revenue" value={formatCurrency(totals.revenue)} icon={Banknote} accent="revenue" />
        <KpiCard label="ROAS" value={formatRoas(totals.roas)} icon={Target} accent="roas" />
      </div>

      <Card className="p-5">
        <p className="font-semibold tracking-tight mb-4">Trend รายวัน</p>
        {detail.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={detail.data?.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v?.slice?.(5) ?? v} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="purchase_value" name="Revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="messaging" name="ทัก" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className="font-semibold tracking-tight mb-4">Ads ใน Adset นี้</p>
        {detail.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !detail.data || detail.data.ads.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">ไม่มี ads</p>
        ) : (
          <>
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={detail.data.ads}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="ad_name" tick={{ fontSize: 10 }} interval={0} angle={-15} height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="spend" name="Spend" fill="#ef4444" />
                  <Bar dataKey="messaging" name="ทัก" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="py-2 text-left">Ads Name</th>
                    <th className="py-2 text-right">Spend</th>
                    <th className="py-2 text-right">Impressions</th>
                    <th className="py-2 text-right">CTR</th>
                    <th className="py-2 text-right">ทัก</th>
                    <th className="py-2 text-right">Orders</th>
                    <th className="py-2 text-right">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.data.ads.map((a) => (
                    <tr key={a.ad_id} className="border-b last:border-0">
                      <td className="py-2 font-medium max-w-[260px] truncate" title={a.ad_name}>{a.ad_name}</td>
                      <td className="py-2 text-right font-mono text-xs">{formatCurrency(a.spend)}</td>
                      <td className="py-2 text-right font-mono text-xs">{formatNumber(a.impressions)}</td>
                      <td className="py-2 text-right font-mono text-xs">{formatPercent(a.ctr)}</td>
                      <td className="py-2 text-right font-mono text-xs">{formatNumber(a.messaging)}</td>
                      <td className="py-2 text-right font-mono text-xs">{formatNumber(a.purchases)}</td>
                      <td className="py-2 text-right font-mono text-xs">
                        {formatRoas(a.spend > 0 ? a.purchase_value / a.spend : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
