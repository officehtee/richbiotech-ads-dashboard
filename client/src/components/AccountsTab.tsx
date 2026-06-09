import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import type { RouterOutputs } from "@/lib/trpc";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CreditCard,
  Loader2,
  Pencil,
  User as UserIcon,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// ───────────────────────────────────────────────────────────────
// Types & constants — ใช้ shape จาก backend จริง (RouterOutputs)
// ───────────────────────────────────────────────────────────────
type MyAccount = RouterOutputs["accounts"]["myAccounts"][number];

const NONE = "__none__";
const ALL = "__all__";

// เฟส 6: role ที่เห็น/จัดการทุกบัญชี (ต้องตรงกับ OWNER_ROLES ฝั่ง backend)
const OWNER_ROLES = ["admin", "owner", "ceo", "supervisor"];

const PAYMENT_LABEL: Record<string, string> = {
  card: "ผูกบัตร",
  prepaid: "เติมเงิน",
};

const STATUS_META: Record<
  MyAccount["effectiveStatus"],
  { label: string; className: string }
> = {
  active: {
    label: "ใช้งานได้",
    className:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  token_expired: {
    label: "Token หมดอายุ",
    className:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  blocked: {
    label: "ถูกบล็อก",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  },
  revoked: {
    label: "ถูกยกเลิก",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  },
};

type SortDir = "none" | "asc" | "desc";

// ───────────────────────────────────────────────────────────────
// Topup helpers — คำนวณสด ไม่เก็บผลใน DB
// ───────────────────────────────────────────────────────────────
/** จำนวนวันเต็มระหว่าง 2 วัน (อิง local date เพื่อกัน timezone drift) */
function daysBetweenLocal(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

/**
 * คำนวณ "ต้องเติม" แบบสด (clamp ไม่ติดลบ):
 * คงเหลือประมาณการ = balance - (dailySpend × วันที่ผ่านไปนับจาก topupLastDate)
 * แสดงคำเตือนเมื่อคงเหลือ < dailySpend (ยิงต่อได้ไม่ถึง 1 วัน)
 */
function computeTopupStatus(a: MyAccount): {
  hasData: boolean;
  daysPassed: number;
  estRemaining: number | null;
  daysLeft: number | null;
  level: "ok" | "warn" | "critical" | "none";
} {
  if (a.paymentType !== "prepaid") {
    return { hasData: false, daysPassed: 0, estRemaining: null, daysLeft: null, level: "none" };
  }
  const balance = a.topupBalance;
  const daily = a.topupDailySpend;
  const last = a.topupLastDate ? new Date(a.topupLastDate) : null;
  if (balance == null || daily == null || daily <= 0 || !last) {
    return { hasData: false, daysPassed: 0, estRemaining: null, daysLeft: null, level: "none" };
  }
  const daysPassed = daysBetweenLocal(last, new Date());
  const estRemaining = Math.max(0, balance - daily * daysPassed); // clamp ติดลบ
  const daysLeft = Math.max(0, Math.floor(estRemaining / daily));
  let level: "ok" | "warn" | "critical" = "ok";
  if (estRemaining <= 0 || daysLeft <= 0) level = "critical";
  else if (daysLeft <= 2) level = "warn";
  return { hasData: true, daysPassed, estRemaining, daysLeft, level };
}

// ───────────────────────────────────────────────────────────────
// Tab content (self-contained — mount/unmount พร้อม Tab)
// ───────────────────────────────────────────────────────────────
export default function AccountsTab() {
  const { user } = useAuth();
  const isOwnerRole = !!user && OWNER_ROLES.includes(user.role);
  const utils = trpc.useUtils();
  const { data: accounts, isLoading } = trpc.accounts.myAccounts.useQuery();

  const [groupFilter, setGroupFilter] = useState<string>(ALL);
  const [paymentFilter, setPaymentFilter] = useState<string>(ALL);
  const [limitSort, setLimitSort] = useState<SortDir>("none");

  // popup เติมเงิน
  const [topupTarget, setTopupTarget] = useState<MyAccount | null>(null);

  const updateMutation = trpc.accounts.updateMyAccount.useMutation({
    onMutate: async (vars) => {
      await utils.accounts.myAccounts.cancel();
      const prev = utils.accounts.myAccounts.getData();
      utils.accounts.myAccounts.setData(undefined, (old) =>
        old?.map((acc) =>
          acc.id === vars.id
            ? {
                ...acc,
                paymentType: vars.paymentType !== undefined ? vars.paymentType : acc.paymentType,
                limitAmount: vars.limitAmount !== undefined ? vars.limitAmount : acc.limitAmount,
              }
            : acc,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) utils.accounts.myAccounts.setData(undefined, ctx.prev);
      toast.error(err.message || "บันทึกไม่สำเร็จ");
    },
  });

  const topupMutation = trpc.accounts.updateTopup.useMutation({
    onSuccess: () => {
      utils.accounts.myAccounts.invalidate();
      toast.success("บันทึกข้อมูลเติมเงินแล้ว");
      setTopupTarget(null);
    },
    onError: (err) => {
      toast.error(err.message || "บันทึกไม่สำเร็จ");
    },
  });

  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    (accounts ?? []).forEach((a) => a.groupNames.forEach((g: string) => set.add(g)));
    return Array.from(set).sort((x, y) => x.localeCompare(y, "th"));
  }, [accounts]);

  const rows = useMemo(() => {
    let list = [...(accounts ?? [])];
    if (groupFilter !== ALL) {
      list = list.filter((a) => a.groupNames.includes(groupFilter));
    }
    if (paymentFilter !== ALL) {
      if (paymentFilter === NONE) {
        list = list.filter((a) => a.paymentType == null);
      } else {
        list = list.filter((a) => a.paymentType === paymentFilter);
      }
    }
    if (limitSort !== "none") {
      list.sort((a, b) => {
        const av = a.limitAmount;
        const bv = b.limitAmount;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return limitSort === "asc" ? av - bv : bv - av;
      });
    }
    return list;
  }, [accounts, groupFilter, paymentFilter, limitSort]);

  const cycleLimitSort = () => {
    setLimitSort((d) => (d === "none" ? "asc" : d === "asc" ? "desc" : "none"));
  };

  const handleInlineUpdate = (
    id: number,
    patch: { paymentType?: "card" | "prepaid" | null; limitAmount?: number | null },
  ) => {
    const current = (accounts ?? []).find((a) => a.id === id);
    if (!current) return;
    updateMutation.mutate({
      id,
      paymentType: patch.paymentType !== undefined ? patch.paymentType : current.paymentType,
      limitAmount: patch.limitAmount !== undefined ? patch.limitAmount : current.limitAmount,
    });
  };

  // จำนวนคอลัมน์ (ใช้กับ colSpan ของ empty/loading ถ้าต้องการ)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserIcon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {isOwnerRole ? "บัญชีทั้งหมด" : "บัญชีของฉัน"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isOwnerRole
              ? "ดูบัญชีโฆษณาทุกบัญชีในทีม จัดการการชำระเงิน / Limit / เติมเงิน"
              : "ดูบัญชีโฆษณาที่คุณรับผิดชอบ และแก้ไขการชำระเงิน / Limit / เติมเงินได้เฉพาะบัญชีของคุณ"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">กลุ่มสินค้า</label>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>ทุกกลุ่มสินค้า</SelectItem>
                {groupOptions.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">การชำระเงิน</label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>ทั้งหมด</SelectItem>
                <SelectItem value="card">ผูกบัตร</SelectItem>
                <SelectItem value="prepaid">เติมเงิน</SelectItem>
                <SelectItem value={NONE}>ยังไม่ระบุ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(groupFilter !== ALL || paymentFilter !== ALL || limitSort !== "none") && (
            <button
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => {
                setGroupFilter(ALL);
                setPaymentFilter(ALL);
                setLimitSort("none");
              }}
            >
              ล้างตัวกรอง
            </button>
          )}
          <div className="ml-auto text-sm text-muted-foreground">{rows.length} บัญชี</div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            กำลังโหลด...
          </div>
        ) : rows.length === 0 ? (
          <EmptyState hasAny={(accounts ?? []).length > 0} isOwnerRole={isOwnerRole} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อบัญชี</TableHead>
                  <TableHead>Ad Account ID</TableHead>
                  {isOwnerRole && <TableHead>เจ้าของ</TableHead>}
                  <TableHead>กลุ่มสินค้า</TableHead>
                  <TableHead>การชำระเงิน</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={cycleLimitSort}
                    >
                      Limit
                      {limitSort === "none" && <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      {limitSort === "asc" && <ArrowUp className="h-3.5 w-3.5" />}
                      {limitSort === "desc" && <ArrowDown className="h-3.5 w-3.5" />}
                    </button>
                  </TableHead>
                  <TableHead>เติมเงิน</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <AccountRow
                    key={a.id}
                    a={a}
                    isOwnerRole={isOwnerRole}
                    onInlineUpdate={handleInlineUpdate}
                    onOpenTopup={() => setTopupTarget(a)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Topup dialog */}
      <TopupDialog
        account={topupTarget}
        onClose={() => setTopupTarget(null)}
        onSave={(payload) => topupMutation.mutate(payload)}
        saving={topupMutation.isPending}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Empty state
// ───────────────────────────────────────────────────────────────
function EmptyState({ hasAny, isOwnerRole }: { hasAny: boolean; isOwnerRole: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UserIcon className="h-7 w-7" />
      </div>
      <div>
        <p className="font-medium">
          {hasAny
            ? "ไม่พบบัญชีตามตัวกรอง"
            : isOwnerRole
              ? "ยังไม่มีบัญชีในทีม"
              : "ยังไม่มีบัญชีที่คุณรับผิดชอบ"}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasAny
            ? "ลองปรับหรือล้างตัวกรองเพื่อดูบัญชีทั้งหมด"
            : isOwnerRole
              ? "เพิ่มบัญชีโฆษณาได้ที่เมนูจัดการบัญชี"
              : "เมื่อผู้ดูแลกำหนดให้คุณเป็นเจ้าของบัญชี บัญชีจะแสดงที่นี่"}
        </p>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Row with inline edit (paymentType + limitAmount) + topup cell
// ───────────────────────────────────────────────────────────────
function AccountRow({
  a,
  isOwnerRole,
  onInlineUpdate,
  onOpenTopup,
}: {
  a: MyAccount;
  isOwnerRole: boolean;
  onInlineUpdate: (
    id: number,
    patch: { paymentType?: "card" | "prepaid" | null; limitAmount?: number | null },
  ) => void;
  onOpenTopup: () => void;
}) {
  const status = STATUS_META[a.effectiveStatus] ?? STATUS_META.active;
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState<string>(
    a.limitAmount != null ? String(a.limitAmount) : "",
  );
  const [displayLimit, setDisplayLimit] = useState<number | null>(a.limitAmount);
  useEffect(() => {
    setDisplayLimit(a.limitAmount);
  }, [a.limitAmount]);

  const commitLimit = () => {
    setEditingLimit(false);
    const val = limitDraft.trim() === "" ? null : Number(limitDraft);
    if (val != null && (Number.isNaN(val) || val < 0)) {
      toast.error("Limit ต้องเป็นตัวเลขไม่ติดลบ");
      setLimitDraft(displayLimit != null ? String(displayLimit) : "");
      return;
    }
    if (val !== displayLimit) {
      setDisplayLimit(val);
      onInlineUpdate(a.id, { limitAmount: val });
    }
  };

  const topup = computeTopupStatus(a);

  return (
    <TableRow>
      {/* ชื่อบัญชี */}
      <TableCell className="font-medium">
        {a.nickname || <span className="text-muted-foreground">ไม่มีชื่อเล่น</span>}
      </TableCell>

      {/* Ad Account ID */}
      <TableCell>
        <span className="font-mono text-xs text-muted-foreground">{a.adAccountId}</span>
      </TableCell>

      {/* เจ้าของ (เฉพาะ OWNER_ROLES) */}
      {isOwnerRole && (
        <TableCell>
          {a.ownerNickname ? (
            <span className="text-sm">{a.ownerNickname}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
      )}

      {/* กลุ่มสินค้า */}
      <TableCell>
        {a.groupNames.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {a.groupNames.map((g) => (
              <Badge key={g} variant="secondary" className="font-normal">
                {g}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* การชำระเงิน (inline edit) */}
      <TableCell>
        <Select
          value={a.paymentType ?? NONE}
          onValueChange={(v) =>
            onInlineUpdate(a.id, {
              paymentType: v === NONE ? null : (v as "card" | "prepaid"),
            })
          }
        >
          <SelectTrigger className="h-8 w-[130px]">
            <SelectValue>
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                {a.paymentType ? PAYMENT_LABEL[a.paymentType] : "ยังไม่ระบุ"}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="card">ผูกบัตร</SelectItem>
            <SelectItem value="prepaid">เติมเงิน</SelectItem>
            <SelectItem value={NONE}>ยังไม่ระบุ</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      {/* Limit (inline edit) */}
      <TableCell>
        {editingLimit ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              type="number"
              min={0}
              value={limitDraft}
              onChange={(e) => setLimitDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitLimit();
                if (e.key === "Escape") {
                  setEditingLimit(false);
                  setLimitDraft(displayLimit != null ? String(displayLimit) : "");
                }
              }}
              className="h-8 w-28"
            />
            <button
              className="text-emerald-600 hover:text-emerald-700"
              onClick={commitLimit}
              aria-label="บันทึก"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                setEditingLimit(false);
                setLimitDraft(displayLimit != null ? String(displayLimit) : "");
              }}
              aria-label="ยกเลิก"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            className="group flex items-center gap-1.5 font-mono tabular-nums hover:text-primary"
            onClick={() => {
              setLimitDraft(displayLimit != null ? String(displayLimit) : "");
              setEditingLimit(true);
            }}
          >
            {displayLimit != null ? displayLimit.toLocaleString("th-TH") : "—"}
            <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
          </button>
        )}
      </TableCell>

      {/* เติมเงิน (topup) */}
      <TableCell>
        {a.paymentType === "card" ? (
          <span className="text-xs text-muted-foreground">— (ผูกบัตร)</span>
        ) : a.paymentType === "prepaid" ? (
          <TopupCell topup={topup} onOpen={onOpenTopup} />
        ) : (
          <button
            className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            onClick={onOpenTopup}
            title="ตั้งค่าเป็นเติมเงินก่อนจึงกรอกได้"
          >
            ตั้งค่า
          </button>
        )}
      </TableCell>

      {/* สถานะ */}
      <TableCell>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

// ───────────────────────────────────────────────────────────────
// Topup cell — แสดงผลคำนวณสด + ปุ่มแก้ไข
// ───────────────────────────────────────────────────────────────
function TopupCell({
  topup,
  onOpen,
}: {
  topup: ReturnType<typeof computeTopupStatus>;
  onOpen: () => void;
}) {
  if (!topup.hasData) {
    return (
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
        onClick={onOpen}
      >
        <Wallet className="h-3.5 w-3.5" />
        กรอกข้อมูล
      </button>
    );
  }
  const levelClass =
    topup.level === "critical"
      ? "text-red-600 dark:text-red-400"
      : topup.level === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";
  return (
    <button
      className="group flex flex-col items-start gap-0.5 text-left"
      onClick={onOpen}
      title="คลิกเพื่อแก้ไขข้อมูลเติมเงิน"
    >
      <span className={`font-mono text-sm font-semibold tabular-nums ${levelClass}`}>
        ฿{(topup.estRemaining ?? 0).toLocaleString("th-TH")}
      </span>
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {topup.level === "critical"
          ? "ต้องเติมแล้ว"
          : `เหลือ ~${topup.daysLeft} วัน`}
        <Pencil className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-60" />
      </span>
    </button>
  );
}

// ───────────────────────────────────────────────────────────────
// Topup dialog — กรอก 4 ค่า
// ───────────────────────────────────────────────────────────────
type TopupPayload = {
  id: number;
  topupLastDate: number | null;
  topupDailySpend: number | null;
  topupUsed: number | null;
  topupBalance: number | null;
};

/** แปลง Date → input[type=date] value (local YYYY-MM-DD) */
function toDateInput(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function TopupDialog({
  account,
  onClose,
  onSave,
  saving,
}: {
  account: MyAccount | null;
  onClose: () => void;
  onSave: (payload: TopupPayload) => void;
  saving: boolean;
}) {
  const [lastDate, setLastDate] = useState("");
  const [dailySpend, setDailySpend] = useState("");
  const [used, setUsed] = useState("");
  const [balance, setBalance] = useState("");

  // sync ค่าเริ่มต้นเมื่อเปิด dialog กับบัญชีใหม่
  useEffect(() => {
    if (account) {
      setLastDate(toDateInput(account.topupLastDate ? new Date(account.topupLastDate) : null));
      setDailySpend(account.topupDailySpend != null ? String(account.topupDailySpend) : "");
      setUsed(account.topupUsed != null ? String(account.topupUsed) : "");
      setBalance(account.topupBalance != null ? String(account.topupBalance) : "");
    }
  }, [account]);

  const open = !!account;
  // บัญชี card ไม่ควรเปิดถึงตรงนี้ (UI กันแล้ว) แต่กันเหนียว
  const isPrepaid = account?.paymentType === "prepaid";

  const parseNonNeg = (s: string): number | null => {
    if (s.trim() === "") return null;
    const n = Number(s);
    if (Number.isNaN(n) || n < 0) return null;
    return Math.floor(n);
  };

  const handleSave = () => {
    if (!account) return;
    const ds = parseNonNeg(dailySpend);
    const us = parseNonNeg(used);
    const bal = parseNonNeg(balance);
    if (
      (dailySpend.trim() !== "" && ds == null) ||
      (used.trim() !== "" && us == null) ||
      (balance.trim() !== "" && bal == null)
    ) {
      toast.error("ตัวเลขต้องไม่ติดลบ");
      return;
    }
    // แปลงวันที่ local → UTC ms (เที่ยงวัน local กัน off-by-one ข้าม timezone)
    let lastMs: number | null = null;
    if (lastDate.trim() !== "") {
      const [y, m, d] = lastDate.split("-").map(Number);
      lastMs = new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
    }
    onSave({
      id: account.id,
      topupLastDate: lastMs,
      topupDailySpend: ds,
      topupUsed: us,
      topupBalance: bal,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            ข้อมูลเติมเงิน
          </DialogTitle>
          <DialogDescription>
            {account?.nickname || account?.adAccountId}
          </DialogDescription>
        </DialogHeader>

        {!isPrepaid ? (
          <div className="rounded-md bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
            บัญชีนี้ยังไม่ได้ตั้งเป็น “เติมเงิน (prepaid)” — โปรดเปลี่ยนการชำระเงินเป็น “เติมเงิน”
            ในตารางก่อน จึงจะบันทึกข้อมูลเติมเงินได้
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">วันที่เติมล่าสุด</label>
              <Input type="date" value={lastDate} onChange={(e) => setLastDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ยอดยิงต่อวัน (บาท)</label>
                <Input
                  type="number"
                  min={0}
                  value={dailySpend}
                  onChange={(e) => setDailySpend(e.target.value)}
                  placeholder="เช่น 1000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">เงินคงเหลือ (บาท)</label>
                <Input
                  type="number"
                  min={0}
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="เช่น 5000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ใช้ไปแล้ว (บาท) — ไม่บังคับ</label>
              <Input
                type="number"
                min={0}
                value={used}
                onChange={(e) => setUsed(e.target.value)}
                placeholder="เช่น 2000"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              ระบบจะคำนวณ “เงินคงเหลือโดยประมาณ” และ “จำนวนวันที่ยิงได้” อัตโนมัติจากยอดยิงต่อวัน
              โดยนับจากวันที่เติมล่าสุด
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={!isPrepaid || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
