import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export type KpiCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  accent?: "spend" | "messaging" | "orders" | "revenue" | "roas" | "primary";
  trend?: { value: number; positive?: boolean };
};

const accentMap: Record<NonNullable<KpiCardProps["accent"]>, { bg: string; text: string }> = {
  spend: { bg: "bg-[var(--kpi-spend)]/10", text: "text-[var(--kpi-spend)]" },
  messaging: { bg: "bg-[var(--kpi-messaging)]/10", text: "text-[var(--kpi-messaging)]" },
  orders: { bg: "bg-[var(--kpi-orders)]/10", text: "text-[var(--kpi-orders)]" },
  revenue: { bg: "bg-[var(--kpi-revenue)]/10", text: "text-[var(--kpi-revenue)]" },
  roas: { bg: "bg-[var(--kpi-roas)]/10", text: "text-[var(--kpi-roas)]" },
  primary: { bg: "bg-primary/10", text: "text-primary" },
};

export default function KpiCard({ label, value, sublabel, icon: Icon, accent = "primary" }: KpiCardProps) {
  const a = accentMap[accent];
  return (
    <Card className="p-5 hover:shadow-md transition-shadow border-border/60">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight mt-1.5 truncate">
            {value}
          </p>
          {sublabel && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{sublabel}</p>
          )}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${a.bg}`}>
          <Icon className={`h-5 w-5 ${a.text}`} />
        </div>
      </div>
    </Card>
  );
}
