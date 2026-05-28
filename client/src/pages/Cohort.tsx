import DateRangePicker from "@/components/DateRangePicker";
import type { DateRangeInput } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { trpc } from "@/lib/trpc";
import { Grid3x3, Layers, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

const BUCKET_STYLES: Record<string, string> = {
  great: "bg-emerald-500/90 text-white",
  good: "bg-emerald-300/80 text-emerald-950",
  ok: "bg-amber-300/80 text-amber-950",
  warn: "bg-orange-400/80 text-white",
  bad: "bg-rose-500/90 text-white",
};

function fmtBaht(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);
}

function HeatCell({ spend, roas, bucket }: { spend: number; roas: number; bucket: string }) {
  if (spend === 0) {
    return <div className="h-12 rounded bg-muted/40" title="ไม่มีข้อมูล" />;
  }
  return (
    <div
      className={`h-12 rounded flex flex-col items-center justify-center px-1 ${BUCKET_STYLES[bucket] || "bg-muted"}`}
      title={`฿${fmtBaht(spend)} · ROAS ${roas.toFixed(2)}`}
    >
      <div className="text-[10px] font-bold leading-none">{roas.toFixed(1)}x</div>
      <div className="text-[9px] opacity-80 leading-none mt-0.5">฿{fmtBaht(spend)}</div>
    </div>
  );
}

export default function Cohort() {
  const [mode, setMode] = useState<"adAge" | "weekStart">("adAge");
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "1d" });
  const [maxDays, setMaxDays] = useState(14);

  const adAgeQ = trpc.cohort.byAdAge.useQuery(
    { dateRange, maxAds: 20, maxDays },
    { enabled: mode === "adAge", refetchOnWindowFocus: false },
  );
  const weekQ = trpc.cohort.byStartWeek.useQuery(
    { dateRange, maxDays },
    { enabled: mode === "weekStart", refetchOnWindowFocus: false },
  );

  const activeQuery = mode === "adAge" ? adAgeQ : weekQ;
  const isLoading = activeQuery.isLoading;
  const error = activeQuery.error;

  const headerDays = useMemo(
    () => Array.from({ length: maxDays }, (_, i) => `D${i}`),
    [maxDays],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Grid3x3 className="h-6 w-6 text-primary" />
            Cohort Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            วิเคราะห์ตามอายุแอด (D0, D1, D2…) หรือสัปดาห์ที่เริ่มยิง — สีบอก ROAS เทียบเป้า
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as any)}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="adAge">อายุแอด</ToggleGroupItem>
            <ToggleGroupItem value="weekStart">สัปดาห์เริ่มยิง</ToggleGroupItem>
          </ToggleGroup>

          <Select value={String(maxDays)} onValueChange={(v) => setMaxDays(Number(v))}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 วัน</SelectItem>
              <SelectItem value="14">14 วัน</SelectItem>
              <SelectItem value="21">21 วัน</SelectItem>
              <SelectItem value="28">28 วัน</SelectItem>
            </SelectContent>
          </Select>

          <DateRangePicker value={dateRange} onChange={setDateRange} />

          <Button
            variant="outline"
            size="sm"
            onClick={() => activeQuery.refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
        </div>
      </header>

      {/* Legend */}
      <Card className="p-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="text-muted-foreground">สี ROAS:</span>
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-emerald-500/90"></span>≥ 3x (เยี่ยม)
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-emerald-300/80"></span>≥ 2x (ดี)
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-amber-300/80"></span>≥ 1.4x (พอใช้)
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-orange-400/80"></span>≥ 0.8x (ต้องดู)
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-rose-500/90"></span>&lt; 0.8x (แย่)
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-muted/40 border"></span>ไม่มีข้อมูล
        </div>
      </Card>

      {error ? (
        <Card className="p-8 text-center">
          <p className="text-rose-500 mb-3">โหลด Cohort ล้มเหลว: {error.message}</p>
          <Button variant="outline" onClick={() => activeQuery.refetch()}>ลองใหม่</Button>
        </Card>
      ) : isLoading ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Layers className="h-12 w-12 mx-auto mb-3 opacity-30 animate-pulse" />
          กำลังโหลด Cohort… (อาจใช้เวลา 10–30 วินาที)
        </Card>
      ) : mode === "adAge" ? (
        <AdAgeView rows={adAgeQ.data ?? []} headerDays={headerDays} />
      ) : (
        <WeekView rows={weekQ.data ?? []} headerDays={headerDays} />
      )}
    </div>
  );
}

function AdAgeView({ rows, headerDays }: { rows: any[]; headerDays: string[] }) {
  if (rows.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        <Grid3x3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        ยังไม่มีข้อมูล Cohort ในช่วงนี้
      </Card>
    );
  }
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            <th className="text-left p-2 font-semibold sticky left-0 bg-muted/50 min-w-[180px]">
              Adset / บัญชี
            </th>
            <th className="text-right p-2 font-semibold min-w-[80px]">เริ่ม</th>
            <th className="text-right p-2 font-semibold min-w-[80px]">งบรวม</th>
            <th className="text-right p-2 font-semibold min-w-[60px]">ROAS</th>
            {headerDays.map((d) => (
              <th key={d} className="text-center p-1 font-medium min-w-[64px]">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.adsetId} className="border-t">
              <td className="p-2 sticky left-0 bg-card">
                <div className="font-medium truncate max-w-[180px]" title={r.adsetName}>
                  {r.adsetName}
                </div>
                <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                  {r.accountName}
                </div>
              </td>
              <td className="p-2 text-right font-mono text-[10px]">{r.startDate}</td>
              <td className="p-2 text-right font-mono">฿{fmtBaht(r.totalSpend)}</td>
              <td className="p-2 text-right">
                <Badge
                  className={`${BUCKET_STYLES[
                    r.totalRoas >= 3 ? "great" : r.totalRoas >= 2 ? "good" : r.totalRoas >= 1.4 ? "ok" : r.totalRoas >= 0.8 ? "warn" : "bad"
                  ]} text-[10px]`}
                >
                  {r.totalRoas.toFixed(2)}x
                </Badge>
              </td>
              {r.days.map((d: any) => (
                <td key={d.dayN} className="p-1">
                  <HeatCell spend={d.spend} roas={d.roas} bucket={d.bucket} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function WeekView({ rows, headerDays }: { rows: any[]; headerDays: string[] }) {
  if (rows.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
        ยังไม่มีข้อมูล Cohort
      </Card>
    );
  }
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            <th className="text-left p-2 font-semibold sticky left-0 bg-muted/50 min-w-[140px]">
              สัปดาห์เริ่ม
            </th>
            <th className="text-right p-2 font-semibold min-w-[60px]">#แอด</th>
            <th className="text-right p-2 font-semibold min-w-[80px]">งบรวม</th>
            <th className="text-right p-2 font-semibold min-w-[60px]">ROAS</th>
            {headerDays.map((d) => (
              <th key={d} className="text-center p-1 font-medium min-w-[64px]">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.weekStart} className="border-t">
              <td className="p-2 sticky left-0 bg-card font-mono text-[11px]">{r.weekStart}</td>
              <td className="p-2 text-right">{r.adCount}</td>
              <td className="p-2 text-right font-mono">฿{fmtBaht(r.totalSpend)}</td>
              <td className="p-2 text-right">
                <Badge
                  className={`${BUCKET_STYLES[
                    r.totalRoas >= 3 ? "great" : r.totalRoas >= 2 ? "good" : r.totalRoas >= 1.4 ? "ok" : r.totalRoas >= 0.8 ? "warn" : "bad"
                  ]} text-[10px]`}
                >
                  {r.totalRoas.toFixed(2)}x
                </Badge>
              </td>
              {r.days.map((d: any) => (
                <td key={d.dayN} className="p-1">
                  <HeatCell spend={d.spend} roas={d.roas} bucket={d.bucket} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
