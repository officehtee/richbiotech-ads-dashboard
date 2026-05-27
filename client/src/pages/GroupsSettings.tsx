import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Folder, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type GroupForm = {
  groupName: string;
  color: string;
  roasTarget: number;
  roasThreshold: number;
  ctrThreshold: number;
  memberAccountIds: number[];
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6"];

export default function GroupsSettings() {
  const groupsQuery = trpc.groups.list.useQuery();
  const accountsQuery = trpc.accounts.list.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<GroupForm>({
    groupName: "",
    color: COLORS[0],
    roasTarget: 2.0,
    roasThreshold: 1.5,
    ctrThreshold: 1.0,
    memberAccountIds: [],
  });

  const create = trpc.groups.create.useMutation({
    onSuccess: async () => {
      toast.success("เพิ่มกลุ่มสำเร็จ");
      await utils.groups.list.invalidate();
      reset();
    },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.groups.update.useMutation({
    onSuccess: async () => {
      toast.success("อัปเดตสำเร็จ");
      await utils.groups.list.invalidate();
      reset();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.groups.remove.useMutation({
    onSuccess: async () => {
      toast.success("ลบสำเร็จ");
      await utils.groups.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const reset = () => {
    setOpen(false);
    setEditId(null);
    setForm({ groupName: "", color: COLORS[0], roasTarget: 2.0, roasThreshold: 1.5, ctrThreshold: 1.0, memberAccountIds: [] });
  };

  const submit = () => {
    if (!form.groupName.trim()) return;
    if (editId !== null) {
      update.mutate({ id: editId, ...form });
    } else {
      create.mutate(form);
    }
  };

  const startEdit = (g: any) => {
    setEditId(g.id);
    setForm({
      groupName: g.groupName,
      color: g.color ?? COLORS[0],
      roasTarget: g.roasTarget ?? 2,
      roasThreshold: g.roasThreshold ?? 1.5,
      ctrThreshold: g.ctrThreshold ?? 1,
      memberAccountIds: g.memberAccountIds ?? [],
    });
    setOpen(true);
  };

  const toggleAccount = (id: number) => {
    setForm((f) =>
      f.memberAccountIds.includes(id)
        ? { ...f, memberAccountIds: f.memberAccountIds.filter((x) => x !== id) }
        : { ...f, memberAccountIds: [...f.memberAccountIds, id] },
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">กลุ่มสินค้า</h1>
          <p className="text-sm text-muted-foreground mt-1">
            จัดกลุ่มบัญชีโฆษณา + กำหนด ROAS Target & Smart Scaling Threshold
          </p>
        </div>
        <Button onClick={() => { reset(); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" />
          เพิ่มกลุ่ม
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupsQuery.isLoading ? (
          <Card className="p-12 text-center text-muted-foreground col-span-full">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </Card>
        ) : !groupsQuery.data || groupsQuery.data.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground col-span-full">
            <Folder className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            ยังไม่มีกลุ่มสินค้า
          </Card>
        ) : (
          groupsQuery.data.map((g) => (
            <Card key={g.id} className="p-5 border-l-4" style={{ borderLeftColor: g.color ?? "#3b82f6" }}>
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold tracking-tight">{g.groupName}</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(g)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                    if (confirm(`ลบกลุ่ม ${g.groupName}?`)) remove.mutate({ id: g.id });
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {g.memberAccountIds.length} บัญชี • เป้า ROAS {g.roasTarget?.toFixed(1)} • Threshold {g.roasThreshold?.toFixed(1)} / CTR {g.ctrThreshold?.toFixed(1)}%
              </p>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "แก้ไขกลุ่ม" : "เพิ่มกลุ่ม"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>ชื่อกลุ่ม *</Label>
              <Input value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>สี</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-7 w-7 rounded-md transition-transform ${form.color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">ROAS Target</Label>
                <Input type="number" step="0.1" value={form.roasTarget} onChange={(e) => setForm({ ...form, roasTarget: parseFloat(e.target.value) || 2 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ROAS Threshold</Label>
                <Input type="number" step="0.1" value={form.roasThreshold} onChange={(e) => setForm({ ...form, roasThreshold: parseFloat(e.target.value) || 1.5 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CTR Threshold (%)</Label>
                <Input type="number" step="0.1" value={form.ctrThreshold} onChange={(e) => setForm({ ...form, ctrThreshold: parseFloat(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>บัญชีในกลุ่มนี้</Label>
              <div className="border rounded-md max-h-48 overflow-auto p-2 space-y-1">
                {(accountsQuery.data ?? []).map((a) => (
                  <label key={a.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/50 cursor-pointer">
                    <Checkbox
                      checked={form.memberAccountIds.includes(a.id)}
                      onCheckedChange={() => toggleAccount(a.id)}
                    />
                    <span className="text-sm flex-1">{a.nickname ?? a.adAccountId}</span>
                    <span className="text-xs text-muted-foreground">{a.pageName}</span>
                  </label>
                ))}
                {(accountsQuery.data ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">ยังไม่มีบัญชีโฆษณา</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={reset}>ยกเลิก</Button>
            <Button onClick={submit} disabled={create.isPending || update.isPending}>
              {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
