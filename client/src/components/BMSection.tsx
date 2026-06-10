/**
 * BMSection — Round 7.23 Phase 2
 *
 * Components:
 *   • BMWizardDialog  : 3-step wizard (BM ID + Token + Group → Discover → Confirm)
 *   • BMListTable     : list of saved BMs with Sync / Delete
 *   • BMSection       : composite (header + table + wizard launcher)
 *
 * Backend procedures used:
 *   trpc.bm.list / bm.testConnection / bm.discover / bm.create / bm.sync / bm.delete
 *   trpc.groups.list (สำหรับเลือก accountGroup ใน Step 1)
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Pencil,
  PlugZap,
  Plus,
  RefreshCcw,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export type OwnerOption = { id: number; nickname: string; role: string };
export type GroupOption = { id: number; groupName: string };

const BM_NONE = "__none__";

type DiscoveredAccount = {
  bmAdAccountId: string;
  name: string;
  accountStatus: number;
  accountStatusLabel: string;
  ownership: "owned" | "client";
  currency?: string;
  timezone?: string;
};

type TestResult = {
  ok: boolean;
  category: string;
  title: string;
  message: string;
  suggestion: string;
  bmId?: string;
  bmName?: string;
  meId?: string;
  meName?: string;
  httpStatus?: number;
};

type DiscoverResult = {
  ok: boolean;
  category: string;
  title: string;
  message: string;
  suggestion: string;
  bmId?: string;
  bmName?: string;
  ownedAccounts: DiscoveredAccount[];
  clientAccounts: DiscoveredAccount[];
  totalCount: number;
};

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

// ─────────────────────────────────────────────────────────────────
// TokenAgeCell — shared by BM table and standalone table
// ─────────────────────────────────────────────────────────────────
export function TokenAgeCell({ expiresAt }: { expiresAt: Date | string | null | undefined }) {
  if (expiresAt === null) {
    return <span className="text-xs text-muted-foreground">ไม่หมดอายุ</span>;
  }
  if (!expiresAt) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const ts = expiresAt instanceof Date ? expiresAt.getTime() : Date.parse(expiresAt as string);
  if (!Number.isFinite(ts)) return <span className="text-xs text-muted-foreground">—</span>;
  const now = Date.now();
  const diffMs = ts - now;
  const diffDays = Math.floor(diffMs / 86_400_000);
  const dateStr = new Date(ts).toLocaleDateString("th-TH", { dateStyle: "short" });
  if (diffMs < 0) {
    // expired
    return (
      <span className="text-xs font-medium text-red-500" title={`หมดอายุ: ${dateStr}`}>
        หมดอายุแล้ว
      </span>
    );
  }
  if (diffDays <= 7) {
    return (
      <span className="text-xs font-medium text-amber-500" title={`หมดอายุ: ${dateStr}`}>
        {diffDays === 0 ? "วันนี้" : `อีก ${diffDays} วัน`}
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground" title={`หมดอายุ: ${dateStr}`}>
      {dateStr}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// Wizard Dialog
// ─────────────────────────────────────────────────────────────────

export function BMWizardDialog({
  open,
  onOpenChange,
  owners,
  groups,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  owners: OwnerOption[];
  groups: GroupOption[];
}) {
  const utils = trpc.useUtils();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bmId, setBmId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [accountGroupId, setAccountGroupId] = useState<string>("");
  const [ownerUserId, setOwnerUserId] = useState<string>("");
  const [name, setName] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [discoverResult, setDiscoverResult] = useState<DiscoverResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // reset state when dialog closed
  useEffect(() => {
    if (!open) {
      setStep(1);
      setBmId("");
      setAccessToken("");
      setAccountGroupId("");
      setOwnerUserId("");
      setName("");
      setTestResult(null);
      setDiscoverResult(null);
      setSelected(new Set());
    }
  }, [open]);

  // mutations
  const testMutation = trpc.bm.testConnection.useMutation({
    onSuccess: (data) => {
      setTestResult(data as TestResult);
      if (data?.ok && data.bmName && !name) setName(data.bmName);
    },
    onError: (e) => toast.error(e.message),
  });

  const discoverMutation = trpc.bm.discover.useMutation({
    onSuccess: (data) => {
      setDiscoverResult(data as DiscoverResult);
      // pre-select all OWNED active accounts
      const next = new Set<string>();
      for (const a of (data?.ownedAccounts ?? [])) {
        if (a.accountStatus === 1) next.add(a.bmAdAccountId);
      }
      setSelected(next);
      setStep(2);
    },
    onError: (e) => toast.error(e.message),
  });

  const createMutation = trpc.bm.create.useMutation({
    onSuccess: async (data) => {
      toast.success(
        `เพิ่ม BM สำเร็จ — สร้างบัญชีใหม่ ${data.createdAccounts} • เชื่อมที่มีอยู่ ${data.linkedExisting}`,
      );
      await utils.bm.list.invalidate();
      await utils.accounts.list.invalidate();
      await utils.groups.list.invalidate();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const allDiscovered = useMemo(() => {
    if (!discoverResult) return [];
    return [...discoverResult.ownedAccounts, ...discoverResult.clientAccounts];
  }, [discoverResult]);

  const toggleAll = (on: boolean) => {
    if (!discoverResult) return;
    if (!on) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(allDiscovered.map((a) => a.bmAdAccountId)));
  };
  const toggleOne = (bmAdAccountId: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(bmAdAccountId)) n.delete(bmAdAccountId);
      else n.add(bmAdAccountId);
      return n;
    });
  };

  const canTest = bmId.trim().length >= 6 && accessToken.trim().length >= 20 && !!accountGroupId;
  const canDiscover = canTest && testResult?.ok === true;

  // Step 1 → 2 by clicking Discover
  const handleDiscover = () => {
    if (!canDiscover) return;
    discoverMutation.mutate({ bmId: bmId.trim(), accessToken: accessToken.trim() });
  };

  // Step 2 → 3
  const handleNext = () => {
    if (selected.size === 0) {
      toast.error("เลือกอย่างน้อย 1 บัญชีก่อน");
      return;
    }
    setStep(3);
  };

  // Step 3 → submit
  const handleSubmit = () => {
    if (!discoverResult || !accountGroupId) return;
    const items = allDiscovered
      .filter((a) => selected.has(a.bmAdAccountId))
      .map((a) => ({
        bmAdAccountId: a.bmAdAccountId,
        name: a.name,
        ownership: a.ownership,
        accountStatus: a.accountStatus,
        currency: a.currency,
        timezone: a.timezone,
      }));
    createMutation.mutate({
      bmId: bmId.trim(),
      name: name.trim() || (discoverResult.bmName ?? `BM ${bmId.trim()}`),
      accessToken: accessToken.trim(),
      accountGroupId: parseInt(accountGroupId, 10),
      ownerUserId: ownerUserId ? parseInt(ownerUserId, 10) : null,
      selectedAccounts: items,
    });
  };

  const groupName =
    groups.find((g) => String(g.id) === accountGroupId)?.groupName ?? "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            เชื่อม Business Manager (Auto-Discovery)
          </DialogTitle>
          <DialogDescription>
            ขั้น {step}/3 — {step === 1 ? "ใส่ BM ID + Token + เลือกกลุ่มสินค้า" : step === 2 ? "เลือกบัญชีโฆษณาที่ต้องการดึงเข้าระบบ" : "ยืนยันการบันทึก"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>BM ID *</Label>
                <Input
                  placeholder="ตัวเลข 6+ หลัก เช่น 1234567890"
                  value={bmId}
                  onChange={(e) => setBmId(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                />
                <p className="text-[11px] text-muted-foreground">
                  หาได้จาก Business Settings → Business Info ใน Meta Business Suite
                </p>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>System User Access Token *</Label>
                <Input
                  type="password"
                  placeholder="EAAxxxxxxxxxxx..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  ใช้ System User ของ BM แนะนำตั้ง Permission แบบ <strong>read-only (ads_read)</strong>
                </p>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>กลุ่มสินค้า * (1 BM = 1 กลุ่มสินค้า)</Label>
                <Select value={accountGroupId} onValueChange={setAccountGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกกลุ่มสินค้า" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        ยังไม่มีกลุ่มสินค้า — สร้างที่หน้า /groups ก่อน
                      </div>
                    ) : (
                      groups.map((g: any) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.groupName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  ทุกบัญชีที่เลือกจะถูก auto-assign เข้ากลุ่มนี้
                </p>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>เจ้าของบัญชี (default ของทุกบัญชีย่อยใน BM นี้)</Label>
                <Select value={ownerUserId || BM_NONE} onValueChange={(v) => setOwnerUserId(v === BM_NONE ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกเจ้าของ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BM_NONE}>ไม่ระบุ</SelectItem>
                    {owners.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.nickname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  เจ้าของนี้จะถูกใส่ให้บัญชีใหม่ที่ค้นพบในรอบ sync ถัดไปด้วย (ตั้งทีหลังได้ในป๊อปแก้ไข BM)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={!canTest || testMutation.isPending}
                onClick={() =>
                  testMutation.mutate({ bmId: bmId.trim(), accessToken: accessToken.trim() })
                }
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <PlugZap className="h-4 w-4 mr-1.5" />
                )}
                Test Connection
              </Button>
              {testResult && <ConnectionResultBanner result={testResult} />}
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && discoverResult && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm flex items-start gap-3">
              <Building2 className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  พบบัญชีโฆษณา {discoverResult.totalCount} บัญชี
                  {discoverResult.bmName ? ` ใน BM "${discoverResult.bmName}"` : ""}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Owned {discoverResult.ownedAccounts.length} • Client {discoverResult.clientAccounts.length}
                </div>
              </div>
              <div className="text-xs text-right">
                <div className="text-muted-foreground">เลือกแล้ว</div>
                <div className="font-mono font-semibold">{selected.size}/{allDiscovered.length}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Button size="sm" variant="ghost" onClick={() => toggleAll(true)}>เลือกทั้งหมด</Button>
              <Button size="sm" variant="ghost" onClick={() => toggleAll(false)}>ยกเลิก</Button>
              <span className="text-muted-foreground ml-auto">
                Active เท่านั้นถูกเลือกอัตโนมัติเริ่มต้น
              </span>
            </div>

            <div className="rounded-lg border max-h-[360px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>ชื่อบัญชี</TableHead>
                    <TableHead>Ad Account ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDiscovered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">ไม่พบบัญชีใน BM นี้</TableCell></TableRow>
                  ) : (
                    allDiscovered.map((a) => (
                      <TableRow key={a.bmAdAccountId}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(a.bmAdAccountId)}
                            onCheckedChange={() => toggleOne(a.bmAdAccountId)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="font-mono text-xs">{a.bmAdAccountId}</TableCell>
                        <TableCell>
                          <Badge variant={a.ownership === "owned" ? "default" : "secondary"}>
                            {a.ownership === "owned" ? "Owned" : "Client"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className={a.accountStatus === 1 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                            {a.accountStatusLabel}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && discoverResult && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border p-3 space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ยืนยันการบันทึก
              </div>
              <SummaryRow label="ชื่อ BM" value={
                <Input
                  className="h-8 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={discoverResult.bmName ?? `BM ${bmId}`}
                />
              } />
              <SummaryRow label="BM ID" value={<span className="font-mono text-xs">{bmId}</span>} />
              <SummaryRow label="กลุ่มสินค้า" value={<span>{groupName}</span>} />
              <SummaryRow label="เจ้าของ default" value={<span>{owners.find((o) => String(o.id) === ownerUserId)?.nickname ?? "ไม่ระบุ"}</span>} />
              <SummaryRow label="บัญชีที่จะนำเข้า" value={<span className="font-mono">{selected.size} บัญชี</span>} />
            </div>

            <div className="rounded-lg border p-2 max-h-[260px] overflow-y-auto text-xs">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>Ad Account ID</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDiscovered
                    .filter((a) => selected.has(a.bmAdAccountId))
                    .map((a) => (
                      <TableRow key={a.bmAdAccountId}>
                        <TableCell className="py-1.5">{a.name}</TableCell>
                        <TableCell className="py-1.5 font-mono">{a.bmAdAccountId}</TableCell>
                        <TableCell className="py-1.5">{a.ownership}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 rounded bg-muted/30 border">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Token จะถูก <strong>เข้ารหัส AES-256-GCM</strong> ก่อนบันทึก —
                ใช้สำหรับ pull insight แบบ <strong>read-only</strong> เท่านั้น (ไม่มี ads_management)
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 1 && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
              <Button onClick={handleDiscover} disabled={!canDiscover || discoverMutation.isPending}>
                {discoverMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : null}
                ค้นหาบัญชีในระบบ
                <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                ย้อนกลับ
              </Button>
              <Button onClick={handleNext} disabled={selected.size === 0}>
                ถัดไป
                <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="ghost" onClick={() => setStep(2)} disabled={createMutation.isPending}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                ย้อนกลับ
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                )}
                บันทึกและเริ่มใช้งาน
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div>{value}</div>
    </div>
  );
}

function ConnectionResultBanner({ result }: { result: TestResult }) {
  const ok = result.ok;
  const Icon = ok ? CheckCircle2 : AlertCircle;
  const tone = ok
    ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
    : "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/5";
  return (
    <div className={`text-xs rounded border px-2 py-1 flex items-center gap-1.5 ${tone}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate max-w-[420px]" title={result.message}>
        {result.title}
        {result.bmName ? ` • ${result.bmName}` : ""}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BM List Section
// ─────────────────────────────────────────────────────────────────

export function BMSection({ owners, groups }: { owners: OwnerOption[]; groups: GroupOption[] }) {
  const utils = trpc.useUtils();
  const bmListQuery = trpc.bm.list.useQuery();
  const [, navigate] = useLocation();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editBm, setEditBm] = useState<any | null>(null);

  const groupName = (id: number) =>
    groups.find((g) => g.id === id)?.groupName ?? `#${id}`;

  // Prompt E: ชื่อเจ้าของ default ของ BM (จาก defaultOwnerUserId)
  const ownerName = (id: number | null | undefined) =>
    id == null ? "—" : owners.find((o) => o.id === id)?.nickname ?? `#${id}`;

  const syncMutation = trpc.bm.sync.useMutation({
    onSuccess: async (data: any) => {
      if (data?.ok === false && data?.error) {
        toast.error(`Sync ไม่สำเร็จ: ${data.error.title ?? "ไม่ทราบสาเหตุ"}`);
      } else {
        toast.success(
          `Sync สำเร็จ — ใหม่ ${data.newCount} • มีอยู่ ${data.existingCount} • ถอด ${data.removedCount}`,
        );
      }
      await utils.bm.list.invalidate();
      await utils.accounts.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.bm.delete.useMutation({
    onSuccess: async () => {
      toast.success("ลบ BM สำเร็จ");
      await utils.bm.list.invalidate();
      setConfirmDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const bms = bmListQuery.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Business Manager (BM Auto-Discovery)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            เชื่อม BM ครั้งเดียว ระบบจะค้นบัญชีและ sync ให้อัตโนมัติ — 1 BM = 1 กลุ่มสินค้า
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          เชื่อม BM ใหม่
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ BM</TableHead>
                <TableHead>BM ID</TableHead>
                <TableHead>เจ้าของ</TableHead>
                <TableHead>กลุ่มสินค้า</TableHead>
                <TableHead className="text-right">บัญชี (active/ถอด)</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>อายุ Token</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>Sync ล่าสุด</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bmListQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-20 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : bms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    <Building2 className="h-7 w-7 mx-auto text-muted-foreground/50 mb-1.5" />
                    <p className="text-sm text-muted-foreground">ยังไม่มี BM ที่เชื่อมไว้</p>
                  </TableCell>
                </TableRow>
              ) : (
                bms.map((bm: any) => (
                  <TableRow
                    key={bm.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate(`/accounts/bm/${bm.id}`)}
                  >
                    <TableCell className="font-medium">{bm.name}</TableCell>
                    <TableCell className="font-mono text-xs">{bm.bmId}</TableCell>
                    <TableCell>{ownerName(bm.defaultOwnerUserId)}</TableCell>
                    <TableCell>{groupName(bm.accountGroupId)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {bm.accountCount}
                      {bm.removedCount > 0 ? (
                        <span className="text-muted-foreground"> / {bm.removedCount}</span>
                      ) : null}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <BmTokenCell bmId={bm.id} preview={bm.tokenPreview} />
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <TokenAgeCell expiresAt={bm.tokenExpiresAt} />
                    </TableCell>
                    <TableCell>
                      <StatusPill status={bm.status} />
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {fmtTime(bm.lastSyncAt)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Sync เดี๋ยวนี้"
                        onClick={() => syncMutation.mutate({ id: bm.id })}
                        disabled={syncMutation.isPending}
                      >
                        {syncMutation.isPending && (syncMutation.variables as any)?.id === bm.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCcw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="แก้ไข BM"
                        onClick={() => setEditBm(bm)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        title="ลบ BM"
                        onClick={() => setConfirmDeleteId(bm.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <BMWizardDialog open={wizardOpen} onOpenChange={setWizardOpen} owners={owners} groups={groups} />

      <BMEditDialog
        bm={editBm}
        owners={owners}
        groups={groups}
        onClose={() => setEditBm(null)}
      />

      {/* Delete confirmation */}
      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(v) => !v && setConfirmDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบ Business Manager?</DialogTitle>
            <DialogDescription>
              บัญชีโฆษณาที่ถูก discover จาก BM นี้จะ <strong>ยังคงอยู่ในระบบ</strong>
              {" "}แต่ link ระหว่าง BM ↔ บัญชีจะถูกลบ และ token จะถูกลบด้วย
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>ยกเลิก</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() =>
                confirmDeleteId !== null && deleteMutation.mutate({ id: confirmDeleteId })
              }
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              )}
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// BmTokenCell — แสดง token ย่อ + ปุ่ม Copy (ดึง token เต็มผ่าน bm.getToken ตอนกด)
// ─────────────────────────────────────────────────────────────────
function BmTokenCell({ bmId, preview }: { bmId: number; preview: string }) {
  const getToken = trpc.bm.getToken.useMutation({
    onSuccess: (data) => {
      navigator.clipboard.writeText(data.token);
      toast.success("คัดลอก Token เต็มแล้ว");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs text-muted-foreground">{preview || "•••••"}</span>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        title="คัดลอก Token เต็ม"
        disabled={getToken.isPending}
        onClick={() => getToken.mutate({ id: bmId })}
      >
        {getToken.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BMEditDialog — ป๊อปแก้ไข BM (ชื่อ / Token / กลุ่มสินค้า / เจ้าของ default)
// ─────────────────────────────────────────────────────────────────
function BMEditDialog({
  bm,
  owners,
  groups,
  onClose,
}: {
  bm: any | null;
  owners: OwnerOption[];
  groups: GroupOption[];
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [newToken, setNewToken] = useState("");

  useEffect(() => {
    if (bm) {
      setName(bm.name ?? "");
      setGroupId(bm.accountGroupId != null ? String(bm.accountGroupId) : "");
      setOwnerId(bm.defaultOwnerUserId != null ? String(bm.defaultOwnerUserId) : "");
      setNewToken("");
    }
  }, [bm]);

  const update = trpc.bm.update.useMutation({
    onSuccess: async () => {
      toast.success("อัปเดต BM สำเร็จ");
      await utils.bm.list.invalidate();
      await utils.accounts.list.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={bm !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            แก้ไข Business Manager
          </DialogTitle>
          <DialogDescription>
            {bm ? <span className="font-mono text-xs">BM ID: {bm.bmId}</span> : null}
          </DialogDescription>
        </DialogHeader>
        {bm && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>ชื่อ BM</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>กลุ่มสินค้า</Label>
                <Select value={groupId || BM_NONE} onValueChange={(v) => setGroupId(v === BM_NONE ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกกลุ่ม" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BM_NONE}>ไม่ระบุ</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.groupName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>เจ้าของ default</Label>
                <Select value={ownerId || BM_NONE} onValueChange={(v) => setOwnerId(v === BM_NONE ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกเจ้าของ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BM_NONE}>ไม่ระบุ</SelectItem>
                    {owners.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.nickname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>System User Token ใหม่ (ปล่อยว่างถ้าไม่เปลี่ยน)</Label>
              <Input
                type="password"
                placeholder="ปล่อยว่างเพื่อคงค่าเดิม"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                ใช้เมื่อ Token หมดอายุ — เปลี่ยนใหม่โดยไม่ต้องลบ BM (จะถูกเข้ารหัสก่อนบันทึก)
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button
            disabled={update.isPending}
            onClick={() => {
              if (!bm) return;
              if (newToken.trim() && newToken.trim().length < 20) {
                toast.error("Token ใหม่สั้นเกินไป");
                return;
              }
              update.mutate({
                id: bm.id,
                name: name.trim() || undefined,
                accountGroupId: groupId ? Number(groupId) : undefined,
                defaultOwnerUserId: ownerId ? Number(ownerId) : null,
                ...(newToken.trim() ? { accessToken: newToken.trim() } : {}),
              });
            }}
          >
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
