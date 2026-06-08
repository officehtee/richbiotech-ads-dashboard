import DateRangePicker from "@/components/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatCurrency, formatPercent, formatRoas } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { DateRangeInput, ScalingScoreData } from "@shared/types";
import { History, Loader2, Plus, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const BADGE_COLOR: Record<string, string> = {
  "scale-up-large": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "scale-up-small": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  "watch": "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  "scale-down-small": "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  "scale-down-large": "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  "neutral": "bg-muted text-muted-foreground border",
};

export default function SmartScaling() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner" || user?.role === "ceo" || user?.role === "supervisor";
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "7d" });
  const [tab, setTab] = useState<"suggestions" | "logs" | "settings">("suggestions");
  const [showLog, setShowLog] = useState<ScalingScoreData | null>(null);
  const [logForm, setLogForm] = useState({ budgetScaled: 0, notes: "" });

  const suggestions = trpc.scaling.suggestions.useQuery({ dateRange, minSpend: 100 });
  const logs = trpc.scaling.listLogs.useQuery();
  const settings = trpc.scaling.settings.useQuery();
  const utils = trpc.useUtils();

  const createLog = trpc.scaling.createLog.useMutation({
    onSuccess: async () => {
      toast.success("บันทึกการ Scale แล้ว");
      await utils.scaling.listLogs.invalidate();
      setShowLog(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const closeLog = trpc.scaling.closeLog.useMutation({
    onSuccess: async () => {
      toast.success("ปิด log แล้ว");
      await utils.scaling.listLogs.invalidate();
    },
  });
  const removeLog = trpc.scaling.removeLog.useMutation({
    onSuccess: async () => {
      toast.success("ลบ log แล้ว");
      await utils.scaling.listLogs.invalidate();
    },
  });
  const saveSettings = trpc.scaling.saveSettings.useMutation({
    onSuccess: async () => {
      toast.success("บันทึกการตั้งค่าแล้ว");
      await utils.scaling.settings.invalidate();
    },
  });

  const [settingsForm, setSettingsForm] = useState({
    increaseSmallPercent: 20,
    increaseLargePercent: 50,
    decreaseSmallPercent: 20,
    decreaseLargePercent: 30,
  });

  const onOpenLog = (s: ScalingScoreData) => {
    setShowLog(s);
    let pct = 0;
    if (s.badge === "scale-up-large") pct = (settings.data?.increaseLargePercent ?? 50) / 100;
    else if (s.badge === "scale-up-small") pct = (settings.data?.increaseSmallPercent ?? 20) / 100;
    else if (s.badge === "scale-down-small") pct = -(settings.data?.decreaseSmallPercent ?? 20) / 100;
    else if (s.badge === "scale-down-large") pct = -(settings.data?.decreaseLargePercent ?? 30) / 100;
    setLogForm({ budgetScaled: Math.round(s.spend * (1 + pct)), notes: s.recommendation });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">แนะนำปรับงบ</h1>
          <p className="text-sm text-muted-foreground mt-1">
            คำแนะนำการปรับงบ Adset ตามคะแนน ROAS×0.7 + CTR×0.3
          </p>
        </div>
        {tab === "suggestions" && <DateRangePicker value={dateRange} onChange={setDateRange} />}
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="suggestions">คำแนะนำ</TabsTrigger>
          <TabsTrigger value="logs"><History className="h-3.5 w-3.5 mr-1" />ประวัติ</TabsTrigger>
          {isOwner && <TabsTrigger value="settings"><Settings className="h-3.5 w-3.5 mr-1" />ตั้งค่า</TabsTrigger>}
        </TabsList>

        <TabsContent value="suggestions" className="mt-6">
          {suggestions.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
            </div>
          ) : !suggestions.data || suggestions.data.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              ยังไม่มีข้อมูลเพียงพอ — ต้องมี Adset ที่ใช้งบมากกว่า ฿100
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestions.data.map((s) => (
                <Card key={s.adsetId} className={`p-4 border-l-4 ${BADGE_COLOR[s.badge].split(" ").find(c => c.startsWith("border-")) ?? ""}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold tracking-tight text-sm line-clamp-2 flex-1" title={s.adsetName}>
                      {s.adsetName}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded border ${BADGE_COLOR[s.badge]}`}>
                      {s.badgeIcon}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-3" title={s.campaignName}>
                    {s.campaignName}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div>
                      <p className="text-muted-foreground">Spend</p>
                      <p className="font-mono font-semibold">{formatCurrency(s.spend)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ROAS</p>
                      <p className="font-mono font-semibold">{formatRoas(s.roas)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CTR</p>
                      <p className="font-mono font-semibold">{formatPercent(s.ctr)}</p>
                    </div>
                  </div>
                  <p className="text-xs bg-muted/50 rounded p-2 mb-2">{s.recommendation}</p>
                  {(s.badge === "scale-up-large" || s.badge === "scale-up-small" || s.badge === "scale-down-small" || s.badge === "scale-down-large") && (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => onOpenLog(s)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      บันทึก Scale
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="py-2 px-4 text-left">วันที่</th>
                  <th className="py-2 px-4 text-left">Adset</th>
                  <th className="py-2 px-4 text-right">งบใหม่</th>
                  <th className="py-2 px-4 text-left">หมายเหตุ</th>
                  <th className="py-2 px-4 text-left">สถานะ</th>
                  <th className="py-2 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {!logs.data || logs.data.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">ยังไม่มีประวัติ</td></tr>
                ) : (
                  logs.data.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-2 px-4 text-xs">{l.scaledAt ? new Date(l.scaledAt).toLocaleString("th-TH") : "—"}</td>
                      <td className="py-2 px-4 max-w-[260px] truncate" title={l.adsetName ?? ""}>{l.adsetName ?? "—"}</td>
                      <td className="py-2 px-4 text-right font-mono text-xs">{formatCurrency(l.budgetScaled ?? 0)}</td>
                      <td className="py-2 px-4 text-xs text-muted-foreground line-clamp-1 max-w-[260px]">{l.notes ?? "—"}</td>
                      <td className="py-2 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded ${l.status === "active" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                          {l.status === "active" ? "ใช้งานอยู่" : "ปิดแล้ว"}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right">
                        {l.status === "active" && (
                          <Button size="sm" variant="ghost" onClick={() => closeLog.mutate({ id: l.id })}>ปิด</Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                          if (confirm("ลบ log นี้?")) removeLog.mutate({ id: l.id });
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {isOwner && (
          <TabsContent value="settings" className="mt-6">
            <Card className="p-6 max-w-xl space-y-4">
              <p className="font-semibold">% ปรับงบตามสัญญาณ</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">เพิ่มงบ (Large 🚀)</Label>
                  <Input
                    type="number"
                    value={settings.data?.increaseLargePercent ?? settingsForm.increaseLargePercent}
                    onChange={(e) => setSettingsForm({ ...settingsForm, increaseLargePercent: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">เพิ่มงบ (Small ✅)</Label>
                  <Input
                    type="number"
                    value={settings.data?.increaseSmallPercent ?? settingsForm.increaseSmallPercent}
                    onChange={(e) => setSettingsForm({ ...settingsForm, increaseSmallPercent: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ลดงบ (Small 📉)</Label>
                  <Input
                    type="number"
                    value={settings.data?.decreaseSmallPercent ?? settingsForm.decreaseSmallPercent}
                    onChange={(e) => setSettingsForm({ ...settingsForm, decreaseSmallPercent: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ลดงบ (Large ⛔)</Label>
                  <Input
                    type="number"
                    value={settings.data?.decreaseLargePercent ?? settingsForm.decreaseLargePercent}
                    onChange={(e) => setSettingsForm({ ...settingsForm, decreaseLargePercent: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <Button
                disabled={saveSettings.isPending}
                onClick={() => saveSettings.mutate({
                  increaseSmallPercent: settings.data?.increaseSmallPercent ?? settingsForm.increaseSmallPercent,
                  increaseLargePercent: settings.data?.increaseLargePercent ?? settingsForm.increaseLargePercent,
                  decreaseSmallPercent: settings.data?.decreaseSmallPercent ?? settingsForm.decreaseSmallPercent,
                  decreaseLargePercent: settings.data?.decreaseLargePercent ?? settingsForm.decreaseLargePercent,
                })}
              >
                {saveSettings.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                บันทึก
              </Button>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!showLog} onOpenChange={(v) => !v && setShowLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกการ Scale</DialogTitle>
          </DialogHeader>
          {showLog && (
            <div className="space-y-3">
              <div className="text-sm">
                <p className="font-medium line-clamp-2">{showLog.adsetName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Spend ปัจจุบัน {formatCurrency(showLog.spend)}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>งบใหม่ (THB)</Label>
                <Input
                  type="number"
                  value={logForm.budgetScaled}
                  onChange={(e) => setLogForm({ ...logForm, budgetScaled: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>หมายเหตุ</Label>
                <Input
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLog(null)}>ยกเลิก</Button>
            <Button
              disabled={createLog.isPending}
              onClick={() => {
                if (!showLog) return;
                createLog.mutate({
                  accountId: showLog.accountId,
                  groupId: showLog.groupId ?? null,
                  adsetId: showLog.adsetId,
                  adsetName: showLog.adsetName,
                  phaseName: showLog.phaseName ?? null,
                  budgetScaled: logForm.budgetScaled,
                  spendAll: showLog.spend,
                  notes: logForm.notes,
                });
              }}
            >
              {createLog.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
