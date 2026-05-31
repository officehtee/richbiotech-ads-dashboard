/**
 * BMDetail — Round 7.23 Phase 3
 *
 * Route: /accounts/bm/:id
 *
 * แสดง:
 *   • หัวเรื่อง: ชื่อ BM, BM ID, สถานะ, ปุ่ม Sync Now / กลับ
 *   • Tab "บัญชีในกลุ่ม" — list ad accounts ที่เคย discover (active + removed)
 *   • Tab "ประวัติ Sync" — bmDiscoveryLogs ล่าสุด 25 record
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

const BM_STATUS_LABEL: Record<string, { label: string; tone: "ok" | "warn" | "danger" }> = {
  active: { label: "ใช้งานได้", tone: "ok" },
  token_expired: { label: "Token หมดอายุ", tone: "warn" },
  blocked: { label: "ถูกบล็อก", tone: "danger" },
  revoked: { label: "ถูกยกเลิก", tone: "danger" },
};

function StatusPill({ status }: { status: string }) {
  const meta = BM_STATUS_LABEL[status] ?? { label: status, tone: "warn" as const };
  const cls =
    meta.tone === "ok"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
      : meta.tone === "warn"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
        : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30";
  return <Badge variant="outline" className={cls}>{meta.label}</Badge>;
}

function fmtTime(d: unknown): string {
  if (!d) return "—";
  const t = d instanceof Date ? d.getTime() : typeof d === "string" ? Date.parse(d) : (d as number);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
}

function LogStatusIcon({ status }: { status: string }) {
  if (status === "success") return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  if (status === "partial") return <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
}

const TRIGGER_LABEL: Record<string, string> = {
  initial: "เพิ่มครั้งแรก",
  manual: "Sync เอง",
  auto: "Sync อัตโนมัติ",
};

export default function BMDetail() {
  const [, params] = useRoute("/accounts/bm/:id");
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const idNum = params?.id ? parseInt(params.id, 10) : 0;

  const detailQuery = trpc.bm.detail.useQuery({ id: idNum }, { enabled: idNum > 0 });
  const groupsQuery = trpc.groups.list.useQuery();

  const syncMutation = trpc.bm.sync.useMutation({
    onSuccess: async (data: any) => {
      if (data?.ok === false && data?.error) {
        toast.error(`Sync ไม่สำเร็จ: ${data.error.title ?? "ไม่ทราบสาเหตุ"}`);
      } else {
        toast.success(
          `Sync สำเร็จ — ใหม่ ${data.newCount} • มีอยู่ ${data.existingCount} • ถอด ${data.removedCount}`,
        );
      }
      await utils.bm.detail.invalidate({ id: idNum });
      await utils.bm.list.invalidate();
      await utils.accounts.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (detailQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (detailQuery.error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/accounts")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          กลับ
        </Button>
        <Card>
          <CardContent className="p-6 text-center text-sm text-destructive">
            โหลดข้อมูล BM ไม่สำเร็จ — {detailQuery.error.message}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!detailQuery.data) return null;

  const { bm, links, logs } = detailQuery.data;
  const groupName =
    groupsQuery.data?.find((g: any) => g.id === bm.accountGroupId)?.groupName ??
    `#${bm.accountGroupId}`;

  const activeLinks = links.filter((l: any) => l.status === "active");
  const removedLinks = links.filter((l: any) => l.status !== "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/accounts")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          กลับไปหน้าจัดการบัญชี
        </Button>
        <Button
          size="sm"
          onClick={() => syncMutation.mutate({ id: bm.id })}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <RefreshCcw className="h-4 w-4 mr-1.5" />
          )}
          Sync เดี๋ยวนี้
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            {bm.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <Stat label="BM ID" value={<span className="font-mono">{bm.bmId}</span>} />
          <Stat label="กลุ่มสินค้า" value={groupName} />
          <Stat label="สถานะ" value={<StatusPill status={bm.status} />} />
          <Stat
            label="Sync ล่าสุด"
            value={
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {fmtTime(bm.lastSyncAt)}
              </span>
            }
          />
          <Stat label="บัญชี active" value={<span className="font-mono">{activeLinks.length}</span>} />
          <Stat
            label="บัญชีที่ถอดออก"
            value={<span className="font-mono text-muted-foreground">{removedLinks.length}</span>}
          />
          <Stat
            label="Token หมดอายุ"
            value={bm.tokenExpiresAt ? fmtTime(bm.tokenExpiresAt) : <span className="text-muted-foreground">ไม่หมดอายุ (System User)</span>}
          />
          <Stat label="เพิ่มเมื่อ" value={fmtTime(bm.createdAt)} />
        </CardContent>
      </Card>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">บัญชีในกลุ่ม ({activeLinks.length})</TabsTrigger>
          <TabsTrigger value="logs">ประวัติ Sync ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อบัญชี</TableHead>
                    <TableHead>Ad Account ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>พบครั้งแรก</TableHead>
                    <TableHead>เห็นล่าสุด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        ยังไม่มีบัญชีถูก discover
                      </TableCell>
                    </TableRow>
                  ) : (
                    links.map((l: any) => (
                      <TableRow key={l.id} className={l.status === "active" ? "" : "opacity-60"}>
                        <TableCell>
                          <span className={l.status === "active" ? "font-medium" : "line-through text-muted-foreground"}>
                            {l.nickname ?? <span className="text-muted-foreground">—</span>}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{l.metaAdAccountId ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={l.type === "owned" ? "default" : "secondary"}>
                            {l.type === "owned" ? "Owned" : "Client"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {l.status === "active" ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                              ใช้งาน
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                              ถูกถอดออก
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{fmtTime(l.discoveredAt)}</TableCell>
                        <TableCell className="text-xs">{fmtTime(l.lastSeenAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>เวลา</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead className="text-right">พบ</TableHead>
                    <TableHead className="text-right">เพิ่ม</TableHead>
                    <TableHead className="text-right">เชื่อมเดิม</TableHead>
                    <TableHead className="text-right">ถอด</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        ยังไม่มีประวัติ Sync
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((g: any) => (
                      <TableRow key={g.id}>
                        <TableCell>
                          <LogStatusIcon status={g.status} />
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{fmtTime(g.runAt)}</TableCell>
                        <TableCell className="text-xs">
                          {TRIGGER_LABEL[g.triggerSource] ?? g.triggerSource}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{g.foundCount ?? 0}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                          {g.addedCount ?? 0}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{g.linkedCount ?? 0}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                          {g.removedCount ?? 0}
                        </TableCell>
                        <TableCell className="text-xs text-destructive max-w-[280px] truncate" title={g.errorMessage ?? ""}>
                          {g.errorMessage ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}
