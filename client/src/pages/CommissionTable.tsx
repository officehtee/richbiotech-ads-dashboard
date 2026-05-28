import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatPercent, formatRoas } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type {
  CommissionClipBlock,
  CommissionGroupBlock,
  CommissionRow,
  CommissionSnapshot,
  DateRangeInput,
} from "@shared/types";
import { Lock, Loader2, Save, Unlock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function periodKeyFromMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number) {
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  return `${months[month - 1]} ${year + 543}`;
}

export default function CommissionTable() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner" || user?.role === "ceo";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const periodKey = periodKeyFromMonth(year, month);

  const lockQuery = trpc.commission.getLock.useQuery({ periodKey });
  const grades = trpc.commission.grades.useQuery();
  const staff = trpc.commission.staff.useQuery();
  const assignments = trpc.commission.clipAssignments.useQuery();
  const clipGrades = trpc.commission.clipGrades.useQuery({ periodKey });
  const groups = trpc.groups.list.useQuery();
  const utils = trpc.useUtils();

  // Live: pull adsets ของเดือนนี้
  const dateRange: DateRangeInput = useMemo(() => {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));
    return {
      preset: "custom",
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, [year, month]);
  const adsets = trpc.ads.list.useQuery({ dateRange });

  const setClipGrade = trpc.commission.setClipGrade.useMutation({
    onSuccess: () => utils.commission.clipGrades.invalidate({ periodKey }),
  });
  const saveLock = trpc.commission.saveLock.useMutation({
    onSuccess: async () => {
      toast.success("Lock งวดนี้แล้ว — Snapshot ถูกเก็บเรียบร้อย");
      await utils.commission.getLock.invalidate({ periodKey });
      await utils.commission.locks.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const removeLock = trpc.commission.removeLock.useMutation({
    onSuccess: async () => {
      toast.success("ปลด Lock แล้ว");
      await utils.commission.getLock.invalidate({ periodKey });
    },
  });

  const isLocked = !!lockQuery.data;

  // สร้าง snapshot จากข้อมูล live
  const liveSnapshot: CommissionSnapshot = useMemo(() => {
    const adsetList = adsets.data ?? [];
    const assignList = assignments.data ?? [];
    const stafList = staff.data ?? [];
    const grpList = groups.data ?? [];
    const cgList = clipGrades.data ?? [];

    // map clip → assignment
    const clipToGroup = new Map<string, number | null>();
    const clipToStaff = new Map<string, number | null>();
    for (const a of assignList) {
      clipToGroup.set(a.clipNumber, a.groupId);
      clipToStaff.set(a.clipNumber, a.staffId);
    }

    // group blocks
    const blocks = new Map<number, CommissionGroupBlock>();
    for (const g of grpList) {
      blocks.set(g.id, {
        groupId: g.id,
        groupName: g.groupName,
        color: g.color ?? "#3b82f6",
        clips: [],
      });
    }
    // misc bucket
    const miscBlock: CommissionGroupBlock = {
      groupId: 0,
      groupName: "ยังไม่ได้กำหนดกลุ่ม",
      color: "#94a3b8",
      clips: [],
    };

    // bucket clips
    const clipMap = new Map<string, CommissionClipBlock>();

    for (const a of adsetList) {
      // รับ clip จาก campaignName หรือ adsetName ที่ขึ้นต้นด้วยเลข เช่น "289 ..."
      const m = a.adsetName.match(/^\s*(\d{1,5})\b/) ?? a.campaignName.match(/^\s*(\d{1,5})\b/);
      const clipNumber = m ? m[1] : "OTHER";
      let clip = clipMap.get(clipNumber);
      if (!clip) {
        const stf = clipToStaff.get(clipNumber) ?? null;
        const stfName = stafList.find((s) => s.id === stf)?.name ?? null;
        const cg = cgList.find((c) => c.clipNumber === clipNumber);
        const grdId = cg?.gradeId ?? null;
        const grd = grades.data?.find((g) => g.id === grdId);
        clip = {
          clipNumber,
          staffName: stfName,
          staffId: stf,
          gradeName: grd?.gradeName ?? null,
          gradeAmount: grd?.amount ?? 0,
          rows: [],
        };
        clipMap.set(clipNumber, clip);

        const grpId = clipToGroup.get(clipNumber) ?? null;
        if (grpId && blocks.has(grpId)) blocks.get(grpId)!.clips.push(clip);
        else miscBlock.clips.push(clip);
      }

      const row: CommissionRow = {
        campaignName: a.campaignName,
        messaging: a.messaging,
        purchases: a.purchases,
        purchaseValue: a.purchaseValue,
        spend: a.spend,
        roas: a.roas,
        adsPercent: a.purchaseValue > 0 ? (a.spend / a.purchaseValue) * 100 : 0,
      };
      clip.rows.push(row);
    }

    return {
      groups: [...Array.from(blocks.values()).filter((b) => b.clips.length > 0), ...(miscBlock.clips.length ? [miscBlock] : [])],
    };
  }, [adsets.data, assignments.data, staff.data, groups.data, clipGrades.data, grades.data]);

  // เลือก snapshot ที่จะแสดง
  const display: CommissionSnapshot = isLocked
    ? (lockQuery.data!.snapshot as CommissionSnapshot)
    : liveSnapshot;

  // Total
  const total = useMemo(() => {
    let comm = 0;
    let spend = 0;
    let revenue = 0;
    for (const g of display.groups) {
      for (const c of g.clips) {
        comm += c.gradeAmount;
        for (const r of c.rows) {
          spend += r.spend;
          revenue += r.purchaseValue;
        }
      }
    }
    return { comm, spend, revenue };
  }, [display]);

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            ตารางคอมมิชชั่น
            {isLocked && <span className="text-xs px-2 py-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center gap-1"><Lock className="h-3 w-3" />Locked</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{monthLabel(year, month)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y + 543}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v, 10))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>{monthLabel(year, m).split(" ")[0]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5"><p className="text-xs text-muted-foreground">ยอดคอมรวม</p><p className="text-2xl font-bold mt-1">{formatCurrency(total.comm)}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground">Spend รวม</p><p className="text-2xl font-bold mt-1">{formatCurrency(total.spend)}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground">Revenue รวม</p><p className="text-2xl font-bold mt-1">{formatCurrency(total.revenue)}</p></Card>
      </div>

      {isOwner && (
        <Card className="p-4 flex items-center gap-3 bg-amber-500/5 border-amber-500/20">
          {isLocked ? (
            <>
              <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <p className="text-sm flex-1">งวดนี้ถูก Lock แล้ว — ข้อมูลจะไม่เปลี่ยนแม้ Meta API จะมีค่าใหม่</p>
              <Button variant="outline" size="sm" onClick={() => {
                if (confirm("ปลด Lock งวดนี้?")) removeLock.mutate({ periodKey });
              }}>
                <Unlock className="h-3.5 w-3.5 mr-1.5" />ปลด Lock
              </Button>
            </>
          ) : (
            <>
              <Save className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <p className="text-sm flex-1">เมื่อปิดงวดแล้ว ให้ Lock เพื่อบันทึก Snapshot ป้องกันข้อมูลเปลี่ยน</p>
              <Button
                size="sm"
                disabled={saveLock.isPending}
                onClick={() => saveLock.mutate({
                  periodKey,
                  periodLabel: monthLabel(year, month),
                  snapshot: liveSnapshot,
                })}
              >
                {saveLock.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Lock className="h-3.5 w-3.5 mr-1.5" />}
                Lock งวดนี้
              </Button>
            </>
          )}
        </Card>
      )}

      {adsets.isLoading && !isLocked ? (
        <Skeleton className="h-64 w-full" />
      ) : display.groups.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">ยังไม่มีข้อมูลในงวดนี้</Card>
      ) : (
        <div className="space-y-4">
          {display.groups.map((g) => (
            <Card key={g.groupId} className="overflow-hidden">
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderLeftWidth: 4, borderLeftColor: g.color }}>
                <p className="font-semibold tracking-tight flex-1">{g.groupName}</p>
                <p className="text-xs text-muted-foreground">{g.clips.length} clips</p>
              </div>
              {g.clips.map((c) => {
                const clipSpend = c.rows.reduce((a, r) => a + r.spend, 0);
                const clipRev = c.rows.reduce((a, r) => a + r.purchaseValue, 0);
                return (
                  <div key={c.clipNumber} className="border-b last:border-0">
                    <div className="px-5 py-2 bg-muted/30 flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-mono font-semibold">#{c.clipNumber}</span>
                      <span className="text-muted-foreground">{c.staffName ?? "—"}</span>
                      <span className="flex-1" />
                      {!isLocked && isOwner ? (
                        <Select
                          value={c.gradeName ?? "none"}
                          onValueChange={(v) => {
                            const gradeId = v === "none" ? null : grades.data?.find((g) => g.gradeName === v)?.id ?? null;
                            const grpId = c.staffId ? null : g.groupId || null;
                            void grpId;
                            setClipGrade.mutate({
                              clipNumber: c.clipNumber,
                              groupId: g.groupId || null,
                              gradeId,
                              periodKey,
                            });
                          }}
                        >
                          <SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="Grade" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Grade —</SelectItem>
                            {(grades.data ?? []).map((gr) => (
                              <SelectItem key={gr.id} value={gr.gradeName}>{gr.gradeName} ({formatCurrency(gr.amount)})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                          {c.gradeName ?? "—"}
                        </span>
                      )}
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(c.gradeAmount)}</span>
                    </div>
                    <table className="w-full text-xs">
                      <thead><tr className="text-[10px] text-muted-foreground border-b">
                        <th className="py-1.5 px-5 text-left">Campaign</th>
                        <th className="py-1.5 px-2 text-right">ทัก</th>
                        <th className="py-1.5 px-2 text-right">Orders</th>
                        <th className="py-1.5 px-2 text-right">Revenue</th>
                        <th className="py-1.5 px-2 text-right">Spend</th>
                        <th className="py-1.5 px-2 text-right">ROAS</th>
                        <th className="py-1.5 px-5 text-right">%Ads</th>
                      </tr></thead>
                      <tbody>
                        {c.rows.map((r, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1.5 px-5 max-w-[280px] truncate" title={r.campaignName}>{r.campaignName}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{formatNumber(r.messaging)}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{formatNumber(r.purchases)}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(r.purchaseValue)}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(r.spend)}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{formatRoas(r.roas)}</td>
                            <td className="py-1.5 px-5 text-right font-mono">{formatPercent(r.adsPercent)}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/40 font-semibold">
                          <td className="py-1.5 px-5">รวม</td>
                          <td colSpan={2}></td>
                          <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(clipRev)}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(clipSpend)}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{formatRoas(clipSpend > 0 ? clipRev / clipSpend : 0)}</td>
                          <td className="py-1.5 px-5 text-right font-mono">{formatPercent(clipRev > 0 ? (clipSpend / clipRev) * 100 : 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Suppress unused import warning
void useEffect;
