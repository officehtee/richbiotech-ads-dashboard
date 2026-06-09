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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CreditCard,
  Loader2,
  Pencil,
  User as UserIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// ───────────────────────────────────────────────────────────────
// Types & constants
// ───────────────────────────────────────────────────────────────
type MyAccount = {
  id: number;
  nickname: string | null;
  adAccountId: string;
  bmId: number | null;
  paymentType: "card" | "prepaid" | null;
  limitAmount: number | null;
  groupNames: string[];
  effectiveStatus: "active" | "token_expired" | "blocked" | "revoked";
  statusSource: "single" | "bm";
};

const NONE = "__none__";
const ALL = "__all__";

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
// Page
// ───────────────────────────────────────────────────────────────
export default function MyAccounts() {
  const { user } = useAuth();
  const isStaff = user?.role === "staff";
  const utils = trpc.useUtils();
  const { data: accounts, isLoading } = trpc.accounts.myAccounts.useQuery(undefined, {
    enabled: isStaff,
  });

  const [groupFilter, setGroupFilter] = useState<string>(ALL);
  const [paymentFilter, setPaymentFilter] = useState<string>(ALL);
  const [limitSort, setLimitSort] = useState<SortDir>("none");

  const updateMutation = trpc.accounts.updateMyAccount.useMutation({
    // Optimistic update: อัปเดต UI ทันทีที่กดบันทึก ไม่ต้องรอ re-fetch
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
      // rollback กลับค่าเดิมถ้าบันทึกล้มเหลว
      if (ctx?.prev) utils.accounts.myAccounts.setData(undefined, ctx.prev);
      toast.error(err.message || "บันทึกไม่สำเร็จ");
    },
  });

  // รายชื่อกลุ่มสินค้าทั้งหมดที่ปรากฏ (สำหรับ dropdown filter)
  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    (accounts ?? []).forEach((a) => a.groupNames.forEach((g) => set.add(g)));
    return Array.from(set).sort((x, y) => x.localeCompare(y, "th"));
  }, [accounts]);

  // กรอง + เรียง (ทำงานร่วมกันได้)
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
        // null อยู่ท้ายเสมอ ไม่ว่าจะ asc หรือ desc
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

  // Frontend guard: หน้านี้สำหรับพนักงาน (staff) เท่านั้น — วางหลัง hooks ทั้งหมดเพื่อไม่ละเมิดกฎ Hooks
  // role อื่นที่เข้าผ่าน URL ตรงจะถูกปฏิเสธ
  if (user && !isStaff) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserIcon className="h-7 w-7" />
        </div>
        <div>
          <p className="text-lg font-semibold">หน้านี้สำหรับพนักงานเท่านั้น</p>
          <p className="text-sm text-muted-foreground">
            ผู้บริหารสามารถจัดการบัญชีทั้งหมดได้ที่เมนู “จัดการบัญชี”
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">บัญชีของฉัน</h1>
          <p className="text-sm text-muted-foreground">
            ดูบัญชีโฆษณาที่คุณรับผิดชอบ และแก้ไขการชำระเงิน / Limit ได้เฉพาะบัญชีของคุณ
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
          <div className="ml-auto text-sm text-muted-foreground">
            {rows.length} บัญชี
          </div>
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
          <EmptyState hasAny={(accounts ?? []).length > 0} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อบัญชี</TableHead>
                <TableHead>Ad Account ID</TableHead>
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
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <AccountRow key={a.id} a={a} onInlineUpdate={handleInlineUpdate} />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Empty state
// ───────────────────────────────────────────────────────────────
function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UserIcon className="h-7 w-7" />
      </div>
      <div>
        <p className="font-medium">{hasAny ? "ไม่พบบัญชีตามตัวกรอง" : "ยังไม่มีบัญชีที่คุณรับผิดชอบ"}</p>
        <p className="text-sm text-muted-foreground">
          {hasAny
            ? "ลองปรับหรือล้างตัวกรองเพื่อดูบัญชีทั้งหมด"
            : "เมื่อผู้ดูแลกำหนดให้คุณเป็นเจ้าของบัญชี บัญชีจะแสดงที่นี่"}
        </p>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Row with inline edit (paymentType + limitAmount)
// ───────────────────────────────────────────────────────────────
function AccountRow({
  a,
  onInlineUpdate,
}: {
  a: MyAccount;
  onInlineUpdate: (
    id: number,
    patch: { paymentType?: "card" | "prepaid" | null; limitAmount?: number | null },
  ) => void;
}) {
  const status = STATUS_META[a.effectiveStatus] ?? STATUS_META.active;
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState<string>(
    a.limitAmount != null ? String(a.limitAmount) : "",
  );
  // ค่าที่แสดงผลในโหมด read-only — อัปเดตทันทีตอน commit แล้ว sync ตาม prop (optimistic cache)
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
      setDisplayLimit(val); // อัปเดตจอทันที
      onInlineUpdate(a.id, { limitAmount: val });
    }
  };

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

      {/* กลุ่มสินค้า (รวมหลายกลุ่มในเซลล์เดียว) */}
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

      {/* สถานะ (read-only) */}
      <TableCell>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
