import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Copy, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

const ROLES = [
  { value: "ceo", label: "Co-Owner (CEO)" },
  { value: "content", label: "ทีมคอนเทนต์" },
  { value: "staff", label: "พนักงาน" },
  { value: "pending", label: "รอ approve" },
];

const ROLE_COLOR: Record<string, string> = {
  owner: "bg-primary/10 text-primary",
  ceo: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  content: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  staff: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  pending: "bg-muted text-muted-foreground",
};

export default function UserManagement() {
  const { user } = useAuth();
  const usersQuery = trpc.users.list.useQuery();
  const myCompany = trpc.onboarding.myCompany.useQuery();
  const utils = trpc.useUtils();
  const setRole = trpc.users.setRole.useMutation({
    onSuccess: async () => {
      toast.success("เปลี่ยน role สำเร็จ");
      await utils.users.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.users.remove.useMutation({
    onSuccess: async () => {
      toast.success("ลบสำเร็จ");
      await utils.users.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const code = myCompany.data?.companyCode;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">จัดการผู้ใช้</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ดูสมาชิกใน workspace และกำหนดสิทธิ์
        </p>
      </header>

      {code && (
        <Card className="p-5 bg-primary/5 border-primary/20">
          <p className="text-xs uppercase tracking-wider font-semibold text-primary">Company Code</p>
          <div className="flex items-center gap-3 mt-2">
            <code className="text-2xl font-mono font-bold tracking-wider">{code}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(code);
                toast.success("คัดลอกแล้ว");
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              คัดลอก
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            แชร์โค้ดนี้ให้ทีมงานใช้เข้าร่วม workspace ที่หน้า Onboarding
          </p>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>เข้าใช้ล่าสุด</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!usersQuery.data || usersQuery.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">ยังไม่มีสมาชิกในทีม</p>
                </TableCell>
              </TableRow>
            ) : (
              usersQuery.data.map((u) => {
                const isMe = u.id === user?.id;
                const isOwner = u.role === "owner";
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.name ?? "—"} {isMe && <span className="text-xs text-muted-foreground">(คุณ)</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{u.email ?? "—"}</TableCell>
                    <TableCell>
                      {isOwner ? (
                        <span className={`text-xs px-2 py-1 rounded ${ROLE_COLOR[u.role] ?? ""}`}>
                          {u.role}
                        </span>
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={(v) => setRole.mutate({ userId: u.id, role: v as any })}
                          disabled={isMe}
                        >
                          <SelectTrigger className="w-40 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleString("th-TH") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isOwner && !isMe && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`ลบ ${u.name ?? u.email} ออกจาก workspace?`)) {
                              remove.mutate({ userId: u.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
