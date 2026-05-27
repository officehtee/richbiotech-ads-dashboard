import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CommissionSettings() {
  const grades = trpc.commission.grades.useQuery();
  const staff = trpc.commission.staff.useQuery();
  const assignments = trpc.commission.clipAssignments.useQuery();
  const groupsQuery = trpc.groups.list.useQuery();
  const utils = trpc.useUtils();

  const [gradeForm, setGradeForm] = useState({ gradeName: "", amount: 0 });
  const [staffForm, setStaffForm] = useState({ name: "" });
  const [clipForm, setClipForm] = useState<{ clipNumber: string; groupId: number | null; staffId: number | null }>({
    clipNumber: "",
    groupId: null,
    staffId: null,
  });

  const createGrade = trpc.commission.createGrade.useMutation({
    onSuccess: async () => {
      toast.success("เพิ่ม Grade แล้ว");
      await utils.commission.grades.invalidate();
      setGradeForm({ gradeName: "", amount: 0 });
    },
  });
  const removeGrade = trpc.commission.removeGrade.useMutation({
    onSuccess: () => utils.commission.grades.invalidate(),
  });
  const createStaff = trpc.commission.createStaff.useMutation({
    onSuccess: async () => {
      toast.success("เพิ่มทีมงานแล้ว");
      await utils.commission.staff.invalidate();
      setStaffForm({ name: "" });
    },
  });
  const removeStaff = trpc.commission.removeStaff.useMutation({
    onSuccess: () => utils.commission.staff.invalidate(),
  });
  const setClip = trpc.commission.setClipAssignment.useMutation({
    onSuccess: async () => {
      toast.success("บันทึกการ Assign แล้ว");
      await utils.commission.clipAssignments.invalidate();
      setClipForm({ clipNumber: "", groupId: null, staffId: null });
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Commission Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ตั้งค่า Grade, ทีมงาน และจับคู่ Clip Number กับกลุ่ม/พนักงาน
        </p>
      </header>

      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="staff">ทีมงาน</TabsTrigger>
          <TabsTrigger value="assignments">Clip Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-6">
          <Card className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="flex-1 space-y-1.5">
                <Label>ชื่อ Grade (เช่น A, B, S)</Label>
                <Input
                  value={gradeForm.gradeName}
                  onChange={(e) => setGradeForm({ ...gradeForm, gradeName: e.target.value })}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>จำนวนคอม (THB)</Label>
                <Input
                  type="number"
                  value={gradeForm.amount}
                  onChange={(e) => setGradeForm({ ...gradeForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <Button
                onClick={() => createGrade.mutate(gradeForm)}
                disabled={!gradeForm.gradeName || createGrade.isPending}
              >
                {createGrade.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                เพิ่ม
              </Button>
            </div>
            <div className="border-t pt-3">
              {!grades.data || grades.data.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">ยังไม่มี Grade</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-muted-foreground border-b">
                    <th className="py-2 text-left">Grade</th>
                    <th className="py-2 text-right">จำนวน</th>
                    <th className="py-2"></th>
                  </tr></thead>
                  <tbody>
                    {grades.data.map((g) => (
                      <tr key={g.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{g.gradeName}</td>
                        <td className="py-2 text-right font-mono">{formatCurrency(g.amount)}</td>
                        <td className="py-2 text-right">
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeGrade.mutate({ id: g.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <Card className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="flex-1 space-y-1.5">
                <Label>ชื่อทีมงาน</Label>
                <Input
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ name: e.target.value })}
                />
              </div>
              <Button
                onClick={() => createStaff.mutate(staffForm)}
                disabled={!staffForm.name || createStaff.isPending}
              >
                {createStaff.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                เพิ่ม
              </Button>
            </div>
            <div className="border-t pt-3">
              {!staff.data || staff.data.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">ยังไม่มีทีมงาน</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-muted-foreground border-b">
                    <th className="py-2 text-left">ชื่อ</th>
                    <th className="py-2 text-left">สถานะ</th>
                    <th className="py-2"></th>
                  </tr></thead>
                  <tbody>
                    {staff.data.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{s.name}</td>
                        <td className="py-2 text-xs">
                          <span className={s.isActive ? "text-emerald-600" : "text-muted-foreground"}>
                            {s.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeStaff.mutate({ id: s.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:items-end">
              <div className="space-y-1.5">
                <Label>เลข Clip</Label>
                <Input
                  value={clipForm.clipNumber}
                  onChange={(e) => setClipForm({ ...clipForm, clipNumber: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>กลุ่ม</Label>
                <Select
                  value={clipForm.groupId?.toString() ?? "none"}
                  onValueChange={(v) => setClipForm({ ...clipForm, groupId: v === "none" ? null : parseInt(v, 10) })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                    {(groupsQuery.data ?? []).map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.groupName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>ทีมงาน</Label>
                <Select
                  value={clipForm.staffId?.toString() ?? "none"}
                  onValueChange={(v) => setClipForm({ ...clipForm, staffId: v === "none" ? null : parseInt(v, 10) })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                    {(staff.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setClip.mutate(clipForm)}
                disabled={!clipForm.clipNumber || setClip.isPending}
              >
                {setClip.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                บันทึก
              </Button>
            </div>
            <div className="border-t pt-3">
              {!assignments.data || assignments.data.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">ยังไม่ได้ Assign Clip</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-muted-foreground border-b">
                    <th className="py-2 text-left">Clip</th>
                    <th className="py-2 text-left">กลุ่ม</th>
                    <th className="py-2 text-left">ทีมงาน</th>
                  </tr></thead>
                  <tbody>
                    {assignments.data.map((a, i) => {
                      const grp = groupsQuery.data?.find((g) => g.id === a.groupId);
                      const stf = staff.data?.find((s) => s.id === a.staffId);
                      return (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 font-mono">{a.clipNumber}</td>
                          <td className="py-2">{grp?.groupName ?? "—"}</td>
                          <td className="py-2">{stf?.name ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
