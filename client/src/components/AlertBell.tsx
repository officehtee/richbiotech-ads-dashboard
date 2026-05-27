import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Bell, BellRing, Check, Settings as Gear } from "lucide-react";
import { useLocation } from "wouter";

const SEV_STYLE: Record<string, string> = {
  info: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  critical: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export default function AlertBell() {
  const [, navigate] = useLocation();
  const unread = trpc.alerts.unreadCount.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const events = trpc.alerts.listEvents.useQuery({ onlyUnread: false, limit: 12 });
  const utils = trpc.useUtils();
  const markRead = trpc.alerts.markRead.useMutation({
    onSuccess: () => {
      utils.alerts.unreadCount.invalidate();
      utils.alerts.listEvents.invalidate();
    },
  });
  const markAll = trpc.alerts.markAllRead.useMutation({
    onSuccess: () => {
      utils.alerts.unreadCount.invalidate();
      utils.alerts.listEvents.invalidate();
    },
  });

  const count = unread.data ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          {count > 0 ? (
            <BellRing className="h-4 w-4 text-amber-500" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {count > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold text-sm">การแจ้งเตือน</div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={!count || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <Check className="h-3 w-3 mr-1" />อ่านทั้งหมด
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigate("/alerts")}
              title="ตั้งค่า Alert"
            >
              <Gear className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {events.isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">กำลังโหลด…</div>
          ) : !events.data || events.data.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              ยังไม่มีการแจ้งเตือน
            </div>
          ) : (
            <ul className="divide-y">
              {events.data.map((e: any) => (
                <li
                  key={e.id}
                  className={`p-3 hover:bg-accent/40 cursor-pointer ${e.isRead ? "" : "bg-primary/5"}`}
                  onClick={() => !e.isRead && markRead.mutate({ id: e.id })}
                >
                  <div className="flex items-start gap-2">
                    <Badge className={`${SEV_STYLE[e.severity] || ""} text-[10px] px-1.5 py-0`}>
                      {e.severity}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate">{e.title}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {e.message}
                      </div>
                      <div className="text-[10px] text-muted-foreground/70 mt-1">
                        {new Date(e.createdAt).toLocaleString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                        })}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="p-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate("/alerts")}
          >
            ดูทั้งหมด + ตั้งค่า
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
