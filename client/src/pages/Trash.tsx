import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { RotateCcw, Trash2, Trash } from "lucide-react";
import { Redirect } from "wouter";
import { toast } from "sonner";

const CONTENT_ROLE = "content";

function formatDate(d: Date | string | null): string {
  if (!d) return "-";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TrashPage() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const listQuery = trpc.trash.list.useQuery(undefined, {
    enabled: !loading && !!user && user.role !== CONTENT_ROLE,
  });

  const restore = trpc.trash.restore.useMutation({
    onMutate: async ({ campaignId }) => {
      await utils.trash.list.cancel();
      const prev = utils.trash.list.getData();
      utils.trash.list.setData(undefined, (old) =>
        (old ?? []).filter((r) => r.campaignId !== campaignId),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) utils.trash.list.setData(undefined, context.prev);
      toast.error("กู้คืนไม่สำเร็จ ลองใหม่อีกครั้ง");
    },
    onSuccess: () => {
      toast.success("กู้แคมเปญกลับตารางหลักแล้ว");
    },
    onSettled: () => {
      utils.trash.list.invalidate();
    },
  });

  const deletePermanent = trpc.trash.deletePermanent.useMutation({
    onMutate: async ({ campaignId }) => {
      await utils.trash.list.cancel();
      const prev = utils.trash.list.getData();
      utils.trash.list.setData(undefined, (old) =>
        (old ?? []).filter((r) => r.campaignId !== campaignId),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) utils.trash.list.setData(undefined, context.prev);
      toast.error("ลบถาวรไม่สำเร็จ ลองใหม่อีกครั้ง");
    },
    onSuccess: () => {
      toast.success("ลบแคมเปญถาวรแล้ว");
    },
    onSettled: () => {
      utils.trash.list.invalidate();
    },
  });

  // Role guard: content ไม่มีสิทธิ์เข้าถังขยะ
  if (!loading && user && user.role === CONTENT_ROLE) {
    return <Redirect to="/" />;
  }

  const rows = listQuery.data ?? [];
  const isBusy = restore.isPending || deletePermanent.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <Trash className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ถังขยะ</h1>
          <p className="text-sm text-muted-foreground">
            แคมเปญที่ถูกปฏิเสธครบ 5 วันจะถูกย้ายมาที่นี่อัตโนมัติ — กู้กลับหรือลบถาวรได้
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading || listQuery.isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Trash2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-base font-medium">ถังขยะว่างเปล่า</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              ยังไม่มีแคมเปญในถังขยะ เมื่อแคมเปญถูกปฏิเสธครบ 5 วันจะปรากฏที่นี่
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3 font-medium">ชื่อแคมเปญ</th>
                  <th className="px-4 py-3 font-medium">วันที่เข้าถัง</th>
                  <th className="px-4 py-3 font-medium">เหตุผล</th>
                  <th className="px-4 py-3 text-right font-medium">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.campaignId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.campaignName ?? `แคมเปญ ${r.campaignId}`}</div>
                      <div className="text-xs text-muted-foreground">ID: {r.campaignId}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.trashedAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.trashedReason === "auto_reject"
                        ? "ถูกปฏิเสธครบ 5 วัน (อัตโนมัติ)"
                        : r.trashedReason === "manual"
                          ? "ย้ายเข้าถังด้วยตนเอง"
                          : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => restore.mutate({ campaignId: r.campaignId })}
                          className="gap-1.5 bg-background"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          กู้คืน
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isBusy}
                              className="gap-1.5 border-rose-500/30 bg-background text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              ลบถาวร
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>ลบแคมเปญถาวร?</AlertDialogTitle>
                              <AlertDialogDescription>
                                การลบถาวรจะลบข้อมูลแคมเปญ "{r.campaignName ?? r.campaignId}"
                                ทั้งหมด (รวมข้อมูลรายวันและค่าที่กรอกมือ) ออกจากระบบอย่างถาวร
                                และไม่สามารถกู้กลับได้อีก
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deletePermanent.mutate({ campaignId: r.campaignId })}
                                className="bg-rose-600 text-white hover:bg-rose-700"
                              >
                                ลบถาวร
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
