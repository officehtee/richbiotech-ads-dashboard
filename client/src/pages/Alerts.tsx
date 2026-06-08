import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  CheckCircle2,
  Globe,
  Mail,
  MessageSquare,
  Play,
  Plus,
  Send,
  Settings,
  Trash2,
  Webhook,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const RULE_TYPE_LABEL: Record<string, string> = {
  roas_below: "ROAS ต่ำกว่าเป้า",
  spend_no_purchase: "ใช้งบ–ไม่มี Purchase",
  cost_per_msg_above: "ต้นทุน/ทักสูงเกิน",
  ctr_drop_pct: "CTR ลดลง",
  spend_spike_pct: "Spend พุ่ง",
};

const CHANNEL_ICON: Record<string, any> = {
  web: Globe,
  line: MessageSquare,
  webhook: Webhook,
  email: Mail,
  manus_owner: Bell,
};

const SEV_STYLE: Record<string, string> = {
  info: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  critical: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export default function Alerts() {
  const { user } = useAuth();
  const isOwner = ["admin", "owner", "ceo", "supervisor"].includes(user?.role ?? "");
  const utils = trpc.useUtils();

  const rules = trpc.alerts.listRules.useQuery();
  const channels = trpc.alerts.listChannels.useQuery();
  const events = trpc.alerts.listEvents.useQuery({ onlyUnread: false, limit: 100 });

  const seedDefaults = trpc.alerts.seedDefaults.useMutation({
    onSuccess: (r) => {
      toast.success(`เพิ่มกฎ default แล้ว ${r.created} ข้อ`);
      utils.alerts.listRules.invalidate();
    },
  });
  const toggleRule = trpc.alerts.updateRule.useMutation({
    onSuccess: () => utils.alerts.listRules.invalidate(),
  });
  const removeRule = trpc.alerts.removeRule.useMutation({
    onSuccess: () => {
      toast.success("ลบกฎเรียบร้อย");
      utils.alerts.listRules.invalidate();
    },
  });
  const runNow = trpc.alerts.runNow.useMutation({
    onSuccess: (r) => {
      toast.success(`ตรวจเสร็จ — trigger ${r.triggered}, skipped ${r.skipped}`);
      utils.alerts.listEvents.invalidate();
      utils.alerts.unreadCount.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [channelOpen, setChannelOpen] = useState(false);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            แจ้งเตือน
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ระบบตรวจสอบทุก 3 ชั่วโมง — ส่งหา ทุกคนใน workspace ผ่าน Web / LINE / Webhook
          </p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedDefaults.mutate()}
              disabled={seedDefaults.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              เพิ่มกฎ Default
            </Button>
            <Button
              size="sm"
              onClick={() => runNow.mutate()}
              disabled={runNow.isPending}
            >
              <Play className="h-4 w-4 mr-1" />
              {runNow.isPending ? "กำลังตรวจ…" : "ตรวจตอนนี้"}
            </Button>
          </div>
        )}
      </header>

      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">เหตุการณ์</TabsTrigger>
          <TabsTrigger value="rules">กฎ ({rules.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="channels">ช่องทาง ({channels.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* ---- Events ---- */}
        <TabsContent value="events" className="mt-4">
          <Card className="overflow-hidden">
            {events.isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">กำลังโหลด…</div>
            ) : !events.data || events.data.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                ยังไม่มีเหตุการณ์ — กดปุ่ม "ตรวจตอนนี้" เพื่อทดสอบ
              </div>
            ) : (
              <ul className="divide-y">
                {events.data.map((e: any) => (
                  <li key={e.id} className={`p-4 flex items-start gap-3 ${e.isRead ? "" : "bg-primary/5"}`}>
                    <Badge className={`${SEV_STYLE[e.severity] || ""} text-[10px]`}>{e.severity}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{e.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{e.message}</div>
                      <div className="text-[10px] text-muted-foreground/70 mt-2">
                        {RULE_TYPE_LABEL[e.ruleType] ?? e.ruleType} ·{" "}
                        {new Date(e.createdAt).toLocaleString("th-TH")}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        {/* ---- Rules ---- */}
        <TabsContent value="rules" className="mt-4 space-y-3">
          {!isOwner && (
            <Card className="p-3 text-xs text-muted-foreground">เฉพาะเจ้าของเท่านั้นที่แก้ไขกฎได้</Card>
          )}
          {rules.isLoading ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">กำลังโหลด…</Card>
          ) : !rules.data || rules.data.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
              ยังไม่มีกฎ — กด "เพิ่มกฎ Default" เพื่อเพิ่มเงื่อนไขมาตรฐาน 5 ข้อ
            </Card>
          ) : (
            rules.data.map((r: any) => (
              <Card key={r.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {r.label}
                    <Badge variant="outline" className="text-[10px]">{RULE_TYPE_LABEL[r.ruleType]}</Badge>
                    <Badge className={`${SEV_STYLE[r.severity] || ""} text-[10px]`}>{r.severity}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    param: {JSON.stringify(r.param)}
                  </div>
                </div>
                <Switch
                  checked={r.isEnabled !== false}
                  disabled={!isOwner || toggleRule.isPending}
                  onCheckedChange={(v) => toggleRule.mutate({ id: r.id, isEnabled: v })}
                />
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-500"
                    onClick={() => {
                      if (confirm(`ลบกฎ "${r.label}"?`)) removeRule.mutate({ id: r.id });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* ---- Channels ---- */}
        <TabsContent value="channels" className="mt-4 space-y-3">
          {isOwner && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setChannelOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />เพิ่มช่องทาง
              </Button>
            </div>
          )}
          {channels.isLoading ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">กำลังโหลด…</Card>
          ) : !channels.data || channels.data.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-3 opacity-30" />
              ยังไม่มีช่องทางส่ง — เพิ่ม LINE / Webhook / Manus Owner
              <div className="text-xs mt-2">หมายเหตุ: "Web" จะแสดงในกระดิ่งอัตโนมัติเสมอ</div>
            </Card>
          ) : (
            channels.data.map((c: any) => {
              const Icon = CHANNEL_ICON[c.channelType] || Globe;
              return (
                <Card key={c.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{c.label || c.channelType.toUpperCase()}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate max-w-md">
                        {JSON.stringify(c.config)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.isEnabled ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" />active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">ปิด</Badge>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <AddChannelDialog
        open={channelOpen}
        onClose={() => setChannelOpen(false)}
        onSuccess={() => utils.alerts.listChannels.invalidate()}
      />
    </div>
  );
}

function AddChannelDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<"line" | "webhook" | "manus_owner">("line");
  const [label, setLabel] = useState("");
  const [token, setToken] = useState("");
  const [to, setTo] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");

  const create = trpc.alerts.createChannel.useMutation({
    onSuccess: () => {
      toast.success("เพิ่มช่องทางสำเร็จ");
      onSuccess();
      onClose();
      setLabel("");
      setToken("");
      setTo("");
      setUrl("");
      setSecret("");
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    let config: any = {};
    if (type === "line") {
      if (!token || !to) return toast.error("กรอก access token + LINE user/group ID");
      config = { accessToken: token, to };
    } else if (type === "webhook") {
      if (!url) return toast.error("กรอก Webhook URL");
      config = { url, secret: secret || undefined };
    } else {
      config = {};
    }
    create.mutate({
      channelType: type,
      label: label || undefined,
      config,
      isEnabled: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มช่องทางแจ้งเตือน</DialogTitle>
          <DialogDescription>เลือกประเภทช่องทางและกรอกข้อมูลที่จำเป็น</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>ประเภท</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="line">LINE Messaging API</SelectItem>
                <SelectItem value="webhook">Webhook (HTTP POST)</SelectItem>
                <SelectItem value="manus_owner">Manus Owner (notifyOwner)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>ชื่อช่องทาง (optional)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="เช่น LINE กลุ่มงาน" />
          </div>

          {type === "line" && (
            <>
              <div className="space-y-1">
                <Label>Channel Access Token</Label>
                <Input value={token} onChange={(e) => setToken(e.target.value)} type="password" />
              </div>
              <div className="space-y-1">
                <Label>To (userId / groupId)</Label>
                <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="U1234... หรือ C5678..." />
              </div>
            </>
          )}

          {type === "webhook" && (
            <>
              <div className="space-y-1">
                <Label>URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.example.com/alert" />
              </div>
              <div className="space-y-1">
                <Label>Secret (optional)</Label>
                <Input value={secret} onChange={(e) => setSecret(e.target.value)} type="password" />
              </div>
            </>
          )}

          {type === "manus_owner" && (
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
              ส่งแจ้งเตือนเข้าบัญชี Manus เจ้าของระบบโดยตรง (ไม่ต้องตั้งค่า)
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
