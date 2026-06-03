import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, Loader2, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";

function formatTime(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Round 7.40: Auto-sync control panel.
 * แสดงสถานะ + เปิด/ปิด Heartbeat cron jobs (sync ทุก 1 ชม.)
 */
export function AutoSyncSection() {
  const utils = trpc.useUtils();
  const statusQuery = trpc.schedule.status.useQuery(undefined, {
    refetchInterval: 60 * 1000, // refresh สถานะทุก 1 นาที
  });

  const enableAll = trpc.schedule.enableAll.useMutation({
    onSuccess: async () => {
      toast.success("เปิดใช้งานการซิงค์อัตโนมัติแล้ว — ระบบจะดึงข้อมูลทุก 1 ชั่วโมง");
      await utils.schedule.status.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const disableAll = trpc.schedule.disableAll.useMutation({
    onSuccess: async () => {
      toast.success("ปิดการซิงค์อัตโนมัติแล้ว");
      await utils.schedule.status.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleJob = trpc.schedule.toggleJob.useMutation({
    onSuccess: async () => {
      await utils.schedule.status.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const data = statusQuery.data;
  const loading = statusQuery.isLoading;
  const busy = enableAll.isPending || disableAll.isPending;
  const masterOn = data?.autoSyncEnabled ?? false;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">การซิงค์ข้อมูลอัตโนมัติ</h2>
              {masterOn ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  เปิดอยู่
                </Badge>
              ) : data?.partiallyConfigured ? (
                <Badge variant="outline" className="text-amber-600 border-amber-500/40">
                  ตั้งค่าบางส่วน
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  ปิดอยู่
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              เมื่อเปิดใช้งาน ระบบจะดึงข้อมูลโฆษณาจาก Meta อัตโนมัติ <strong>ทุก 1 ชั่วโมง</strong> โดยไม่ต้องกดปุ่ม
              Sync Now เอง — ครอบคลุมการซิงค์ข้อมูลโฆษณา, บัญชี Business Manager และการตรวจการแจ้งเตือน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            checked={masterOn}
            disabled={loading || busy}
            onCheckedChange={(v) => {
              if (v) enableAll.mutate();
              else disableAll.mutate();
            }}
            aria-label="เปิด/ปิดการซิงค์อัตโนมัติ"
          />
        </div>
      </div>

      {/* รายการ jobs */}
      <div className="mt-5 space-y-2.5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังโหลดสถานะ…
          </div>
        ) : (
          data?.jobs.map((job) => (
            <div
              key={job.key}
              className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{job.label}</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {job.intervalLabel}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    รันล่าสุด: {formatTime(job.lastExecutedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    รอบถัดไป: {formatTime(job.nextExecutionAt)}
                  </span>
                </div>
              </div>
              <Switch
                checked={job.exists && job.isEnable}
                disabled={busy || toggleJob.isPending}
                onCheckedChange={(v) => toggleJob.mutate({ key: job.key, enable: v })}
                aria-label={`เปิด/ปิด ${job.label}`}
              />
            </div>
          ))
        )}
      </div>

      {/* คำอธิบายเชิงเทคนิค */}
      <div className="mt-4 rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">หมายเหตุ:</strong> ข้อมูลจาก Meta Ads API มีความล่าช้าในตัวเอง
        15–30 นาที ดังนั้นการซิงค์ทุก 1 ชั่วโมงจึงเป็นจุดสมดุลที่เหมาะสมระหว่างความสดของข้อมูลกับการป้องกัน
        Meta จำกัดอัตราการเรียก API (rate limit) รอบเที่ยงคืน (เวลา UTC) ระบบจะดึงข้อมูลย้อนหลัง 7 วันให้อัตโนมัติ
        <br />
        การตั้งเวลาจะเริ่มทำงานหลังเผยแพร่เว็บ (Publish) แล้วเท่านั้น
      </div>
    </Card>
  );
}
