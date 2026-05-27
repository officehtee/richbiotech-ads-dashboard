import DateRangePicker from "@/components/DateRangePicker";
import KpiCard from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatRoas } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { DateRangeInput } from "@shared/types";
import { Banknote, MessageCircle, Package, Target, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { useRoute } from "wouter";

export default function ShareView() {
  const [, params] = useRoute("/share/:token");
  const token = params?.token ?? "";
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "7d" });

  const view = trpc.share.publicView.useQuery({ token, dateRange }, { enabled: !!token, retry: false });

  const totals = useMemo(() => {
    const accs = view.data?.accounts ?? [];
    return accs.reduce(
      (a, x) => ({
        spend: a.spend + x.spend,
        messaging: a.messaging + x.messaging,
        purchases: a.purchases + x.purchases,
        revenue: a.revenue + x.purchaseValue,
      }),
      { spend: 0, messaging: 0, purchases: 0, revenue: 0 },
    );
  }, [view.data]);
  const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;

  if (view.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-bold tracking-tight mb-2">ไม่สามารถเข้าถึงลิงก์นี้</h2>
          <p className="text-sm text-muted-foreground">{view.error.message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Shared Dashboard</p>
            <h1 className="text-lg font-bold tracking-tight">{view.data?.label ?? "Read-only View"}</h1>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Spend" value={formatCurrency(totals.spend)} icon={Wallet} accent="spend" />
          <KpiCard label="คนทัก" value={formatNumber(totals.messaging)} icon={MessageCircle} accent="messaging" />
          <KpiCard label="Orders" value={formatNumber(totals.purchases)} icon={Package} accent="orders" />
          <KpiCard label="Revenue" value={formatCurrency(totals.revenue)} icon={Banknote} accent="revenue" />
          <KpiCard label="ROAS" value={formatRoas(roas)} icon={Target} accent="roas" />
        </div>

        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b">
            <p className="font-semibold tracking-tight">รายละเอียดบัญชี</p>
          </div>
          {view.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="py-2 px-4 text-left">บัญชี</th>
                    <th className="py-2 px-4 text-left">Page</th>
                    <th className="py-2 px-4 text-right">Spend</th>
                    <th className="py-2 px-4 text-right">ทัก</th>
                    <th className="py-2 px-4 text-right">Orders</th>
                    <th className="py-2 px-4 text-right">Revenue</th>
                    <th className="py-2 px-4 text-right">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {(view.data?.accounts ?? []).map((a) => (
                    <tr key={a.accountId} className="border-b last:border-0">
                      <td className="py-2 px-4 font-medium">{a.nickname ?? a.adAccountId}</td>
                      <td className="py-2 px-4 text-xs text-muted-foreground">{a.pageName ?? "—"}</td>
                      <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(a.spend)}</td>
                      <td className="py-2 px-4 text-right font-mono text-xs">{formatNumber(a.messaging)}</td>
                      <td className="py-2 px-4 text-right font-mono text-xs">{formatNumber(a.purchases)}</td>
                      <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(a.purchaseValue)}</td>
                      <td className="py-2 px-4 text-right font-mono text-xs">{formatRoas(a.roas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      <footer className="border-t bg-background py-4 mt-8">
        <p className="container text-xs text-center text-muted-foreground">
          Powered by Richbiotech Ads Dashboard
        </p>
      </footer>
    </div>
  );
}
