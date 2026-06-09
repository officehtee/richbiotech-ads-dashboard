import * as React from "react";
import { TabsTrigger } from "@/components/ui/tabs";

type Tone = "cyan" | "orange";

const GLOW: Record<Tone, { glow: string; rgb: string }> = {
  cyan: { glow: "#00d4ff", rgb: "0,212,255" },
  orange: { glow: "#ff7a2a", rgb: "255,122,42" },
};

type Effect = { id: number; type: "ripple" } | { id: number; type: "particle"; left: number; drift: number; delay: number };

/**
 * NeonTabTrigger — wraps shadcn TabsTrigger, adds neon outline + glow + on-tap
 * effects (ripple / particles / bounce). Does NOT touch tab switching logic;
 * it forwards children/value to TabsTrigger and only layers visual effects.
 */
export function NeonTabTrigger({
  value,
  tone,
  active,
  icon,
  label,
}: {
  value: string;
  tone: Tone;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  const [effects, setEffects] = React.useState<Effect[]>([]);
  const [bouncing, setBouncing] = React.useState(false);
  const idRef = React.useRef(0);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  // cleanup all pending timers on unmount
  React.useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
    };
  }, []);

  const fireEffects = () => {
    const { rgb } = GLOW[tone];
    const newEffects: Effect[] = [];
    const rippleId = ++idRef.current;
    newEffects.push({ id: rippleId, type: "ripple" });
    for (let i = 0; i < 6; i++) {
      const pid = ++idRef.current;
      newEffects.push({
        id: pid,
        type: "particle",
        left: 20 + Math.random() * 60,
        drift: Math.random() * 16 - 8,
        delay: i * 0.08,
      });
    }
    setEffects((prev) => [...prev, ...newEffects]);
    setBouncing(true);

    // cleanup ripple after 0.6s, particles after 2.2s, bounce after 0.42s
    const rmRipple = setTimeout(() => {
      setEffects((prev) => prev.filter((e) => e.id !== rippleId));
    }, 600);
    const particleIds = newEffects.filter((e) => e.type === "particle").map((e) => e.id);
    const rmParticles = setTimeout(() => {
      setEffects((prev) => prev.filter((e) => !particleIds.includes(e.id)));
    }, 2200);
    const rmBounce = setTimeout(() => setBouncing(false), 420);
    timers.current.push(rmRipple, rmParticles, rmBounce);
    void rgb;
  };

  const { glow, rgb } = GLOW[tone];

  return (
    <TabsTrigger
      value={value}
      onClick={fireEffects}
      data-active={active ? "true" : "false"}
      data-tone={tone}
      data-bouncing={bouncing ? "true" : "false"}
      className="adv-tab flex-none border-0 bg-transparent p-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
    >
      <span className="adv-spin-ring" aria-hidden />
      <span className="adv-scan" aria-hidden />
      <span className="adv-icon">{icon}</span>
      <span className="adv-label">{label}</span>
      {effects.map((e) =>
        e.type === "ripple" ? (
          <span
            key={e.id}
            className="adv-ripple"
            style={{ background: `radial-gradient(circle, rgba(${rgb},0.5) 0%, transparent 70%)` }}
            aria-hidden
          />
        ) : (
          <span
            key={e.id}
            className="adv-particle"
            style={{
              background: glow,
              boxShadow: `0 0 5px ${glow}`,
              left: `${e.left}%`,
              ["--drift" as string]: `${e.drift}px`,
              animation: `adv-float-up ${(1.2 + Math.random() * 0.8).toFixed(2)}s ease-out forwards`,
              animationDelay: `${e.delay}s`,
            }}
            aria-hidden
          />
        )
      )}
    </TabsTrigger>
  );
}

export default NeonTabTrigger;
