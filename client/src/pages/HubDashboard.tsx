import DateRangePicker from "@/components/DateRangePicker";
import KpiCard from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  exportCSV,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRoas,
  getRoasStatusClass,
} from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { DateRangeInput } from "@shared/types";
import {
  Banknote,
  Download,
  MessageCircle,
  Package,
  RefreshCw,
  Target,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function HubDashboard() {
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "7d" });
  const utils = trpc.useUtils();
  const accountsQuery = trpc.dashboard.hub.useQuery(
    { dateRange },
    { refetchInterval: 5 * 60 * 1000 }, // auto-refresh every 5 min
  );

  const totals = useMemo(() => {
    const list = accountsQuery.data ?? [];
    const t = list.reduce(
      (acc, a) => ({
        spend: acc.spend + a.spend,
        messaging: acc.messaging + a.messaging,
        purchases: acc.purchases + a.purchases,
        revenue: acc.revenue + a.purchaseValue,
      }),
      { spend: 0, messaging: 0, purchases: 0, revenue: 0 },
    );
    return { ...t, roas: t.spend > 0 ? t.revenue / t.spend : 0 };
  }, [accountsQuery.data]);

  // Live "last refreshed" indicator
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
      ["บัญชี", "เพจ", "Phase", "Spend", "ทัก", "Orders", "Revenue", "ROAS", "CTR%", "Cost/Msg", "Cost/Purchase"],
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hub Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ภาพรวมประสิทธิภาพโฆษณาทุกบัญชี
            {lastUpdated > 0 && (
              <span className="ml-2 text-xs">
                • อัปเดตล่าสุด {secondsAgo < 60 ? `${secondsAgo} วินาที` : `${Math.floor(secondsAgo / 60)} นาที`}ที่แล้ว
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => utils.dashboard.hub.invalidate()}
            disabled={accountsQuery.isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${accountsQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={onExport} disabled={!accountsQuery.data?.length}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            CSV
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Spend รวม" value={formatCurrency(totals.spend)} icon={Wallet} accent="spend" />
        <KpiCard label="คนทักรวม" value={formatNumber(totals.messaging)} icon={MessageCircle} accent="messaging" />
        <KpiCard label="Orders" value={formatNumber(totals.purchases)} icon={Package} accent="orders" />
        <KpiCard label="Revenue" value={formatCurrency(totals.revenue)} icon={Banknote} accent="revenue" />
        <KpiCard label="ROAS รวม" value={formatRoas(totals.roas)} icon={Target} accent="roas" />
      </div>

      <Card className="overflow-hidden">
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
                  <TableRow key={i}>
                    <TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : !accountsQuery.data || accountsQuery.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                    ยังไม่มีบัญชีโฆษณา — เพิ่มได้ในหน้า "จัดการบัญชี"
                  </TableCell>
                </TableRow>
              ) : (
                accountsQuery.data.map((a) => (
                  <TableRow key={a.accountId}>
                    <TableCell className="font-medium">{a.nickname ?? a.adAccountId}</TableCell>
                    <TableCell className="text-muted-foreground">{a.pageName ?? "—"}</TableCell>
                    <TableCell>
                      {a.phaseName ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-secondary">{a.phaseName}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(a.spend)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatNumber(a.messaging)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatNumber(a.purchases)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(a.purchaseValue)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs font-semibold ${getRoasStatusClass(a.roas, a.roasTarget)}`}>
                      {formatRoas(a.roas)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatPercent(a.ctr)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(a.costPerMessage)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(a.costPerPurchase)}</TableCell>
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
