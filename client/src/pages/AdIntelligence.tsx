import DateRangePicker from "@/components/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Download, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

type SortKey = "spend" | "messaging" | "purchases" | "purchaseValue" | "roas" | "ctr";

export default function AdIntelligence() {
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "14d" });
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const accountsQuery = trpc.accounts.list.useQuery();
  const adsQuery = trpc.ads.list.useQuery({
    dateRange,
    accountIds: accountFilter === "all" ? undefined : [parseInt(accountFilter, 10)],
  });

  const filtered = useMemo(() => {
    const list = adsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    const out = q
      ? list.filter(
          (r) =>
            r.adsetName.toLowerCase().includes(q) ||
            r.campaignName.toLowerCase().includes(q) ||
            (r.pageName ?? "").toLowerCase().includes(q),
        )
      : list;
    return [...out].sort((a, b) => {
      const av = (a as any)[sortBy] as number;
      const bv = (b as any)[sortBy] as number;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [adsQuery.data, search, sortBy, sortDir]);

  const onExport = () => {
    exportCSV(
      `ad-intelligence-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Page", "Phase", "Group", "Campaign", "Adset", "Spend", "ทัก", "Orders", "Revenue", "ROAS", "CTR%"],
      filtered.map((r) => [
        r.pageName ?? "",
        r.phaseName ?? "",
        r.groupName ?? "",
        r.campaignName,
        r.adsetName,
        r.spend,
        r.messaging,
        r.purchases,
        r.purchaseValue,
        r.roas,
        r.ctr,
      ]),
    );
  };

  const toggleSort = (k: SortKey) => {
    if (sortBy === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(k); setSortDir("desc"); }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ad Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            วิเคราะห์ Adset ระดับลึก พร้อมการกรอง ค้นหา และ sort
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </header>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="ค้นหา campaign / adset / เพจ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกบัญชี</SelectItem>
              {(accountsQuery.data ?? []).map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>{a.nickname ?? a.adAccountId}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-44"><SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="spend">เรียงตาม Spend</SelectItem>
              <SelectItem value="messaging">เรียงตาม คนทัก</SelectItem>
              <SelectItem value="purchases">เรียงตาม Orders</SelectItem>
              <SelectItem value="purchaseValue">เรียงตาม Revenue</SelectItem>
              <SelectItem value="roas">เรียงตาม ROAS</SelectItem>
              <SelectItem value="ctr">เรียงตาม CTR</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={onExport} disabled={!filtered.length}>
            <Download className="h-3.5 w-3.5 mr-1.5" />CSV
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adset</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Group</TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("spend")}>Spend</TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("messaging")}>ทัก</TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("purchases")}>Orders</TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("purchaseValue")}>Revenue</TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("roas")}>ROAS</TableHead>
                <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("ctr")}>CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={10}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="h-24 text-center text-muted-foreground">ไม่พบข้อมูล</TableCell></TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.adsetId} className="hover:bg-accent/30">
                    <TableCell className="font-medium max-w-[260px] truncate" title={r.adsetName}>
                      <Link href={`/adset/${r.accountId}/${r.adsetId}`} className="text-primary hover:underline">
                        {r.adsetName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={r.campaignName}>{r.campaignName}</TableCell>
                    <TableCell className="text-xs">{r.pageName ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.groupName ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(r.spend)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatNumber(r.messaging)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatNumber(r.purchases)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(r.purchaseValue)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs font-semibold ${getRoasStatusClass(r.roas, 2)}`}>{formatRoas(r.roas)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatPercent(r.ctr)}</TableCell>
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
