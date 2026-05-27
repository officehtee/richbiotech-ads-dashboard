import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Copy, ExternalLink, Link as LinkIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Scope = "all" | "group" | "account";

export default function ShareLinks() {
  const linksQuery = trpc.share.list.useQuery();
  const accountsQuery = trpc.accounts.list.useQuery();
  const groupsQuery = trpc.groups.list.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    label: string;
    scope: Scope;
    targetId: number | null;
    defaultPreset: string;
    expiresAt: string;
  }>({ label: "", scope: "all", targetId: null, defaultPreset: "7d", expiresAt: "" });

  const create = trpc.share.create.useMutation({
    onSuccess: async () => {
      toast.success("สร้างลิงก์แล้ว");
      await utils.share.list.invalidate();
      setOpen(false);
      setForm({ label: "", scope: "all", targetId: null, defaultPreset: "7d", expiresAt: "" });
    },
    onError: (e) => toast.error(e.message),
  });
  const toggle = trpc.share.toggle.useMutation({
    onSuccess: () => utils.share.list.invalidate(),
  });
  const remove = trpc.share.remove.useMutation({
    onSuccess: async () => {
      toast.success("ลบลิงก์แล้ว");
      await utils.share.list.invalidate();
    },
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Share Links</h1>
          <p className="text-sm text-muted-foreground mt-1">
            สร้างลิงก์ Read-only ส่งให้คนภายนอกดูแดชบอร์ด
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          สร้างลิงก์
        </Button>
      </header>

      {linksQuery.isLoading ? (
        <Card className="p-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></Card>
      ) : !linksQuery.data || linksQuery.data.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <LinkIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          ยังไม่มีลิงก์แชร์
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {linksQuery.data.map((l) => {
            const url = `${baseUrl}/share/${l.token}`;
            const filter = (() => {
              try { return JSON.parse(l.accountFilter); } catch { return { type: "all" }; }
            })();
            const scopeLabel =
              filter.type === "all" ? "ทุกบัญชี" :
              filter.type === "group" ? `กลุ่ม #${filter.groupId}` :
              `บัญชี #${filter.accountId}`;
            return (
              <Card key={l.id} className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold tracking-tight">{l.label ?? "Untitled"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {scopeLabel} • {l.defaultDateRange ?? "7d"}
                    </p>
                  </div>
                  <Switch
                    checked={l.isActive ?? true}
                    onCheckedChange={(v) => toggle.mutate({ id: l.id, isActive: v })}
                  />
                </div>
                <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2 mb-3">
                  <code className="text-xs font-mono flex-1 truncate">{url}</code>
                  <Button size="sm" variant="ghost" onClick={() => {
                    navigator.clipboard.writeText(url);
                    toast.success("คัดลอกแล้ว");
                  }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5" /></Button>
                  </a>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {l.expiresAt ? `หมดอายุ ${new Date(l.expiresAt).toLocaleDateString("th-TH")}` : "ไม่หมดอายุ"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive h-7"
                    onClick={() => {
                      if (confirm(`ลบลิงก์ ${l.label}?`)) remove.mutate({ id: l.id });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้างลิงก์แชร์</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>ป้ายกำกับ</Label>
              <Input
                placeholder="เช่น สำหรับลูกค้า A"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ขอบเขต</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as Scope, targetId: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกบัญชี</SelectItem>
                  <SelectItem value="group">กลุ่มเดียว</SelectItem>
                  <SelectItem value="account">บัญชีเดียว</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.scope === "group" && (
              <div className="space-y-1.5">
                <Label>เลือกกลุ่ม</Label>
                <Select value={form.targetId?.toString() ?? ""} onValueChange={(v) => setForm({ ...form, targetId: parseInt(v, 10) })}>
                  <SelectTrigger><SelectValue placeholder="เลือกกลุ่ม" /></SelectTrigger>
                  <SelectContent>
                    {(groupsQuery.data ?? []).map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.groupName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.scope === "account" && (
              <div className="space-y-1.5">
                <Label>เลือกบัญชี</Label>
                <Select value={form.targetId?.toString() ?? ""} onValueChange={(v) => setForm({ ...form, targetId: parseInt(v, 10) })}>
                  <SelectTrigger><SelectValue placeholder="เลือกบัญชี" /></SelectTrigger>
                  <SelectContent>
                    {(accountsQuery.data ?? []).map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.nickname ?? a.adAccountId}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>ช่วงเวลาเริ่มต้น</Label>
                <Select value={form.defaultPreset} onValueChange={(v) => setForm({ ...form, defaultPreset: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3d">3 วัน</SelectItem>
                    <SelectItem value="7d">7 วัน</SelectItem>
                    <SelectItem value="14d">14 วัน</SelectItem>
                    <SelectItem value="30d">30 วัน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>หมดอายุ (ถ้าระบุ)</Label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button
              disabled={create.isPending || !form.label}
              onClick={() => create.mutate({
                label: form.label,
                accountFilter: {
                  type: form.scope,
                  ...(form.scope === "group" && form.targetId ? { groupId: form.targetId } : {}),
                  ...(form.scope === "account" && form.targetId ? { accountId: form.targetId } : {}),
                },
                defaultDateRange: form.defaultPreset,
              })}
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              สร้าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
