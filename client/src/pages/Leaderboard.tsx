import DateRangePicker from "@/components/DateRangePicker";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber, formatPercent, formatRoas, getRoasStatusClass } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { DateRangeInput } from "@shared/types";
import { Trophy, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

type EntityType = "accounts" | "groups" | "adsets";
type MetricKey = "roas" | "spend" | "purchaseValue" | "purchases" | "messaging" | "ctr";
type Direction = "top" | "bottom";

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: "roas", label: "ROAS" },
  { key: "spend", label: "Spend (งบ)" },
  { key: "purchaseValue", label: "Revenue (ยอดขาย)" },
  { key: "purchases", label: "Orders" },
  { key: "messaging", label: "คนทัก" },
  { key: "ctr", label: "CTR" },
];

const ENTITY_OPTIONS: { key: EntityType; label: string }[] = [
  { key: "accounts", label: "บัญชีโฆษณา" },
  { key: "groups", label: "กลุ่มสินค้า" },
  { key: "adsets", label: "Adset (รายแอด)" },
];

function rankBadge(idx: number, dir: Direction) {
  if (dir === "top") {
    if (idx === 0) return <span className="text-2xl">🥇</span>;
    if (idx === 1) return <span className="text-2xl">🥈</span>;
    if (idx === 2) return <span className="text-2xl">🥉</span>;
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground">
      {idx + 1}
    </span>
  );
}

export default function Leaderboard() {
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "1d" });
  const [entityType, setEntityType] = useState<EntityType>("accounts");
  const [metric, setMetric] = useState<MetricKey>("roas");
  const [direction, setDirection] = useState<Direction>("top");
  const [topN, setTopN] = useState<string>("10");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");

  const accountsQuery = trpc.accounts.list.useQuery();
  const groupsListQuery = trpc.groups.list.useQuery();

  const hubQuery = trpc.dashboard.hub.useQuery({ dateRange }, { enabled: entityType === "accounts" });
  const groupKpiQuery = trpc.dashboard.groups.useQuery({ dateRange }, { enabled: entityType === "groups" });
  const adsQuery = trpc.ads.list.useQuery(
    { dateRange, accountIds: accountFilter === "all" ? undefined : [parseInt(accountFilter, 10)] },
    { enabled: entityType === "adsets" },
  );

  const rows = useMemo(() => {
    let list: any[] = [];
    if (entityType === "accounts") {
      list = (hubQuery.data ?? []).map((a: any) => ({
        id: a.accountId,
        label: a.nickname ?? a.adAccountId,
        sublabel: a.pageName ?? "",
        sub2: a.phaseName ?? "",
        spend: a.spend,
        purchaseValue: a.purchaseValue,
        purchases: a.purchases,
        messaging: a.messaging,
        roas: a.roas,
        ctr: a.ctr,
        roasTarget: a.roasTarget,
        href: "/dashboard",
      }));
    } else if (entityType === "groups") {
      list = (groupKpiQuery.data ?? []).map((g: any) => ({
        id: g.groupId,
        label: g.groupName,
        sublabel: `${g.accountCount} บัญชี`,
        sub2: "",
        color: g.color,
        spend: g.spend,
        purchaseValue: g.purchaseValue,
        purchases: g.purchases,
        messaging: g.messaging,
        roas: g.roas,
        ctr: g.ctr,
        roasTarget: g.roasTarget,
        href: "/group-overview",
      }));
    } else {
      list = (adsQuery.data ?? []).map((a: any) => ({
        id: a.adsetId,
        accountId: a.accountId,
        label: a.adsetName,
        sublabel: a.campaignName,
        sub2: a.pageName ?? "",
        groupId: a.groupId,
        groupName: a.groupName,
        spend: a.spend,
        purchaseValue: a.purchaseValue,
        purchases: a.purchases,
        messaging: a.messaging,
        roas: a.roas,
        ctr: a.ctr,
        roasTarget: 2,
        href: `/adset/${a.accountId}/${a.adsetId}`,
      }));
    }

    // Filter (only on adsets we can filter by group + account; on groups we can filter group)
    if (entityType === "adsets" && groupFilter !== "all") {
      const gid = parseInt(groupFilter, 10);
      list = list.filter((r) => r.groupId === gid);
    }
    if (entityType === "groups" && groupFilter !== "all") {
      const gid = parseInt(groupFilter, 10);
      list = list.filter((r) => r.id === gid);
    }

    // Filter zero-spend rows when ranking by ROAS (otherwise zeros pollute "bottom")
    if (metric === "roas") {
      list = list.filter((r) => (r.spend ?? 0) > 0);
    }

    // Sort
    list = [...list].sort((a, b) => {
      const av = a[metric] ?? 0;
      const bv = b[metric] ?? 0;
      return direction === "top" ? bv - av : av - bv;
    });

    const limit = parseInt(topN, 10);
    return list.slice(0, limit);
  }, [entityType, hubQuery.data, groupKpiQuery.data, adsQuery.data, metric, direction, topN, groupFilter, accountFilter]);

  const isLoading =
    (entityType === "accounts" && hubQuery.isLoading) ||
    (entityType === "groups" && groupKpiQuery.isLoading) ||
    (entityType === "adsets" && adsQuery.isLoading);

  const metricLabel = METRIC_OPTIONS.find((m) => m.key === metric)?.label ?? "";
  const entityLabel = ENTITY_OPTIONS.find((e) => e.key === entityType)?.label ?? "";

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            จัดอันดับ {entityLabel} ตาม {metricLabel} ({direction === "top" ? "อันดับดีสุด" : "อันดับแย่สุด"})
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </header>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">จัดอันดับ</label>
            <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITY_OPTIONS.map((o) => (
                  <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">ตาม Metric</label>
            <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map((o) => (
                  <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">ทิศทาง</label>
            <Select value={direction} onValueChange={(v) => setDirection(v as Direction)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top">
                  <span className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> ดีสุด</span>
                </SelectItem>
                <SelectItem value="bottom">
                  <span className="flex items-center gap-2"><TrendingDown className="h-3.5 w-3.5 text-red-600" /> แย่สุด</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">จำนวน</label>
            <Select value={topN} onValueChange={setTopN}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(entityType === "adsets" || entityType === "groups") && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">กลุ่มสินค้า</label>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกกลุ่ม</SelectItem>
                  {(groupsListQuery.data ?? []).map((g: any) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.groupName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {entityType === "adsets" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">บัญชี</label>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกบัญชี</SelectItem>
                  {(accountsQuery.data ?? []).map((a: any) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.nickname ?? a.adAccountId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      {/* Podium for Top 3 (only when direction=top and have ≥ 3 rows) */}
      {direction === "top" && rows.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 0, 2].map((rank, displayIdx) => {
            const r = rows[rank];
            const height = rank === 0 ? "md:scale-105" : "";
            const medal = rank === 0 ? "🥇" : rank === 1 ? "🥈" : "🥉";
            return (
              <Card key={r.id} className={`p-5 ${height} border-2 ${rank === 0 ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-3xl">{medal}</span>
                  <Badge variant="outline" className="text-xs">#{rank + 1}</Badge>
                </div>
                {r.href ? (
                  <Link href={r.href} className="block">
                    <div className="font-semibold truncate hover:text-primary" title={r.label}>{r.label}</div>
                  </Link>
                ) : (
                  <div className="font-semibold truncate" title={r.label}>{r.label}</div>
                )}
                {r.sublabel && <div className="text-xs text-muted-foreground truncate">{r.sublabel}</div>}
                <div className="mt-3 text-2xl font-bold font-mono">
                  {metric === "roas" && <span className={getRoasStatusClass(r.roas, r.roasTarget ?? 2)}>{formatRoas(r.roas)}</span>}
                  {metric === "spend" && formatCurrency(r.spend)}
                  {metric === "purchaseValue" && formatCurrency(r.purchaseValue)}
                  {metric === "purchases" && formatNumber(r.purchases)}
                  {metric === "messaging" && formatNumber(r.messaging)}
                  {metric === "ctr" && formatPercent(r.ctr)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{metricLabel}</div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">อันดับ</TableHead>
                <TableHead>{entityLabel}</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">ทัก</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  ไม่มีข้อมูลสำหรับเงื่อนไขนี้
                </TableCell></TableRow>
              ) : (
                rows.map((r, idx) => (
                  <TableRow key={String(r.id)} className="hover:bg-accent/30">
                    <TableCell>{rankBadge(idx, direction)}</TableCell>
                    <TableCell className="max-w-[280px]">
                      {r.href ? (
                        <Link href={r.href} className="font-medium hover:text-primary block truncate" title={r.label}>{r.label}</Link>
                      ) : (
                        <span className="font-medium block truncate" title={r.label}>{r.label}</span>
                      )}
                      {r.sublabel && <div className="text-xs text-muted-foreground truncate">{r.sublabel}</div>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(r.spend)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatNumber(r.messaging)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatNumber(r.purchases)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(r.purchaseValue)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs font-semibold ${getRoasStatusClass(r.roas, r.roasTarget ?? 2)}`}>
                      {formatRoas(r.roas)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatPercent(r.ctr)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {metric === "roas" && (
        <p className="text-xs text-muted-foreground italic">
          * เมื่อจัดอันดับตาม ROAS ระบบจะกรองรายการที่ยังไม่มี Spend ออก เพื่อไม่ให้ผลลัพธ์ผิดเพี้ยน
        </p>
      )}
    </div>
  );
}
