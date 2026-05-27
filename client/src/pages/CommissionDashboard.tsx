import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { CommissionSnapshot } from "@shared/types";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6"];

export default function CommissionDashboard() {
  const locks = trpc.commission.locks.useQuery();

  // เลือก lock ล่าสุด
  const latest = locks.data?.[0];
  const lockData = trpc.commission.getLock.useQuery(
    { periodKey: latest?.periodKey ?? "" },
    { enabled: !!latest },
  );

  const { byStaff, byGroup, totalComm } = useMemo(() => {
    const snap: CommissionSnapshot | null = lockData.data
      ? (lockData.data.snapshot as CommissionSnapshot)
      : null;
    const staffMap = new Map<string, number>();
    const groupMap = new Map<string, { amount: number; color: string }>();
    let total = 0;
    if (snap) {
      for (const g of snap.groups) {
        let gComm = 0;
        for (const c of g.clips) {
          total += c.gradeAmount;
          gComm += c.gradeAmount;
          const sName = c.staffName ?? "ยังไม่ Assign";
          staffMap.set(sName, (staffMap.get(sName) ?? 0) + c.gradeAmount);
        }
        groupMap.set(g.groupName, { amount: gComm, color: g.color });
      }
    }
    return {
      byStaff: Array.from(staffMap.entries()).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
      byGroup: Array.from(groupMap.entries()).map(([name, { amount, color }]) => ({ name, amount, color })),
      totalComm: total,
    };
  }, [lockData.data]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Commission Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ภาพรวมค่าคอมจาก Locked Period — เลือกงวดด้านล่าง
        </p>
      </header>

      <Card className="p-5">
        <p className="font-semibold tracking-tight mb-3">Locked Periods</p>
        {locks.isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : !locks.data || locks.data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีงวดที่ถูก Lock</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {locks.data.map((l) => (
              <div
                key={l.id}
                className={`px-3 py-1.5 rounded text-xs border ${l.periodKey === latest?.periodKey ? "bg-primary/10 border-primary text-primary font-semibold" : "border-border"}`}
              >
                {l.periodLabel ?? l.periodKey}
              </div>
            ))}
          </div>
        )}
      </Card>

      {!latest ? (
        <Card className="p-12 text-center text-muted-foreground">
          ยัง Lock งวดไหน — กรุณาไปที่หน้า Commission Calculator แล้วกด Lock งวดที่ต้องการ
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground">ยอดคอมรวม ({latest.periodLabel ?? latest.periodKey})</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totalComm)}</p>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <p className="font-semibold tracking-tight mb-4">คอมแยกตามทีมงาน</p>
              {byStaff.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">ไม่มีข้อมูล</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byStaff} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip
                        formatter={(v: any) => formatCurrency(v as number)}
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <p className="font-semibold tracking-tight mb-4">คอมแยกตามกลุ่มสินค้า</p>
              {byGroup.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">ไม่มีข้อมูล</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byGroup} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90}>
                        {byGroup.map((g, i) => <Cell key={i} fill={g.color || COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => formatCurrency(v as number)}
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
