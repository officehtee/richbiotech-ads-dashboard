import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  ChevronRight,
  History,
  Loader2,
  RefreshCw,
} from "lucide-react";

function formatTime(ts: string | Date | null): string {
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

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} วิ`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s % 60);
  return `${m} น. ${rs} วิ`;
}

function StatusBadge({ status }: { status: "success" | "partial" | "failed" }) {
  if (status === "success")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">
        สำเร็จ
      </Badge>
    );
  if (status === "partial")
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-500/40">
        บางส่วน
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-red-600 border-red-500/40">
      ล้มเหลว
    </Badge>
  );
}

/**
 * Round 7.44: Sync Log — แสดงประวัติการ sync แต่ละรอบ (owner/ceo)
 * - ยุบเป็น expand/collapse เพื่อไม่ให้รกหน้าจอ
 * - แสดง: เวลา, บัญชีใหม่/เก่า, rows, ล้มเหลว, ระยะเวลา, สถานะ
 */
export function SyncLogSection() {
  const [open, setOpen] = useState(false);

  const logsQuery = trpc.syncLogs.list.useQuery(
    { limit: 30 },
    {
      enabled: open, // โหลดเฉพาะตอนเปิดดู เพื่อไม่ให้ยิง query โดยไม่จำเป็น
      refetchInterval: open ? 60 * 1000 : false,
    },
  );

  const logs = logsQuery.data ?? [];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">ประวัติการซิงค์ข้อมูล</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              บันทึกผลการซิงค์แต่ละรอบ — บัญชีใหม่/เก่า, จำนวนแถวข้อมูล, ความสำเร็จ ใช้ตรวจสอบเมื่อ Meta อนุมัติการเชื่อมต่อ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {open && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => logsQuery.refetch()}
              disabled={logsQuery.isFetching}
            >
              {logsQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 text-sm">
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={open}
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          />
          {open ? "ซ่อนประวัติ" : "ดูประวัติการซิงค์"}
        </button>
      </div>

      {open && (
        <div className="mt-3">
          {logsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังโหลดประวัติ…
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              ยังไม่มีประวัติการซิงค์ — ระบบจะบันทึกอัตโนมัติเมื่อรอบซิงค์แรกทำงาน (หลังเผยแพร่เว็บ)
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เวลา</TableHead>
                    <TableHead className="text-right">บัญชีใหม่</TableHead>
                    <TableHead className="text-right">บัญชีเก่า</TableHead>
                    <TableHead className="text-right">แถวข้อมูล</TableHead>
                    <TableHead className="text-right">ล้มเหลว</TableHead>
                    <TableHead className="text-right">ระยะเวลา</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatTime(log.runAt)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {log.newAccounts > 0 ? (
                          <span className="font-medium text-primary">{log.newAccounts}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {log.existingAccounts}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {log.rowsSynced.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {log.failed > 0 ? (
                          <span className="text-red-600 font-medium">{log.failed}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        {formatDuration(log.durationMs)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
