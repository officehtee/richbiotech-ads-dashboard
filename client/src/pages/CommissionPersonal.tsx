import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { CommissionSnapshot } from "@shared/types";
import { useMemo, useState } from "react";

export default function CommissionPersonal() {
  const { user } = useAuth();
  const locks = trpc.commission.locks.useQuery();
  const staff = trpc.commission.staff.useQuery();

  const myStaff = useMemo(() => {
    if (!user) return null;
    // จับคู่ผ่าน linkedUserId
    return staff.data?.find((s) => s.linkedUserId === user.id) ?? null;
  }, [staff.data, user]);

  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const periodKey = selectedPeriod ?? locks.data?.[0]?.periodKey ?? "";
  const lockData = trpc.commission.getLock.useQuery({ periodKey }, { enabled: !!periodKey });

  const myComm = useMemo(() => {
    if (!lockData.data) return { total: 0, clips: [] as { clipNumber: string; gradeName: string | null; amount: number; groupName: string }[] };
    const snap = lockData.data.snapshot as CommissionSnapshot;
    const clips: { clipNumber: string; gradeName: string | null; amount: number; groupName: string }[] = [];
    let total = 0;
    for (const g of snap.groups) {
      for (const c of g.clips) {
        if (myStaff && c.staffId === myStaff.id) {
          clips.push({ clipNumber: c.clipNumber, gradeName: c.gradeName, amount: c.gradeAmount, groupName: g.groupName });
          total += c.gradeAmount;
        }
      }
    }
    return { total, clips };
  }, [lockData.data, myStaff]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">คอมมิชชั่นของฉัน</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {myStaff ? `บัญชีนี้เชื่อมกับ: ${myStaff.name}` : "บัญชีนี้ยังไม่ได้ผูกกับทีมงาน — แจ้งเจ้าของให้ผูกใน Settings"}
        </p>
      </header>

      <Card className="p-5">
        <p className="font-semibold tracking-tight mb-3">เลือกงวด</p>
        {locks.isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : !locks.data || locks.data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีงวดที่ Lock</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {locks.data.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedPeriod(l.periodKey)}
                className={`px-3 py-1.5 rounded text-xs border transition ${l.periodKey === periodKey ? "bg-primary/10 border-primary text-primary font-semibold" : "border-border hover:bg-accent"}`}
              >
                {l.periodLabel ?? l.periodKey}
              </button>
            ))}
          </div>
        )}
      </Card>

      {!myStaff ? null : !periodKey ? null : (
        <>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground">ยอดคอมงวดนี้</p>
            <p className="text-3xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{formatCurrency(myComm.total)}</p>
            <p className="text-xs text-muted-foreground mt-1">{myComm.clips.length} clips</p>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b">
              <p className="font-semibold tracking-tight">รายละเอียด Clips</p>
            </div>
            {myComm.clips.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">ไม่มี clips ในงวดนี้</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="py-2 px-4 text-left">Clip</th>
                    <th className="py-2 px-4 text-left">กลุ่ม</th>
                    <th className="py-2 px-4 text-left">Grade</th>
                    <th className="py-2 px-4 text-right">จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {myComm.clips.map((c, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-4 font-mono">#{c.clipNumber}</td>
                      <td className="py-2 px-4">{c.groupName}</td>
                      <td className="py-2 px-4">
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                          {c.gradeName ?? "—"}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(c.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
