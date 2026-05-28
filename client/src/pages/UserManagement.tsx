import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Copy, Link2, Loader2, Plus, ShieldOff, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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

      <InvitesPanel />
    </div>
  );
}

const INVITE_ROLES = [
  { value: "ceo", label: "Co-Owner (CEO)" },
  { value: "content", label: "ทีมคอนเทนต์" },
  { value: "staff", label: "พนักงาน" },
] as const;

type InviteRole = (typeof INVITE_ROLES)[number]["value"];

function InvitesPanel() {
  const utils = trpc.useUtils();
  const list = trpc.invites.list.useQuery();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<InviteRole>("staff");
  const [label, setLabel] = useState("");

  const create = trpc.invites.create.useMutation({
    onSuccess: async () => {
      toast.success("ออกลิงก์เชิญสำเร็จ");
      setOpen(false);
      setLabel("");
      setRole("staff");
      await utils.invites.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const revoke = trpc.invites.revoke.useMutation({
    onSuccess: async () => {
      toast.success("ปิดลิงก์แล้ว");
      await utils.invites.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const arr = list.data ?? [];
    return [...arr].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [list.data]);

  const buildLink = (token: string) =>
    `${window.location.origin}/invite/${token}`;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            ลิงก์เชิญพนักงาน (Magic Invite Link)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ออกลิงก์ส่วนตัวพร้อม role ปลายทาง พนักงานคลิกลิงก์ → login มานัส Manus → เข้าระบบทันที อายุลิงก์ 7 วัน
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          ออก User ใหม่
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อ • Role</TableHead>
            <TableHead>ลิงก์</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="h-16 text-center">
                <Loader2 className="h-4 w-4 animate-spin inline" />
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-20 text-center">
                <p className="text-sm text-muted-foreground">ยังไม่มีลิงก์เชิญ</p>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((inv) => {
              const link = buildLink(inv.token);
              const status = inviteStatus(inv);
              return (
                <TableRow key={inv.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{inv.label || "(ไม่ระบุชื่อ)"}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {INVITE_ROLES.find((r) => r.value === inv.role)?.label ?? inv.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <code className="text-[11px] font-mono break-all">
                      {link.replace(/^https?:\/\//, "")}
                    </code>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} expiresAt={inv.expiresAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="คัดลอกลิงก์"
                        disabled={status !== "active"}
                        onClick={() => {
                          navigator.clipboard.writeText(link);
                          toast.success("คัดลอกลิงก์แล้ว");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {status === "active" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-rose-600"
                          title="ปิดลิงก์"
                          onClick={() => {
                            if (confirm("ยืนยันปิดลิงก์เชิญนี้?")) {
                              revoke.mutate({ inviteId: inv.id });
                            }
                          }}
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ออกลิงก์เชิญใหม่</DialogTitle>
            <DialogDescription>
              ลิงก์ส่วนตัว — พนักงานคลิกแล้ว login จะได้ role ตามที่ตั้ง ไว้อัตโนมัติ อายุ 7 วัน
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-label">ชื่อพนักงาน (ไม่บังคับ)</Label>
              <Input
                id="invite-label"
                placeholder="เช่น คุณสมชาย — ตำแหน่ง Sales"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as InviteRole)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              disabled={create.isPending}
              onClick={() => create.mutate({ role, label: label || undefined })}
            >
              {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              ออกลิงก์
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type InviteStatus = "active" | "used" | "revoked" | "expired";

function inviteStatus(inv: {
  usedAt?: Date | string | null;
  revokedAt?: Date | string | null;
  expiresAt: Date | string;
}): InviteStatus {
  if (inv.revokedAt) return "revoked";
  if (inv.usedAt) return "used";
  if (new Date(inv.expiresAt).getTime() < Date.now()) return "expired";
  return "active";
}

function StatusBadge({
  status,
  expiresAt,
}: {
  status: InviteStatus;
  expiresAt: Date | string;
}) {
  if (status === "active") {
    const days = Math.max(
      0,
      Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    );
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
        พร้อมใช้ • อีก {days} วัน
      </Badge>
    );
  }
  if (status === "used") {
    return <Badge variant="secondary">ใช้ไปแล้ว</Badge>;
  }
  if (status === "revoked") {
    return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-0">ถูกปิด</Badge>;
  }
  return <Badge className="bg-muted text-muted-foreground border-0">หมดอายุ</Badge>;
}
