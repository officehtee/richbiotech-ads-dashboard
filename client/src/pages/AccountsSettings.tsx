import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">จัดการบัญชีโฆษณา</h1>
          <p className="text-sm text-muted-foreground mt-1">
            เพิ่ม/แก้ไข Ad Account, Token, Page Name, Phase Name, ROAS Target
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          เพิ่มบัญชี
        </Button>
      </header>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Account ID</TableHead>
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
                  <TableCell className="text-right">
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
              <Label>Ad Account ID *</Label>
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
