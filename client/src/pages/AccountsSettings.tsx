import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BMSection } from "@/components/BMSection";
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
  Clock,
  Copy,
  Loader2,
  Pencil,
  Plug,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Account = {
  id: number;
  adAccountId: string;
  nickname: string | null;
  pageName: string | null;
  phaseName: string | null;
  roasTarget: number;
  isActive: boolean;
  accessToken: string;
  accountName?: string | null;
};

export default function AccountsSettings() {
  const accountsQuery = trpc.accounts.list.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Account | null>(null);

  const [form, setForm] = useState({
    adAccountId: "",
    accessToken: "",
    nickname: "",
    pageName: "",
    phaseName: "",
    roasTarget: 2.0,
  });

  const create = trpc.accounts.create.useMutation({
    onSuccess: async () => {
      toast.success("เพิ่มบัญชีสำเร็จ");
      await utils.accounts.list.invalidate();
      setOpen(false);
      setForm({ adAccountId: "", accessToken: "", nickname: "", pageName: "", phaseName: "", roasTarget: 2.0 });
    },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.accounts.update.useMutation({
    onSuccess: async () => {
      toast.success("อัปเดตสำเร็จ");
      await utils.accounts.list.invalidate();
      setEdit(null);
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

  // ── Test Token state ─────────────────────────────────────────
  type TestResult = NonNullable<typeof testToken.data>;
  const [testOpen, setTestOpen] = useState(false);
  const [testFor, setTestFor] = useState<Account | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const testToken = trpc.accounts.testToken.useMutation({
    onSuccess: (data) => {
      setTestResult(data as TestResult);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">จัดการบัญชีโฆษณา</h1>
          <p className="text-sm text-muted-foreground mt-1">
            เพิ่ม/แก้ไข Ads Account, Token, Page Name, Phase Name, ROAS Target
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          เพิ่มบัญชี
        </Button>
      </header>

      {/* Round 7.23 — BM Auto-Discovery */}
      <BMSection />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ads Account ID</TableHead>
              <TableHead>Nickname</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead className="text-right">ROAS Target</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accountsQuery.isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
            ) : !accountsQuery.data || accountsQuery.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Building2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">ยังไม่มีบัญชีโฆษณา</p>
                </TableCell>
              </TableRow>
            ) : (
              accountsQuery.data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.adAccountId}</TableCell>
                  <TableCell>{a.nickname ?? "—"}</TableCell>
                  <TableCell>{a.pageName ?? "—"}</TableCell>
                  <TableCell>
                    {a.phaseName ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-secondary">{a.phaseName}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{a.roasTarget?.toFixed(1)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={a.isActive ?? true}
                      onCheckedChange={(v) => update.mutate({ id: a.id, isActive: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="ทดสอบ Token กับ Meta"
                      onClick={() => {
                        setTestFor(a as Account);
                        setTestResult(null);
                        setTestOpen(true);
                        testToken.mutate({ id: a.id });
                      }}
                    >
                      <Plug className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEdit(a as Account)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                      if (confirm(`ลบ ${a.nickname ?? a.adAccountId}?`)) remove.mutate({ id: a.id });
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มบัญชีโฆษณา</DialogTitle>
            <DialogDescription>
              Token จะถูกตรวจสอบกับ Meta API ก่อนบันทึก — ดูวิธีรับ Token ได้จากเอกสาร
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
                <Label>Nickname</Label>
                <Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Page Name</Label>
                <Input value={form.pageName} onChange={(e) => setForm({ ...form, pageName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phase Name</Label>
                <Input placeholder="A / B / C" value={form.phaseName} onChange={(e) => setForm({ ...form, phaseName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>ROAS Target</Label>
                <Input type="number" step="0.1" value={form.roasTarget} onChange={(e) => setForm({ ...form, roasTarget: parseFloat(e.target.value) || 2 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button
              disabled={create.isPending || !form.adAccountId || !form.accessToken}
              onClick={() => create.mutate({
                adAccountId: form.adAccountId,
                accessToken: form.accessToken,
                nickname: form.nickname || undefined,
                pageName: form.pageName || undefined,
                phaseName: form.phaseName || undefined,
                roasTarget: form.roasTarget,
              })}
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Token dialog */}
      <Dialog open={testOpen} onOpenChange={(v) => { if (!v) { setTestOpen(false); setTestFor(null); setTestResult(null); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plug className="h-4 w-4" />
              ผลการทดสอบ Token
            </DialogTitle>
            <DialogDescription>
              {testFor ? (
                <span className="font-mono">{testFor.adAccountId}</span>
              ) : null}
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

      {/* Edit dialog */}
      <Dialog open={edit !== null} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขบัญชี</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nickname</Label>
                <Input value={edit.nickname ?? ""} onChange={(e) => setEdit({ ...edit, nickname: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Page Name</Label>
                <Input value={edit.pageName ?? ""} onChange={(e) => setEdit({ ...edit, pageName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phase Name</Label>
                <Input value={edit.phaseName ?? ""} onChange={(e) => setEdit({ ...edit, phaseName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>ROAS Target</Label>
                <Input type="number" step="0.1" value={edit.roasTarget} onChange={(e) => setEdit({ ...edit, roasTarget: parseFloat(e.target.value) || 2 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Access Token (ใหม่ - ปล่อยว่างถ้าไม่เปลี่ยน)</Label>
                <Input type="password" placeholder="ปล่อยว่างเพื่อคงค่าเดิม" onChange={(e) => setEdit({ ...edit, accessToken: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>ยกเลิก</Button>
            <Button
              disabled={update.isPending}
              onClick={() => {
                if (!edit) return;
                update.mutate({
                  id: edit.id,
                  nickname: edit.nickname,
                  pageName: edit.pageName,
                  phaseName: edit.phaseName,
                  roasTarget: edit.roasTarget,
                  ...(edit.accessToken && edit.accessToken !== "***" ? { accessToken: edit.accessToken } : {}),
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

// ── TestResultPanel ──────────────────────────────────────────
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
