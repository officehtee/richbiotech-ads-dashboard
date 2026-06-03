/**
 * BmBlockedBanner — Round 7.39c
 *
 * Design spec (pasted_content.txt):
 *  - Accent stripe 3px ซ้าย สื่อ severity
 *  - Gradient พื้นหลัง danger 7%→4% ทับ bg
 *  - ขอบ 1px color-mix(danger 28%, border)
 *  - Account chips: avatar + ชื่อ + status badge
 *  - Progressive disclosure: "ดูวิธีแก้ไข" ซ่อน/แสดง 3 ขั้นตอน
 *  - CTA solid danger + ปุ่มรอง text
 *  - Dismiss persist ใน sessionStorage (ต่อ key ของ BM ที่เสีย)
 *  - role="alert", aria-label ครบ, ไม่พึ่งสีอย่างเดียว
 *  - Responsive ≤720px: chips wrap, layout stack
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { AlertTriangle, Settings, ExternalLink, X, ChevronDown, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";

/* ─── helpers ─────────────────────────────────────────────── */

const STATUS_LABEL: Record<string, string> = {
  blocked: "API ถูกบล็อก",
  token_expired: "โทเค็นหมดอายุ",
  failed: "เชื่อมต่อล้มเหลว",
};

function statusText(status: string): string {
  return STATUS_LABEL[status] ?? `ผิดปกติ (${status})`;
}

/** สีพื้น avatar ต่อ index (orange, violet, teal, rose, sky …) */
const AVATAR_COLORS = [
  "bg-orange-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-indigo-500",
  "bg-emerald-500",
];

function avatarColor(idx: number): string {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

/** ตัวย่อ 2 ตัวอักษรจากชื่อ */
function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** key สำหรับ sessionStorage — ขึ้นกับ id ของ BM ที่เสีย */
function dismissKey(ids: string[]): string {
  return `bm-banner-dismissed-${ids.sort().join(",")}`;
}

/* ─── component ───────────────────────────────────────────── */

export default function BmBlockedBanner() {
  const { data: bms } = trpc.bm.list.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const problem = useMemo(() => (bms ?? []).filter((b) => b.status !== "active"), [bms]);
  const key = useMemo(() => dismissKey(problem.map((b) => String(b.id))), [problem]);

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(key) === "1";
  });
  const [expanded, setExpanded] = useState(false);

  if (dismissed || problem.length === 0) return null;

  const hasBlocked = problem.some((b) => b.status === "blocked");

  /* ─── dismiss ─── */
  function dismiss() {
    sessionStorage.setItem(key, "1");
    setDismissed(true);
  }

  return (
    <div
      role="alert"
      className="bm-banner mb-4 relative overflow-hidden rounded-[14px] text-sm"
      style={{
        /* gradient พื้นหลัง danger 7%→4% */
        background: hasBlocked
          ? "linear-gradient(135deg, oklch(0.6 0.24 27 / 0.09) 0%, oklch(0.6 0.24 27 / 0.04) 100%), var(--color-card, white)"
          : "linear-gradient(135deg, oklch(0.75 0.18 80 / 0.09) 0%, oklch(0.75 0.18 80 / 0.04) 100%), var(--color-card, white)",
        /* ขอบ 1px color-mix(danger 28%, border) */
        border: hasBlocked
          ? "1px solid color-mix(in oklch, oklch(0.6 0.24 27) 28%, oklch(0.9 0.01 265))"
          : "1px solid color-mix(in oklch, oklch(0.75 0.18 80) 28%, oklch(0.9 0.01 265))",
        boxShadow: "0 1px 4px 0 oklch(0 0 0 / 0.07)",
      }}
    >
      {/* Accent stripe 3px ซ้าย */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-[14px]"
        style={{
          background: hasBlocked ? "oklch(0.6 0.24 27)" : "oklch(0.75 0.18 80)",
        }}
      />

      {/* Body — 3 คอลัมน์: icon | content | dismiss */}
      <div className="pl-5 pr-3 py-4 flex items-start gap-3">

        {/* ① Icon chip */}
        <span
          className="shrink-0 flex items-center justify-center rounded-[10px] w-[38px] h-[38px] mt-0.5"
          style={{
            background: hasBlocked ? "oklch(0.6 0.24 27 / 0.16)" : "oklch(0.75 0.18 80 / 0.16)",
          }}
        >
          <AlertTriangle
            className="h-5 w-5"
            style={{ color: hasBlocked ? "oklch(0.6 0.24 27)" : "oklch(0.75 0.18 80)" }}
          />
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2.5">

          {/* ② Headline */}
          <p className="font-bold text-[14.5px] leading-snug text-foreground" style={{ textWrap: "pretty" } as React.CSSProperties}>
            พบ{" "}
            <span
              className="tabular-nums"
              style={{ color: hasBlocked ? "oklch(0.6 0.24 27)" : "oklch(0.75 0.18 80)" }}
            >
              {problem.length}
            </span>{" "}
            บัญชี Business Manager ที่เชื่อมต่อมีปัญหา — ข้อมูลที่แสดงอาจไม่เป็นปัจจุบัน
          </p>

          {/* ③ Account chips */}
          <div className="flex flex-wrap gap-2">
            {problem.map((b, idx) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium bg-card border border-border"
              >
                {/* avatar */}
                <span
                  className={`inline-flex items-center justify-center rounded-full w-[22px] h-[22px] text-[10px] font-bold text-white shrink-0 ${avatarColor(idx)}`}
                >
                  {initials(b.name || b.bmId)}
                </span>
                <span className="text-foreground">{b.name || b.bmId}</span>
                <span className="w-px h-3 bg-border shrink-0" aria-hidden="true" />
                <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="text-muted-foreground">{statusText(b.status)}</span>
              </span>
            ))}
          </div>

          {/* ④ Description */}
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            Meta บล็อกการเข้าถึง API ของบัญชีเหล่านี้ชั่วคราว เมื่อแก้ไขแล้วข้อมูลจะ{" "}
            <b className="text-foreground font-semibold">Sync กลับมาแสดงอัตโนมัติ</b> ในรอบถัดไป
          </p>

          {/* ⑤ Detail expandable */}
          {expanded && (
            <div
              className="rounded-lg p-3 space-y-2 text-[12.5px]"
              style={{
                border: "1px dashed oklch(0.9 0.01 265)",
                background: "oklch(0 0 0 / 0.025)",
              }}
            >
              {[
                <>ยืนยันธุรกิจ (<b>Business Verification</b>) ใน Meta Business Manager ให้เรียบร้อย</>,
                <>เปิดการยืนยันตัวตนสองชั้น (<b>2FA</b>) ของบัญชีผู้ดูแล</>,
                <>กลับมาที่หน้านี้แล้วกด Sync — ระบบจะดึงข้อมูลล่าสุดให้ภายใน 5 นาที</>,
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5 text-muted-foreground">
                  <span
                    className="shrink-0 inline-flex items-center justify-center rounded-full w-5 h-5 text-[10px] font-mono font-bold text-white mt-px"
                    style={{ background: hasBlocked ? "oklch(0.6 0.24 27)" : "oklch(0.75 0.18 80)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          )}

          {/* ⑥ Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Link
              href="/accounts"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-white transition-all active:scale-[0.97]"
              style={{
                background: hasBlocked ? "oklch(0.6 0.24 27)" : "oklch(0.75 0.18 80)",
                minHeight: "36px",
                whiteSpace: "nowrap",
              }}
            >
              <Settings className="h-3.5 w-3.5" />
              ไปหน้าจัดการบัญชี
              <ExternalLink className="h-3 w-3" />
            </Link>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground transition-colors"
              style={{ minHeight: "36px" }}
            >
              {expanded ? "ซ่อนวิธีแก้ไข" : "ดูวิธีแก้ไข"}
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform duration-200"
                style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
          </div>
        </div>

        {/* ⑦ Dismiss */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="ปิด"
          className="shrink-0 rounded-md w-[30px] h-[30px] flex items-center justify-center transition-colors hover:bg-destructive/10 mt-0.5"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
