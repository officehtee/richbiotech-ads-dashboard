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
 * Per-KPI gradient backgrounds — full-color, modern admin dashboard style.
 * Each accent picks two colors; the card uses a 135° linear gradient.
 * Colors keep the original semantic association of each KPI.
 */
const accentMap: Record<
  KpiAccent,
  {
    /** background gradient — light → dark, top-left to bottom-right */
    gradFrom: string;
    gradTo: string;
    /** decorative blob color (translucent white tint) */
    blob: string;
    /** sparkline stroke (white-ish) */
  }
> = {
  // Orange — Spend (warmth/cost)
  spend: { gradFrom: "#fb923c", gradTo: "#f97316", blob: "rgba(255,255,255,0.18)" },
  // Blue — Messaging (volume/communication)
  messaging: { gradFrom: "#60a5fa", gradTo: "#2563eb", blob: "rgba(255,255,255,0.18)" },
  // Emerald — Orders (success)
  orders: { gradFrom: "#34d399", gradTo: "#059669", blob: "rgba(255,255,255,0.18)" },
  // Amber — Revenue (money/gold)
  revenue: { gradFrom: "#fbbf24", gradTo: "#d97706", blob: "rgba(255,255,255,0.18)" },
  // Violet — ROAS (efficiency)
  roas: { gradFrom: "#a78bfa", gradTo: "#7c3aed", blob: "rgba(255,255,255,0.18)" },
  // Royal blue fallback
  primary: { gradFrom: "#3b82f6", gradTo: "#1e40af", blob: "rgba(255,255,255,0.18)" },
};

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) {
    return <div className="h-10 w-full" />;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 32;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return { x, y };
  });
  const path = `M ${pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" L ")}`;
  const area = `${path} L ${w},${h} L 0,${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-10 w-full">
      <defs>
        <linearGradient id="kpi-spark-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#kpi-spark-area)" />
      <path
        d={path}
        fill="none"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last.x} cy={last.y} r="1.8" fill="white" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
    </svg>
  );
}

function DeltaPill({ deltaPct, goodWhen }: { deltaPct: number; goodWhen: "up" | "down" | "neutral" }) {
  const isUp = deltaPct > 0.05;
  const isDown = deltaPct < -0.05;
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  // On colorful gradient bg, simply use white-on-translucent so it stays high-contrast.
  // Direction (good/bad) is conveyed by the arrow icon, not by red/green color tint.
  void goodWhen;
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white ring-1 ring-white/25 num backdrop-blur-sm">
      <Icon className="h-2.5 w-2.5" />
      {Math.abs(deltaPct).toFixed(1)}%
    </span>
  );
}

function StatusDot({ status }: { status: "live" | "idle" | "danger" }) {
  const cls =
    status === "live"
      ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
      : status === "danger"
        ? "bg-rose-200"
        : "bg-white/60";
  return (
    <span className="relative inline-flex h-2 w-2">
      {status === "live" && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75 animate-ping" />
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
        "relative overflow-hidden rounded-2xl p-4 text-white",
        "ring-1 ring-white/10",
        "shadow-[0_8px_24px_-6px_rgba(15,23,42,0.25)]",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-6px_rgba(15,23,42,0.35)]",
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${a.gradFrom} 0%, ${a.gradTo} 100%)`,
      }}
    >
      {/* Decorative blob bottom-right (gives it the modern "fluid" admin look) */}
      <div
        className="pointer-events-none absolute -right-10 -bottom-12 h-36 w-36 rounded-full"
        style={{ background: a.blob, filter: "blur(2px)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-4 -top-10 h-24 w-24 rounded-full opacity-60"
        style={{ background: "rgba(255,255,255,0.12)" }}
        aria-hidden
      />

      {/* Top row: label + dot + live status + (optional icon) */}
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
          <span className="text-[11px] font-semibold tracking-wider uppercase text-white/85 truncate">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {liveStatus && <StatusDot status={liveStatus} />}
          {Icon && <Icon className="h-3.5 w-3.5 text-white/85" />}
        </div>
      </div>

      {/* Big number + delta pill */}
      <div className="relative mt-2 flex items-baseline gap-2">
        <span className="num text-3xl font-bold tracking-tight text-white tabular-nums drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]">
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
      <div className="relative mt-2 -mx-1">
        {sparkline && sparkline.length > 0 ? (
          <Sparkline data={sparkline} />
        ) : (
          <div className="h-10 w-full" />
        )}
      </div>

      {/* Footer: hint · live now */}
      {(footer || hint) && (
        <div className="relative mt-1 flex items-center justify-between gap-2 text-[11px] text-white/85">
          {hint ? <span className="truncate num">{hint}</span> : <span />}
          {footer ? (
            <span className="truncate font-medium num text-white">{footer}</span>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
