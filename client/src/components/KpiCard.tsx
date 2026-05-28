import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, LucideIcon, Minus } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import CountUp from "react-countup";

export type KpiAccent = "spend" | "messaging" | "orders" | "revenue" | "roas" | "primary";

export type KpiCardProps = {
  label: string;
  value?: string;
  numericValue?: number;
  formatter?: (n: number) => string;
  sublabel?: string;
  icon?: LucideIcon;
  accent?: KpiAccent;
  /** Sparkline series */
  sparkline?: number[];
  /** Delta % vs previous period — positive = up */
  deltaPct?: number;
  /** "up" means up is good (revenue/roas), "down" means down is good (spend/cpm) */
  goodWhen?: "up" | "down" | "neutral";
  /** Right-aligned footer note */
  footer?: ReactNode;
  /** Subtle hint shown on the left of footer */
  hint?: string;
  /** Live status dot (right of label): green=hot, gray=idle, red=danger */
  liveStatus?: "live" | "idle" | "danger";
};

/**
 * Per-KPI accent colors used for label dot, sparkline stroke, and delta.
 */
const accentMap: Record<KpiAccent, { dot: string; line: string; lineGradStart: string; lineGradEnd: string }> = {
  spend:     { dot: "#fb923c", line: "#fb923c", lineGradStart: "rgba(251,146,60,0.35)",  lineGradEnd: "rgba(251,146,60,0)" },
  messaging: { dot: "#3b82f6", line: "#3b82f6", lineGradStart: "rgba(59,130,246,0.35)",  lineGradEnd: "rgba(59,130,246,0)" },
  orders:    { dot: "#10b981", line: "#10b981", lineGradStart: "rgba(16,185,129,0.35)",  lineGradEnd: "rgba(16,185,129,0)" },
  revenue:   { dot: "#fbbf24", line: "#fbbf24", lineGradStart: "rgba(251,191,36,0.35)",  lineGradEnd: "rgba(251,191,36,0)" },
  roas:      { dot: "#a78bfa", line: "#a78bfa", lineGradStart: "rgba(167,139,250,0.35)", lineGradEnd: "rgba(167,139,250,0)" },
  primary:   { dot: "#3b82f6", line: "#3b82f6", lineGradStart: "rgba(59,130,246,0.35)",  lineGradEnd: "rgba(59,130,246,0)" },
};

function Sparkline({ data, accent }: { data: number[]; accent: KpiAccent }) {
  const a = accentMap[accent];
  if (!data || data.length < 2) {
    return <div className="h-12 w-full" />;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 36;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return { x, y };
  });
  const path = `M ${pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" L ")}`;
  const area = `${path} L ${w},${h} L 0,${h} Z`;
  const last = pts[pts.length - 1];
  const gradId = `kpi-area-${accent}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-12 w-full">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={a.lineGradStart} />
          <stop offset="100%" stopColor={a.lineGradEnd} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={path}
        fill="none"
        stroke={a.line}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* End-of-line dot */}
      <circle cx={last.x} cy={last.y} r="1.6" fill={a.line} stroke="rgba(255,255,255,0.95)" strokeWidth="0.6" />
    </svg>
  );
}

function DeltaPill({ deltaPct, goodWhen }: { deltaPct: number; goodWhen: "up" | "down" | "neutral" }) {
  const isUp = deltaPct > 0.05;
  const isDown = deltaPct < -0.05;
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  const isGood = (isUp && goodWhen === "up") || (isDown && goodWhen === "down");
  const isBad = (isDown && goodWhen === "up") || (isUp && goodWhen === "down");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold num leading-none",
        isGood && "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25",
        isBad && "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/25",
        !isGood && !isBad && "bg-zinc-500/15 text-zinc-400 ring-1 ring-zinc-500/25",
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {Math.abs(deltaPct).toFixed(1)}%
    </span>
  );
}

function StatusDot({ status }: { status: "live" | "idle" | "danger" }) {
  const cls =
    status === "live"
      ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
      : status === "danger"
        ? "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.7)]"
        : "bg-zinc-500";
  return (
    <span className="relative inline-flex h-2 w-2">
      {status === "live" && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/40 opacity-75 animate-ping" />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", cls)} />
    </span>
  );
}

export default function KpiCard({
  label,
  value,
  numericValue,
  formatter,
  icon: Icon,
  accent = "primary",
  sparkline,
  deltaPct,
  goodWhen = "up",
  footer,
  hint,
  liveStatus,
}: KpiCardProps) {
  const a = accentMap[accent];

  const [end, setEnd] = useState(numericValue ?? 0);
  useEffect(() => {
    if (typeof numericValue === "number") setEnd(numericValue);
  }, [numericValue]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-4",
        "bg-[#0d1117] dark:bg-[#0a0d12]",
        "border border-white/[0.06] dark:border-white/[0.08]",
        "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)]",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12]",
      )}
    >
      {/* Top row: label + dot + live status + (optional icon) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: a.dot, boxShadow: `0 0 6px ${a.dot}` }}
          />
          <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400 truncate">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {liveStatus && <StatusDot status={liveStatus} />}
          {Icon && <Icon className="h-3.5 w-3.5 text-zinc-500" />}
        </div>
      </div>

      {/* Big number + delta pill */}
      <div className="mt-2 flex items-baseline gap-2">
        <span className="num text-3xl font-bold tracking-tight text-white tabular-nums">
          {value !== undefined ? (
            value
          ) : (
            <CountUp end={end} duration={1.2} preserveValue separator="," formattingFn={formatter} />
          )}
        </span>
        {typeof deltaPct === "number" && goodWhen !== "neutral" && (
          <DeltaPill deltaPct={deltaPct} goodWhen={goodWhen} />
        )}
      </div>

      {/* Sparkline full-width */}
      <div className="mt-2 -mx-1">
        {sparkline && sparkline.length > 0 ? (
          <Sparkline data={sparkline} accent={accent} />
        ) : (
          <div className="h-12 w-full" />
        )}
      </div>

      {/* Footer: hint · live now */}
      {(footer || hint) && (
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-zinc-400">
          {hint ? (
            <span className="truncate num">{hint}</span>
          ) : (
            <span />
          )}
          {footer ? (
            <span className="truncate font-medium num text-zinc-300">{footer}</span>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
