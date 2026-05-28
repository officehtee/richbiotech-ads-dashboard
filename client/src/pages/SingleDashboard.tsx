import DateRangePicker from "@/components/DateRangePicker";
import KpiCard from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatNumber,
  formatRoas,
  getRoasStatusClass,
} from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { DateRangeInput } from "@shared/types";
import { Banknote, MessageCircle, Package, Target, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function SingleDashboard() {
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "1d" });
  const accountsQuery = trpc.accounts.list.useQuery();
  const [accountId, setAccountId] = useState<number | null>(null);

  useEffect(() => {
    if (!accountId && accountsQuery.data && accountsQuery.data.length > 0) {
      setAccountId(accountsQuery.data[0].id);
    }
  }, [accountsQuery.data, accountId]);

  const dataQuery = trpc.dashboard.single.useQuery(
    { accountId: accountId ?? 0, dateRange },
    { enabled: accountId !== null, refetchInterval: 5 * 60 * 1000 },
  );

  const kpi = dataQuery.data?.kpi;
  const trend = dataQuery.data?.trend ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">แดชบอร์ดเดี่ยว</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ดูแนวโน้มและรายละเอียดของบัญชีเดียว
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={accountId ? String(accountId) : ""}
            onValueChange={(v) => setAccountId(parseInt(v, 10))}
          >
            <SelectTrigger className="w-56"><SelectValue placeholder="เลือกบัญชี" /></SelectTrigger>
            <SelectContent>
              {(accountsQuery.data ?? []).map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.nickname ?? a.adAccountId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </header>

      {!accountsQuery.data || accountsQuery.data.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          ยังไม่มีบัญชีโฆษณา — เพิ่มได้ในหน้า "จัดการบัญชี"
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Spend" value={formatCurrency(kpi?.spend ?? 0)} icon={Wallet} accent="spend" />
            <KpiCard label="คนทัก" value={formatNumber(kpi?.messaging ?? 0)} icon={MessageCircle} accent="messaging" />
            <KpiCard label="Orders" value={formatNumber(kpi?.purchases ?? 0)} icon={Package} accent="orders" />
            <KpiCard label="Revenue" value={formatCurrency(kpi?.purchaseValue ?? 0)} icon={Banknote} accent="revenue" />
            <KpiCard
              label="ROAS"
              value={formatRoas(kpi?.roas ?? 0)}
              sublabel={`เป้า ${(kpi?.roasTarget ?? 2).toFixed(1)}`}
              icon={Target}
              accent="roas"
            />
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold tracking-tight">แนวโน้มรายวัน</p>
                <p className="text-xs text-muted-foreground">Spend vs Revenue vs ROAS</p>
              </div>
              {kpi && (
                <span className={`text-xl font-bold ${getRoasStatusClass(kpi.roas, kpi.roasTarget)}`}>
                  ROAS {formatRoas(kpi.roas)}
                </span>
              )}
            </div>
            {dataQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v?.slice?.(5) ?? v}
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="purchaseValue" name="Revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="roas" name="ROAS" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <p className="font-semibold tracking-tight mb-3">สรุปรายวัน</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="py-2 text-left">วันที่</th>
                    <th className="py-2 text-right">Spend</th>
                    <th className="py-2 text-right">ทัก</th>
                    <th className="py-2 text-right">Orders</th>
                    <th className="py-2 text-right">Revenue</th>
                    <th className="py-2 text-right">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                        ไม่มีข้อมูล
                      </td>
                    </tr>
                  ) : (
                    trend.map((d) => (
                      <tr key={d.date} className="border-b last:border-0">
                        <td className="py-2 font-medium">{d.date}</td>
                        <td className="py-2 text-right font-mono text-xs">{formatCurrency(d.spend)}</td>
                        <td className="py-2 text-right font-mono text-xs">{formatNumber(d.messaging)}</td>
                        <td className="py-2 text-right font-mono text-xs">{formatNumber(d.purchases)}</td>
                        <td className="py-2 text-right font-mono text-xs">{formatCurrency(d.purchaseValue)}</td>
                        <td className="py-2 text-right font-mono text-xs">{formatRoas(d.roas)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
