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
  Layers,
  MessageCircle,
  Package,
  RefreshCw,
  Target,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

export default function GroupOverview() {
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "1d" });
  const utils = trpc.useUtils();
  const groupsQuery = trpc.dashboard.groups.useQuery(
    { dateRange },
    { refetchInterval: 5 * 60 * 1000 },
  );

  const totals = useMemo(() => {
    const list = groupsQuery.data ?? [];
    const t = list.reduce(
      (acc, g) => ({
        spend: acc.spend + g.spend,
        messaging: acc.messaging + g.messaging,
        purchases: acc.purchases + g.purchases,
        revenue: acc.revenue + g.purchaseValue,
      }),
      { spend: 0, messaging: 0, purchases: 0, revenue: 0 },
    );
    return { ...t, roas: t.spend > 0 ? t.revenue / t.spend : 0, count: list.length };
  }, [groupsQuery.data]);

  const onExport = () => {
    const rows = groupsQuery.data ?? [];
    exportCSV(
      `groups-${new Date().toISOString().slice(0, 10)}.csv`,
      ["กลุ่ม", "บัญชี", "Spend", "ทัก", "Orders", "Revenue", "ROAS", "CTR%", "Cost/Msg", "Cost/Purchase"],
      rows.map((g) => [
        g.groupName,
        g.accountCount,
        g.spend,
        g.messaging,
        g.purchases,
        g.purchaseValue,
        g.roas,
        g.ctr,
        g.costPerMessage,
        g.costPerPurchase,
      ]),
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ภาพรวมกลุ่มสินค้า</h1>
          <p className="text-sm text-muted-foreground mt-1">
            สรุปประสิทธิภาพแต่ละกลุ่มสินค้า
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" size="sm" onClick={() => utils.dashboard.groups.invalidate()}>
            <RefreshCw className={`h-3.5 w-3.5 ${groupsQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={onExport} disabled={!groupsQuery.data?.length}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            CSV
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="กลุ่มทั้งหมด" value={formatNumber(totals.count)} icon={Layers} accent="primary" />
        <KpiCard label="Spend รวม" value={formatCurrency(totals.spend)} icon={Wallet} accent="spend" />
        <KpiCard label="คนทัก" value={formatNumber(totals.messaging)} icon={MessageCircle} accent="messaging" />
        <KpiCard label="Revenue" value={formatCurrency(totals.revenue)} icon={Banknote} accent="revenue" />
        <KpiCard label="ROAS" value={formatRoas(totals.roas)} icon={Target} accent="roas" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupsQuery.isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)
          : (groupsQuery.data ?? []).map((g) => (
              <Card key={g.groupId} className="p-5 border-l-4" style={{ borderLeftColor: g.color }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold tracking-tight">{g.groupName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {g.accountCount} บัญชี • เป้า ROAS {g.roasTarget.toFixed(1)}
                    </p>
                  </div>
                  <span
                    className={`text-lg font-bold ${getRoasStatusClass(g.roas, g.roasTarget)}`}
                  >
                    {formatRoas(g.roas)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Spend</span><span className="font-mono">{formatCurrency(g.spend)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-mono">{formatCurrency(g.purchaseValue)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">ทัก</span><span className="font-mono">{formatNumber(g.messaging)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Orders</span><span className="font-mono">{formatNumber(g.purchases)}</span></div>
                </div>
              </Card>
            ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>กลุ่ม</TableHead>
                <TableHead className="text-right">บัญชี</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">ทัก</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(groupsQuery.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground text-sm">
                    ยังไม่มีกลุ่มสินค้า — เพิ่มได้ในหน้า "กลุ่มสินค้า"
                  </TableCell>
                </TableRow>
              ) : (
                (groupsQuery.data ?? []).map((g) => (
                  <TableRow key={g.groupId}>
                    <TableCell className="font-medium">
                      <span className="inline-block h-2 w-2 rounded-full mr-2" style={{ background: g.color }} />
                      {g.groupName}
                    </TableCell>
                    <TableCell className="text-right">{g.accountCount}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(g.spend)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatNumber(g.messaging)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatNumber(g.purchases)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(g.purchaseValue)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs font-semibold ${getRoasStatusClass(g.roas, g.roasTarget)}`}>
                      {formatRoas(g.roas)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatPercent(g.ctr)}</TableCell>
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
