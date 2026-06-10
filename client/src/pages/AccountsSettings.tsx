import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BMSection, TokenAgeCell } from "@/components/BMSection";
import { AutoSyncSection } from "@/components/AutoSyncSection";
import { SyncLogSection } from "@/components/SyncLogSection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Check,
  Clock,
  Copy,
  Loader2,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────
type Account = {
  id: number;
  adAccountId: string;
  nickname: string | null;
  pageName: string | null;
  phaseName: string | null;
  roasTarget: number;
  isActive: boolean;
  accessToken: string;
  tokenPreview?: string;
  bmId: number | null;
  ownerUserId: number | null;
  ownerNickname: string | null;
  groupId: number | null;
  groupName: string | null;
  paymentType: "card" | "prepaid" | null;
  limitAmount: number | null;
  effectiveStatus: "active" | "token_expired" | "blocked" | "revoked";
  statusSource: "single" | "bm";
  tokenExpiresAt?: Date | string | null;
};

const PAYMENT_LABEL: Record<string, string> = {
  card: "ผูกบัตร",
  prepaid: "เติมเงิน",
};

const STATUS_META: Record<
  Account["effectiveStatus"],
  { label: string; className: string }
> = {
  active: { label: "ใช้งานได้", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  token_expired: { label: "Token หมดอายุ", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  blocked: { label: "ถูกบล็อก", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  revoked: { label: "ถูกยกเลิก", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
};

const ALL = "__all__";
const NONE = "__none__";

export default function AccountsSettings() {
  const accountsQuery = trpc.accounts.list.useQuery();
  const ownersQuery = trpc.users.selectableOwners.useQuery();
  const groupsQuery = trpc.groups.list.useQuery();
  const utils = trpc.useUtils();

  const owners = ownersQuery.data ?? [];
  const groups = groupsQuery.data ?? [];

  // ── Add dialog ────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const emptyForm = {
    adAccountId: "",
    accessToken: "",
    groupId: "" as string,
    ownerUserId: "" as string,
    paymentType: "" as string,
    limitAmount: "" as string,
  };
  const [form, setForm] = useState(emptyForm);

  const create = trpc.accounts.create.useMutation({
    onSuccess: async () => {
      toast.success("เพิ่มบัญชีสำเร็จ");
      await utils.accounts.list.invalidate();
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Edit dialog ───────────────────────────────────────────────
  const [edit, setEdit] = useState<Account | null>(null);
  const [editToken, setEditToken] = useState("");

  const update = trpc.accounts.update.useMutation({
    onSuccess: async () => {
      toast.success("อัปเดตสำเร็จ");
      await utils.accounts.list.invalidate();
      setEdit(null);
      setEditToken("");
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.accounts.remove.useMutation({
    onSuccess: async () => {
      toast.success("ลบบัญชีสำเร็จ");
      await utils.accounts.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // ปุ่ม "เช็ก Token เดี๋ยวนี้" — เช็ก token บัญชีเดี่ยวทั้ง workspace กับ Meta ทันที
  const checkTokensNow = trpc.accounts.checkStandaloneTokensNow.useMutation({
    onSuccess: async (s) => {
      await utils.accounts.list.invalidate();
      if (s.checked === 0) {
        toast.info("ไม่มีบัญชีเดี่ยวที่ต้องเช็ก");
      } else {
        toast.success(
          `เช็กแล้ว ${s.checked} บัญชี — อัปเดตสถานะ ${s.changed}, คงเดิม ${s.skipped}` +
            (s.failed > 0 ? `, ผิดพลาด ${s.failed}` : ""),
        );
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // ปุ่ม "Sync BM เดี๋ยวนี้" — sync ทุก BM ของ workspace กับ Meta ทันที
  const syncBmNow = trpc.bm.syncAllNow.useMutation({
    onSuccess: async (s) => {
      // อัปเดตทั้งตาราง BM และตารางบัญชี (สถานะบัญชีย่อยคำนวณจาก BM)
      await Promise.all([
        utils.bm.list.invalidate(),
        utils.accounts.list.invalidate(),
      ]);
      if (s.bmTotal === 0) {
        toast.info("ยังไม่มี Business Manager ให้ซิงค์");
      } else {
        toast.success(
          `ซิงค์ BM แล้ว ${s.bmTotal} รายการ — บัญชีใหม่ ${s.newAccounts}, ถอด ${s.removedAccounts}` +
            (s.failed > 0 ? `, ล้มเหลว ${s.failed}` : ""),
        );
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Test Token state ──────────────────────────────────────────
  const [testOpen, setTestOpen] = useState(false);
  const [testFor, setTestFor] = useState<Account | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  const testToken = trpc.accounts.testToken.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      // Prompt F: รีเฟรชตารางให้คอลัมน์สถานะตรงกับผลทดสอบล่าสุด
      void utils.accounts.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Filters ───────────────────────────────────────────────────
  const [filterOwner, setFilterOwner] = useState<string>(ALL);
  const [filterGroup, setFilterGroup] = useState<string>(ALL);

  const allAccounts = (accountsQuery.data ?? []) as unknown as Account[];

  const filtered = useMemo(() => {
    return allAccounts.filter((a) => {
      if (filterOwner !== ALL) {
        if (filterOwner === NONE) {
          if (a.ownerUserId != null) return false;
        } else if (String(a.ownerUserId) !== filterOwner) {
          return false;
        }
      }
      if (filterGroup !== ALL) {
        if (filterGroup === NONE) {
          if (a.groupId != null) return false;
        } else if (String(a.groupId) !== filterGroup) {
          return false;
        }
      }
      return true;
    });
  }, [allAccounts, filterOwner, filterGroup]);

  // ── Summary: owner -> account count ───────────────────────────
  const summary = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const a of allAccounts) {
      const key = a.ownerUserId != null ? String(a.ownerUserId) : NONE;
      const label = a.ownerUserId != null ? (a.ownerNickname ?? `User #${a.ownerUserId}`) : "ยังไม่ระบุเจ้าของ";
      const cur = counts.get(key);
      if (cur) cur.count += 1;
      else counts.set(key, { label, count: 1 });
    }
    return Array.from(counts.values()).sort((x, y) => y.count - x.count);
  }, [allAccounts]);

  // inline update helper (payment / limit / active)
  const inlineUpdate = (id: number, patch: Record<string, unknown>) => {
    update.mutate({ id, ...patch } as any);
  };

  const copyToken = (token: string) => {
    if (!token) {
      toast.error("ไม่มี Token ให้คัดลอก");
      return;
    }
    navigator.clipboard.writeText(token);
    toast.success("คัดลอก Token แล้ว");
  };

  const openEdit = (a: Account) => {
    setEdit(a);
    setEditToken("");
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">จัดการบัญชีโฆษณา</h1>
          <p className="text-sm text-muted-foreground mt-1">
            จัดการบัญชีเดี่ยว, Business Manager, เจ้าของบัญชี, การชำระเงิน และ Limit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="bg-background"
            disabled={checkTokensNow.isPending}
            onClick={() => checkTokensNow.mutate()}
            title="ตรวจสอบว่า Token ของบัญชีเดี่ยว (Standalone) ทุกตัวยังใช้งานได้หรือไม่ และอัปเดตสถานะทันที"
          >
            {checkTokensNow.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            {checkTokensNow.isPending ? "กำลังตรวจสอบ..." : "ตรวจสอบ Token บัญชีเดี่ยว"}
          </Button>
          <Button
            variant="outline"
            className="bg-background"
            disabled={syncBmNow.isPending}
            onClick={() => syncBmNow.mutate()}
            title="ซิงค์บัญชีย่อยของทุก Business Manager กับ Meta ทันที (ไม่ต้องรอรอบอัตโนมัติ)"
          >
            {syncBmNow.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4 mr-1.5" />
            )}
            {syncBmNow.isPending ? "กำลังซิงค์ BM..." : "Sync BM เดี๋ยวนี้"}
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            เพิ่มบัญชี
          </Button>
        </div>
      </header>

      {/* Auto-sync (Heartbeat cron) */}
      <AutoSyncSection />

      {/* ประวัติการซิงค์ */}
      <SyncLogSection />

      {/* BM Auto-Discovery */}
      <BMSection owners={owners} groups={groups} />

      {/* ── ตารางสรุป: พนักงานคนไหนมีกี่บัญชี ── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">สรุปจำนวนบัญชีต่อเจ้าของ</h2>
        </div>
        {summary.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีบัญชี</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {summary.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5 text-sm"
              >
                <span className="font-medium">{s.label}</span>
                <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── ตัวกรอง ── */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">กรองตามเจ้าของ</Label>
          <Select value={filterOwner} onValueChange={setFilterOwner}>
            <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>เจ้าของทั้งหมด</SelectItem>
              <SelectItem value={NONE}>ยังไม่ระบุเจ้าของ</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>{o.nickname}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">กรองตามกลุ่มสินค้า</Label>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>กลุ่มทั้งหมด</SelectItem>
              <SelectItem value={NONE}>ไม่อยู่ในกลุ่ม</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>{g.groupName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(filterOwner !== ALL || filterGroup !== ALL) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => { setFilterOwner(ALL); setFilterGroup(ALL); }}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            ล้างตัวกรอง
          </Button>
        )}
        <div className="ml-auto text-sm text-muted-foreground self-end">
          แสดง {filtered.length} จาก {allAccounts.length} บัญชี
        </div>
      </div>

      {/* ── ตารางบัญชีย่อย (9 คอลัมน์) ── */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Ads Account ID</TableHead>
              <TableHead>เจ้าของ</TableHead>
              <TableHead>กลุ่มสินค้า</TableHead>
              <TableHead>การชำระเงิน</TableHead>
              <TableHead className="text-right">Limit (บาท)</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>อายุ Token</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accountsQuery.isLoading ? (
              <TableRow><TableCell colSpan={9} className="h-24 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <Building2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {allAccounts.length === 0 ? "ยังไม่มีบัญชีโฆษณา" : "ไม่มีบัญชีตรงกับตัวกรอง"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <AccountRow
                  key={a.id}
                  account={a}
                  onCopyToken={copyToken}
                  onInlineUpdate={inlineUpdate}
                  onEdit={() => openEdit(a)}
                  onTest={() => {
                    setTestFor(a);
                    setTestResult(null);
                    setTestOpen(true);
                    testToken.mutate({ id: a.id });
                  }}
                  onRemove={() => {
                    if (confirm(`ลบ ${a.nickname ?? a.adAccountId}?`)) remove.mutate({ id: a.id });
                  }}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Create dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มบัญชีโฆษณา</DialogTitle>
            <DialogDescription>
              Token จะถูกตรวจสอบกับ Meta API ก่อนบันทึก
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Ads Account ID *</Label>
              <Input
                placeholder="act_123456789012345"
                value={form.adAccountId}
                onChange={(e) => setForm({ ...form, adAccountId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Access Token *</Label>
              <Input
                type="password"
                placeholder="EAAxxxxxxxxxxx..."
                value={form.accessToken}
                onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>กลุ่มสินค้า</Label>
                <Select value={form.groupId || NONE} onValueChange={(v) => setForm({ ...form, groupId: v === NONE ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="เลือกกลุ่ม" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.groupName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>เจ้าของบัญชี</Label>
                <Select value={form.ownerUserId || NONE} onValueChange={(v) => setForm({ ...form, ownerUserId: v === NONE ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="เลือกเจ้าของ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
                    {owners.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.nickname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>การชำระเงิน</Label>
                <Select value={form.paymentType || NONE} onValueChange={(v) => setForm({ ...form, paymentType: v === NONE ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
                    <SelectItem value="card">ผูกบัตร</SelectItem>
                    <SelectItem value="prepaid">เติมเงิน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Limit (บาท/วัน)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="ไม่ระบุ"
                  value={form.limitAmount}
                  onChange={(e) => setForm({ ...form, limitAmount: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button
              disabled={create.isPending || !form.adAccountId || !form.accessToken}
              onClick={() => create.mutate({
                adAccountId: form.adAccountId.trim(),
                accessToken: form.accessToken.trim(),
                groupId: form.groupId ? Number(form.groupId) : null,
                ownerUserId: form.ownerUserId ? Number(form.ownerUserId) : null,
                paymentType: (form.paymentType || null) as "card" | "prepaid" | null,
                limitAmount: form.limitAmount ? Number(form.limitAmount) : null,
              })}
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Test Token dialog ── */}
      <Dialog open={testOpen} onOpenChange={(v) => { if (!v) { setTestOpen(false); setTestFor(null); setTestResult(null); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plug className="h-4 w-4" />
              ผลการทดสอบ Token
            </DialogTitle>
            <DialogDescription>
              {testFor ? <span className="font-mono">{testFor.adAccountId}</span> : null}
              {testFor?.nickname ? <span className="ml-2">• {testFor.nickname}</span> : null}
            </DialogDescription>
          </DialogHeader>
          {testToken.isPending || !testResult ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              กำลังเรียก Meta Graph API…
            </div>
          ) : (
            <TestResultPanel result={testResult} />
          )}
          <DialogFooter>
            {testFor && (
              <Button
                variant="outline"
                onClick={() => testToken.mutate({ id: testFor.id })}
                disabled={testToken.isPending}
              >
                {testToken.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                ทดสอบอีกครั้ง
              </Button>
            )}
            <Button onClick={() => { setTestOpen(false); setTestFor(null); setTestResult(null); }}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={edit !== null} onOpenChange={(v) => { if (!v) { setEdit(null); setEditToken(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขบัญชี</DialogTitle>
            <DialogDescription>
              {edit ? <span className="font-mono text-xs">{edit.adAccountId}</span> : null}
              {edit?.statusSource === "bm" ? (
                <span className="ml-2 text-xs">• บัญชีจาก Business Manager</span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nickname</Label>
                <Input value={edit.nickname ?? ""} onChange={(e) => setEdit({ ...edit, nickname: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>เจ้าของบัญชี</Label>
                  <Select
                    value={edit.ownerUserId != null ? String(edit.ownerUserId) : NONE}
                    onValueChange={(v) => setEdit({ ...edit, ownerUserId: v === NONE ? null : Number(v) })}
                  >
                    <SelectTrigger><SelectValue placeholder="เลือกเจ้าของ" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
                      {owners.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>{o.nickname}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>กลุ่มสินค้า</Label>
                  <Select
                    value={edit.groupId != null ? String(edit.groupId) : NONE}
                    onValueChange={(v) => setEdit({ ...edit, groupId: v === NONE ? null : Number(v) })}
                  >
                    <SelectTrigger><SelectValue placeholder="เลือกกลุ่ม" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.groupName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>การชำระเงิน</Label>
                  <Select
                    value={edit.paymentType ?? NONE}
                    onValueChange={(v) => setEdit({ ...edit, paymentType: v === NONE ? null : (v as "card" | "prepaid") })}
                  >
                    <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
                      <SelectItem value="card">ผูกบัตร</SelectItem>
                      <SelectItem value="prepaid">เติมเงิน</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Limit (บาท/วัน)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={edit.limitAmount ?? ""}
                    onChange={(e) => setEdit({ ...edit, limitAmount: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </div>
              </div>
              {edit.statusSource === "single" && (
                <div className="space-y-1.5">
                  <Label>Access Token (ใหม่ - ปล่อยว่างถ้าไม่เปลี่ยน)</Label>
                  <Input
                    type="password"
                    placeholder="ปล่อยว่างเพื่อคงค่าเดิม"
                    value={editToken}
                    onChange={(e) => setEditToken(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEdit(null); setEditToken(""); }}>ยกเลิก</Button>
            <Button
              disabled={update.isPending}
              onClick={() => {
                if (!edit) return;
                update.mutate({
                  id: edit.id,
                  nickname: edit.nickname,
                  ownerUserId: edit.ownerUserId,
                  groupId: edit.groupId,
                  paymentType: edit.paymentType,
                  limitAmount: edit.limitAmount,
                  ...(editToken.trim() ? { accessToken: editToken.trim() } : {}),
                });
              }}
            >
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// AccountRow — แถวบัญชี + inline edit (การชำระเงิน / Limit)
// ───────────────────────────────────────────────────────────────
function AccountRow({
  account: a,
  onCopyToken,
  onInlineUpdate,
  onEdit,
  onTest,
  onRemove,
}: {
  account: Account;
  onCopyToken: (t: string) => void;
  onInlineUpdate: (id: number, patch: Record<string, unknown>) => void;
  onEdit: () => void;
  onTest: () => void;
  onRemove: () => void;
}) {
  const isSingle = a.bmId == null;
  const status = STATUS_META[a.effectiveStatus] ?? STATUS_META.active;

  // inline limit editing
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState<string>(a.limitAmount != null ? String(a.limitAmount) : "");

  const saveLimit = () => {
    const val = limitDraft === "" ? null : Number(limitDraft);
    if (val !== a.limitAmount) onInlineUpdate(a.id, { limitAmount: val });
    setEditingLimit(false);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{a.nickname ?? "—"}</TableCell>
      <TableCell className="font-mono text-xs">{a.adAccountId}</TableCell>
      <TableCell>{a.ownerNickname ?? <span className="text-muted-foreground">—</span>}</TableCell>
      <TableCell>{a.groupName ?? <span className="text-muted-foreground">—</span>}</TableCell>

      {/* การชำระเงิน — dropdown inline */}
      <TableCell>
        <Select
          value={a.paymentType ?? NONE}
          onValueChange={(v) => onInlineUpdate(a.id, { paymentType: v === NONE ? null : v })}
        >
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            <SelectItem value="card">ผูกบัตร</SelectItem>
            <SelectItem value="prepaid">เติมเงิน</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      {/* Limit — inline edit */}
      <TableCell className="text-right">
        {editingLimit ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              type="number"
              min={0}
              autoFocus
              className="h-8 w-24 text-right text-xs"
              value={limitDraft}
              onChange={(e) => setLimitDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveLimit(); if (e.key === "Escape") setEditingLimit(false); }}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveLimit}><Check className="h-3.5 w-3.5" /></Button>
          </div>
        ) : (
          <button
            className="font-mono text-xs hover:bg-muted/50 rounded px-2 py-1 transition-colors"
            onClick={() => { setLimitDraft(a.limitAmount != null ? String(a.limitAmount) : ""); setEditingLimit(true); }}
            title="กดเพื่อแก้ไข"
          >
            {a.limitAmount != null ? a.limitAmount.toLocaleString("th-TH") : "—"}
          </button>
        )}
      </TableCell>

      {/* Token */}
      <TableCell>
        {isSingle ? (
          a.accessToken ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-muted-foreground">{a.tokenPreview || "••••"}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" title="คัดลอก Token เต็ม" onClick={() => onCopyToken(a.accessToken)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )
        ) : (
          <span className="text-muted-foreground text-xs" title="ใช้ Token ของ Business Manager">—</span>
        )}
      </TableCell>

      {/* อายุ Token */}
      <TableCell className="text-xs whitespace-nowrap">
        {isSingle ? (
          <TokenAgeCell expiresAt={a.tokenExpiresAt} />
        ) : (
          <span className="text-muted-foreground text-xs" title="อายุ Token จาก Business Manager">—</span>
        )}
      </TableCell>

      {/* สถานะ */}
      <TableCell>
        <Badge variant="outline" className={status.className}>{status.label}</Badge>
      </TableCell>

      {/* ปุ่ม */}
      <TableCell className="text-right whitespace-nowrap">
        {isSingle && (
          <Button size="sm" variant="ghost" title="ทดสอบ Token กับ Meta" onClick={onTest}>
            <Plug className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="sm" variant="ghost" title="แก้ไข" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive" title="ลบ" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ───────────────────────────────────────────────────────────────
// TestResultPanel
// ───────────────────────────────────────────────────────────────
type TestResultLike = {
  ok: boolean;
  category: string;
  title: string;
  message: string;
  suggestion: string;
  meId?: string;
  meName?: string;
  accountName?: string;
  accountStatus?: number;
  accountStatusLabel?: string;
  disableReason?: number;
  rawError?: {
    message: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
    error_user_title?: string;
    error_user_msg?: string;
  };
  httpStatus?: number;
  testedAt: number;
};

function TestResultPanel({ result }: { result: TestResultLike }) {
  const isOk = result.ok;
  const isWarn = !isOk && (result.category === "rate_limit" || result.category === "network_error");
  const Icon = isOk ? CheckCircle2 : isWarn ? AlertTriangle : AlertCircle;
  const tone = isOk
    ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
    : isWarn
      ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5"
      : "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/5";

  return (
    <div className="space-y-3">
      <div className={`flex items-start gap-3 p-3 rounded-lg border ${tone}`}>
        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{result.title}</div>
          <div className="text-sm mt-0.5 text-foreground/80 break-words">{result.message}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5">
        <div className="font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          คำแนะนำ
        </div>
        <div className="text-foreground/80 break-words">{result.suggestion}</div>
      </div>

      {(result.meName || result.accountName) && (
        <div className="rounded-lg border p-3 text-sm space-y-1">
          <div className="font-semibold mb-1">ข้อมูลจาก Meta</div>
          {result.meName && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">เจ้าของ Token</span>
              <span className="font-mono text-xs">{result.meName} ({result.meId})</span>
            </div>
          )}
          {result.accountName && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">ชื่อบัญชี</span>
              <span className="font-mono text-xs">{result.accountName}</span>
            </div>
          )}
          {result.accountStatusLabel && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">สถานะ</span>
              <span className="font-mono text-xs">{result.accountStatusLabel}</span>
            </div>
          )}
          {!!result.disableReason && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Disable reason code</span>
              <span className="font-mono text-xs">{result.disableReason}</span>
            </div>
          )}
        </div>
      )}

      {result.rawError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1.5">
          <div className="font-semibold text-destructive flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Raw error จาก Meta
          </div>
          {result.httpStatus !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">HTTP</span>
              <span className="font-mono">{result.httpStatus}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">code</span>
            <span className="font-mono">{result.rawError.code ?? "-"}{result.rawError.error_subcode ? `.${result.rawError.error_subcode}` : ""}</span>
          </div>
          {result.rawError.type && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">type</span>
              <span className="font-mono">{result.rawError.type}</span>
            </div>
          )}
          <div className="text-foreground/80 break-words pt-1">{result.rawError.message}</div>
          {result.rawError.fbtrace_id && (
            <div className="flex items-center justify-between gap-2 pt-1 border-t mt-1">
              <span className="text-muted-foreground">fbtrace_id</span>
              <button
                className="font-mono text-xs hover:bg-muted/50 px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(result.rawError!.fbtrace_id!);
                  toast.success("คัดลอก fbtrace_id แล้ว");
                }}
                title="คัดลอก"
              >
                {result.rawError.fbtrace_id}
                <Copy className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        ทดสอบเมื่อ {new Date(result.testedAt).toLocaleString("th-TH")}
      </div>
    </div>
  );
}
