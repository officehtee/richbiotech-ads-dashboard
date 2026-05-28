import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, LucideIcon, Minus } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import CountUp from "react-countup";

export type KpiAccent = "spend" | "messaging" | "orders" | "revenue" | "roas" | "primary";

export type KpiCardProps = {
  label: string;
  /** Either pass a pre-formatted string OR pass `numericValue` + `formatter` to enable count-up. */
  value?: string;
  numericValue?: number;
  formatter?: (n: number) => string;
  sublabel?: string;
  icon: LucideIcon;
  accent?: KpiAccent;
  /** Sparkline series (last 7 days) */
  sparkline?: number[];
  /** Delta % vs previous period — positive = up, used with `goodWhen` to color */
  deltaPct?: number;
  /** "up" means up is good (revenue/roas), "down" means down is good (spend/cpm) */
  goodWhen?: "up" | "down" | "neutral";
  /** Right-aligned footer note (e.g. "5 ทักชั่วโมงนี้") */
  footer?: ReactNode;
  /** Subtle ring color for active/hover state */
  hint?: string;
};

const accentMap: Record<KpiAccent, { bg: string; text: string; stroke: string }> = {
  spend:     { bg: "bg-[var(--kpi-spend)]/10",     text: "text-[var(--kpi-spend)]",     stroke: "var(--kpi-spend)" },
  messaging: { bg: "bg-[var(--kpi-messaging)]/10", text: "text-[var(--kpi-messaging)]", stroke: "var(--kpi-messaging)" },
  orders:    { bg: "bg-[var(--kpi-orders)]/10",    text: "text-[var(--kpi-orders)]",    stroke: "var(--kpi-orders)" },
  revenue:   { bg: "bg-[var(--kpi-revenue)]/10",   text: "text-[var(--kpi-revenue)]",   stroke: "var(--kpi-revenue)" },
  roas:      { bg: "bg-[var(--kpi-roas)]/10",      text: "text-[var(--kpi-roas)]",      stroke: "var(--kpi-roas)" },
  primary:   { bg: "bg-primary/10",                text: "text-primary",                stroke: "var(--primary)" },
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) {
    return <div className="h-8 w-full" />;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${pts.join(" L ")}`;
  const area = `${path} L ${w},${h} L 0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${color})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeltaBadge({ deltaPct, goodWhen }: { deltaPct: number; goodWhen: "up" | "down" | "neutral" }) {
  const isUp = deltaPct > 0.05;
  const isDown = deltaPct < -0.05;
  const positive =
    (isUp && goodWhen === "up") || (isDown && goodWhen === "down");
  const negative =
    (isDown && goodWhen === "up") || (isUp && goodWhen === "down");
  const color = positive
    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
    : negative
      ? "text-rose-600 dark:text-rose-400 bg-rose-500/10"
      : "text-muted-foreground bg-muted/60";
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold num", color)}>
      <Icon className="h-3 w-3" />
      {Math.abs(deltaPct).toFixed(1)}%
    </span>
  );
}

export default function KpiCard({
  label,
  value,
  numericValue,
  formatter,
  sublabel,
  icon: Icon,
  accent = "primary",
  sparkline,
  deltaPct,
  goodWhen = "up",
  footer,
  hint,
}: KpiCardProps) {
  const a = accentMap[accent];
  // Stabilize CountUp end value to prevent restart on every render
  const [end, setEnd] = useState(numericValue ?? 0);
  useEffect(() => {
    if (typeof numericValue === "number") setEnd(numericValue);
  }, [numericValue]);

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-4 border-border/60",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
      )}
    >
      {/* Accent stripe */}
      <span className="absolute left-0 top-0 h-full w-1" style={{ background: a.stroke }} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight mt-1 truncate num">
            {value !== undefined ? (
              value
            ) : (
              <CountUp
                end={end}
                duration={1.2}
                preserveValue
                separator=","
                formattingFn={formatter}
                decimals={formatter ? 0 : 0}
              />
            )}
          </p>
          {(sublabel || typeof deltaPct === "number") && (
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {typeof deltaPct === "number" && goodWhen !== "neutral" && (
                <DeltaBadge deltaPct={deltaPct} goodWhen={goodWhen} />
              )}
              {sublabel && <span className="truncate">{sublabel}</span>}
            </div>
          )}
        </div>
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", a.bg)}>
          <Icon className={cn("h-5 w-5", a.text)} />
        </div>
      </div>

      {sparkline && sparkline.length > 0 && (
        <div className="mt-3 pl-2">
          <Sparkline data={sparkline} color={a.stroke} />
        </div>
      )}

      {(footer || hint) && (
        <div className="mt-2 pl-2 flex items-center justify-between text-[11px] text-muted-foreground">
          {hint ? <span className="truncate">{hint}</span> : <span />}
          {footer ? <span className="truncate font-medium num">{footer}</span> : <span />}
        </div>
      )}
    </Card>
  );
}
