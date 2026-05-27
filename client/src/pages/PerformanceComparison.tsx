import DateRangePicker from "@/components/DateRangePicker";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCompact, formatCurrency, formatNumber, formatPercent, formatRoas } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { DateRangeInput } from "@shared/types";
import { ArrowLeftRight, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip as RTooltip } from "recharts";

type EntityType = "accounts" | "groups";
type Mode = "auto" | "custom";

type MetricKey =
  | "spend"
  | "messaging"
  | "purchases"
  | "purchaseValue"
  | "ctr"
  | "roas";

const METRICS: { key: MetricKey; label: string; fmt: (n: number) => string }[] = [
  { key: "spend", label: "Spend", fmt: (n) => formatCurrency(n) },
  { key: "messaging", label: "ทัก", fmt: (n) => formatNumber(n) },
  { key: "purchases", label: "Orders", fmt: (n) => formatNumber(n) },
  { key: "purchaseValue", label: "Revenue", fmt: (n) => formatCurrency(n) },
  { key: "ctr", label: "CTR", fmt: (n) => formatPercent(n) },
  { key: "roas", label: "ROAS", fmt: (n) => formatRoas(n) },
];

function deltaClass(pct: number): string {
  if (!Number.isFinite(pct) || Math.abs(pct) < 0.5) return "text-muted-foreground";
  return pct > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}

function DeltaPill({ pct }: { pct: number }) {
  const cls = deltaClass(pct);
  const Icon = pct >= 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs ${cls}`}>
      <Icon className="h-3 w-3" />
      {pct >= 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

function rangeLabel(r: DateRangeInput): string {
  if (r.preset === "custom" && r.since && r.until) {
    return `${r.since} → ${r.until}`;
  }
  return `${r.preset} ล่าสุด`;
}

function Sparkline({
  data,
  color,
  hasError,
}: {
  data: { date: string; value: number }[];
  color: string;
  hasError?: boolean;
}) {
  if (hasError) {
    return <div className="text-[10px] text-rose-600 dark:text-rose-400">โหลดไม่สำเร็จ</div>;
  }
  if (!data.length) {
    return <div className="text-xs text-muted-foreground">—</div>;
  }
  return (
    <div className="h-9 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <RTooltip
            cursor={false}
            wrapperStyle={{ fontSize: 11 }}
            formatter={(v: any) => formatCompact(Number(v))}
            labelFormatter={(l: any) => String(l)}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PerformanceComparison() {
  const [entityType, setEntityType] = useState<EntityType>("accounts");
  const [mode, setMode] = useState<Mode>("auto");
  const [rangeA, setRangeA] = useState<DateRangeInput>({ preset: "7d" });
  const [rangeB, setRangeB] = useState<DateRangeInput>({ preset: "7d" });
  const [sparkMetric, setSparkMetric] = useState<MetricKey>("spend");

  const compareQuery = trpc.comparison.compare.useQuery({
    entityType,
    rangeA,
    mode,
    rangeB: mode === "custom" ? rangeB : undefined,
  });

  const sparkQuery = trpc.comparison.sparkline.useQuery(
    {},
    { enabled: entityType === "accounts" },
  );

  const sparkMap = useMemo(() => {
    const map = new Map<number, { date: string; value: number }[]>();
    (sparkQuery.data ?? []).forEach((row: any) => {
      map.set(
        row.accountId,
        (row.days ?? []).map((d: any) => ({ date: d.date, value: Number(d[sparkMetric] ?? 0) })),
      );
    });
    return map;
  }, [sparkQuery.data, sparkMetric]);

  const rows = compareQuery.data?.rows ?? [];
  const resolvedB = compareQuery.data?.rangeB ?? rangeB;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            Performance Comparison
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            เปรียบเทียบประสิทธิภาพ 2 ช่วงเวลา พร้อม Sparkline 7 วันล่าสุด
          </p>
        </div>
      </header>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">ระดับ</label>
            <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="accounts">บัญชีโฆษณา</SelectItem>
                <SelectItem value="groups">กลุ่มสินค้า</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">โหมดเปรียบเทียบ</label>
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => v && setMode(v as Mode)}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="auto" className="text-xs">อัตโนมัติ (งวดเดียวกัน)</ToggleGroupItem>
              <ToggleGroupItem value="custom" className="text-xs">Custom A vs B</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">งวด A (ปัจจุบัน)</label>
            <DateRangePicker value={rangeA} onChange={setRangeA} />
          </div>

          {mode === "custom" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">งวด B (เปรียบเทียบ)</label>
              <DateRangePicker value={rangeB} onChange={setRangeB} />
            </div>
          )}

          {entityType === "accounts" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Sparkline แสดง</label>
              <Select value={sparkMetric} onValueChange={(v) => setSparkMetric(v as MetricKey)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRICS.map((m) => (
                    <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">งวด A: {rangeLabel(rangeA)}</Badge>
          <Badge variant="outline">งวด B: {rangeLabel(resolvedB)}</Badge>
          <Badge variant="secondary">{rows.length} แถว</Badge>
        </div>
      </Card>

      {compareQuery.error && (
        <Card className="p-4 border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-rose-700 dark:text-rose-300">โหลดข้อมูลเปรียบเทียบไม่สำเร็จ</div>
              <div className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                {compareQuery.error.message || "ไม่สามารถเชื่อมต่อระบบได้"}
              </div>
            </div>
            <button
              className="text-xs px-3 py-1.5 rounded-md bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => compareQuery.refetch()}
            >
              ลองใหม่
            </button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">{entityType === "accounts" ? "บัญชี" : "กลุ่มสินค้า"}</TableHead>
                {METRICS.map((m) => (
                  <TableHead key={m.key} className="text-right">{m.label}</TableHead>
                ))}
                {entityType === "accounts" && <TableHead className="text-center">Sparkline 7 วัน</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {compareQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={METRICS.length + 2}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={METRICS.length + 2}
                    className="h-24 text-center text-muted-foreground"
                  >
                    ไม่มีข้อมูลสำหรับเงื่อนไขนี้
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r: any) => (
                  <TableRow key={String(r.entityId)} className="hover:bg-accent/20">
                    <TableCell className="align-top">
                      <div className="flex items-center gap-2">
                        {r.color && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                        )}
                        <div>
                          <div className="font-medium truncate max-w-[220px]" title={r.label}>{r.label}</div>
                          {r.sublabel && (
                            <div className="text-xs text-muted-foreground truncate">{r.sublabel}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {METRICS.map((m) => {
                      const cur = Number(r.current?.[m.key] ?? 0);
                      const prev = Number(r.previous?.[m.key] ?? 0);
                      const pct = Number(r.deltaPct?.[m.key] ?? 0);
                      return (
                        <TableCell key={m.key} className="text-right align-top">
                          <div className="font-mono text-xs font-semibold">{m.fmt(cur)}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">vs {m.fmt(prev)}</div>
                          <DeltaPill pct={pct} />
                        </TableCell>
                      );
                    })}
                    {entityType === "accounts" && (
                      <TableCell className="align-middle">
                        <div className="flex justify-center">
                          <Sparkline
                            data={sparkMap.get(Number(r.entityId)) ?? []}
                            color="hsl(var(--primary))"
                            hasError={!!sparkQuery.error}
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground italic">
        * โหมด "อัตโนมัติ" จะใช้ช่วงก่อนหน้าที่ความยาวเท่ากันเป็นงวด B โดยอัตโนมัติ
        (เช่น ถ้าเลือก 7 วันล่าสุด งวด B จะเป็น 7 วันก่อนหน้านั้น)
      </p>
    </div>
  );
}
