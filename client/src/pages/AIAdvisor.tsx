import DateRangePicker from "@/components/DateRangePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import type { DateRangeInput } from "@shared/types";
import { Brain, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

type ScopeType = "workspace" | "account" | "group";

export default function AIAdvisor() {
  const [expert, setExpert] = useState<string>("performance_analyst");
  const [scopeType, setScopeType] = useState<ScopeType>("workspace");
  const [accountId, setAccountId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRangeInput>({ preset: "7d" });

  const expertsQuery = trpc.ai.experts.useQuery();
  const accountsQuery = trpc.accounts.list.useQuery();
  const groupsQuery = trpc.groups.list.useQuery();

  const analyzeMutation = trpc.ai.analyze.useMutation({
    onError: (e) => toast.error(e.message || "ขอคำแนะนำไม่สำเร็จ"),
  });

  const expertList = expertsQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const groups = groupsQuery.data ?? [];

  const canRun = useMemo(() => {
    if (scopeType === "account") return !!accountId;
    if (scopeType === "group") return !!groupId;
    return true;
  }, [scopeType, accountId, groupId]);

  const handleRun = () => {
    let scope:
      | { type: "workspace" }
      | { type: "account"; accountId: number }
      | { type: "group"; groupId: number };
    if (scopeType === "account") {
      scope = { type: "account", accountId: parseInt(accountId, 10) };
    } else if (scopeType === "group") {
      scope = { type: "group", groupId: parseInt(groupId, 10) };
    } else {
      scope = { type: "workspace" };
    }
    analyzeMutation.mutate({
      expert: expert as any,
      scope,
      dateRange,
    });
  };

  const selectedExpert = expertList.find((e: any) => e.key === expert);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Advisor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ขอคำแนะนำจากผู้เชี่ยวชาญ 5 ด้าน — One-click, ไม่เก็บประวัติ
          </p>
        </div>
      </header>

      {/* Expert selector cards */}
      {expertsQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : expertsQuery.error ? (
        <Card className="p-4 border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 flex items-center justify-between">
          <span className="text-sm text-rose-700 dark:text-rose-300">
            โหลดรายชื่อผู้เชี่ยวชาญไม่สำเร็จ: {expertsQuery.error.message}
          </span>
          <Button variant="outline" size="sm" onClick={() => expertsQuery.refetch()}>ลองใหม่</Button>
        </Card>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {expertList.map((e: any) => {
          const active = e.key === expert;
          return (
            <button
              key={e.key}
              type="button"
              onClick={() => setExpert(e.key)}
              className={`text-left p-4 rounded-lg border transition-all ${
                active
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-accent/30"
              }`}
            >
              <div className="text-2xl mb-1">{e.emoji}</div>
              <div className="font-semibold text-sm">{e.label}</div>
              <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{e.tagline}</div>
            </button>
          );
        })}
      </div>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">ขอบเขต</label>
            <Select value={scopeType} onValueChange={(v) => setScopeType(v as ScopeType)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="workspace">ทั้งระบบ</SelectItem>
                <SelectItem value="account">บัญชีเดียว</SelectItem>
                <SelectItem value="group">กลุ่มสินค้าเดียว</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scopeType === "account" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">เลือกบัญชี</label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-56"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a: any) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.nickname ?? a.adAccountId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {accountsQuery.error && (
                <span className="text-[10px] text-rose-600">โหลดบัญชีไม่สำเร็จ</span>
              )}
              {!accountsQuery.isLoading && !accountsQuery.error && accounts.length === 0 && (
                <span className="text-[10px] text-muted-foreground">ยังไม่มีบัญชีให้เลือก</span>
              )}
            </div>
          )}

          {scopeType === "group" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">เลือกกลุ่ม</label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger className="w-56"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {groups.map((g: any) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.groupName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {groupsQuery.error && (
                <span className="text-[10px] text-rose-600">โหลดกลุ่มไม่สำเร็จ</span>
              )}
              {!groupsQuery.isLoading && !groupsQuery.error && groups.length === 0 && (
                <span className="text-[10px] text-muted-foreground">ยังไม่มีกลุ่มให้เลือก</span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">ช่วงเวลา</label>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>

          <Button
            onClick={handleRun}
            disabled={!canRun || analyzeMutation.isPending}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {analyzeMutation.isPending ? "กำลังวิเคราะห์…" : "ขอคำแนะนำ"}
          </Button>
        </div>
      </Card>

      {/* Result */}
      <Card className="p-6 min-h-[280px]">
        {analyzeMutation.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : analyzeMutation.error ? (
          <div className="text-rose-600 dark:text-rose-400 text-sm">
            ❌ {analyzeMutation.error.message}
          </div>
        ) : analyzeMutation.data ? (
          <div>
            <div className="mb-4 flex items-center gap-2 pb-3 border-b">
              <span className="text-2xl">{selectedExpert?.emoji}</span>
              <div>
                <div className="font-semibold">{selectedExpert?.label}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {scopeType === "workspace"
                      ? "ทั้งระบบ"
                      : scopeType === "account"
                        ? "บัญชี"
                        : "กลุ่ม"}
                  </Badge>
                  <span>
                    {dateRange.preset === "custom" && dateRange.since && dateRange.until
                      ? `${dateRange.since} → ${dateRange.until}`
                      : `${dateRange.preset} ล่าสุด`}
                  </span>
                </div>
              </div>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Streamdown>{analyzeMutation.data.markdown}</Streamdown>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              เลือกผู้เชี่ยวชาญ + ขอบเขต แล้วกด "ขอคำแนะนำ" เพื่อรับรายงานวิเคราะห์
            </p>
            <p className="text-xs mt-2">ไม่เก็บประวัติ — สามารถขอใหม่ได้ทันที</p>
          </div>
        )}
      </Card>
    </div>
  );
}
