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
  /** Subtle hint shown on the left of footer */
  hint?: string;
};

/**
 * Full-color gradient palette per KPI accent.
 * Each accent uses two stops for a smooth modern gradient.
 */
const gradientMap: Record<KpiAccent, { from: string; to: string; ring: string }> = {
  // orange — spend
  spend:     { from: "#fb923c", to: "#ea580c", ring: "rgba(234, 88, 12, 0.45)" },
  // royal blue — messaging
  messaging: { from: "#3b82f6", to: "#1d4ed8", ring: "rgba(29, 78, 216, 0.45)" },
  // emerald — orders
  orders:    { from: "#10b981", to: "#047857", ring: "rgba(4, 120, 87, 0.45)" },
  // amber — revenue
  revenue:   { from: "#fbbf24", to: "#d97706", ring: "rgba(217, 119, 6, 0.45)" },
  // violet — ROAS
  roas:      { from: "#a78bfa", to: "#6d28d9", ring: "rgba(109, 40, 217, 0.45)" },
  // primary fallback
  primary:   { from: "#3b82f6", to: "#1e40af", ring: "rgba(30, 64, 175, 0.45)" },
};

function Sparkline({ data }: { data: number[] }) {
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
        <linearGradient id="kpi-spark-white" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#kpi-spark-white)" />
      <path
        d={path}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.9}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeltaBadge({ deltaPct, goodWhen }: { deltaPct: number; goodWhen: "up" | "down" | "neutral" }) {
  const isUp = deltaPct > 0.05;
  const isDown = deltaPct < -0.05;
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold num",
        "bg-white/20 text-white backdrop-blur-sm",
      )}
      title={
        (isUp && goodWhen === "up") || (isDown && goodWhen === "down")
          ? "ดีขึ้นเทียบงวดก่อน"
          : (isDown && goodWhen === "up") || (isUp && goodWhen === "down")
            ? "แย่ลงเทียบงวดก่อน"
            : "ใกล้เคียงงวดก่อน"
      }
    >
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
  const g = gradientMap[accent];

  // Stabilize CountUp end value to prevent restart on every render
  const [end, setEnd] = useState(numericValue ?? 0);
  useEffect(() => {
    if (typeof numericValue === "number") setEnd(numericValue);
  }, [numericValue]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-4 text-white",
        "transition-all duration-200 hover:-translate-y-0.5",
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%)`,
        boxShadow: `0 10px 20px -10px ${g.ring}, 0 2px 6px -2px rgba(0,0,0,0.08)`,
      }}
    >
      {/* Decorative blurred circle (soft glow, lower-right) */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -bottom-10 h-32 w-32 rounded-full opacity-25"
        style={{ background: "radial-gradient(closest-side, #ffffff 0%, transparent 70%)" }}
      />
      {/* Subtle diagonal sheen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 40%)",
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium tracking-wide uppercase text-white/85">
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight mt-1 truncate num text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">
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
            <div className="flex items-center gap-2 mt-1 text-xs text-white/90">
              {typeof deltaPct === "number" && goodWhen !== "neutral" && (
                <DeltaBadge deltaPct={deltaPct} goodWhen={goodWhen} />
              )}
              {sublabel && <span className="truncate">{sublabel}</span>}
            </div>
          )}
        </div>
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
            "bg-white/20 backdrop-blur-sm ring-1 ring-white/25",
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>

      {sparkline && sparkline.length > 0 && (
        <div className="relative mt-3">
          <Sparkline data={sparkline} />
        </div>
      )}

      {(footer || hint) && (
        <div className="relative mt-2 flex items-center justify-between text-[11px] text-white/85">
          {hint ? <span className="truncate">{hint}</span> : <span />}
          {footer ? <span className="truncate font-medium num text-white">{footer}</span> : <span />}
        </div>
      )}
    </div>
  );
}
