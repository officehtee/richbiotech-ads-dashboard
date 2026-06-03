import { useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, X, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";

/** แมป status → ข้อความอ่านง่ายภาษาไทย */
const STATUS_LABEL: Record<string, string> = {
  blocked: "ถูก Meta บล็อกการเข้าถึง API",
  token_expired: "โทเค็นหมดอายุ",
  failed: "เชื่อมต่อล้มเหลว",
};

function statusText(status: string): string {
  return STATUS_LABEL[status] ?? `สถานะผิดปกติ (${status})`;
}

/**
 * แบนเนอร์เตือนเมื่อมี Business Manager ที่ไม่ได้อยู่สถานะ active
 * (blocked / token_expired / failed) — แสดงรายชื่อ BM ที่มีปัญหา
 * พร้อมลิงก์ไปหน้าจัดการบัญชี ผู้ใช้สามารถปิดแบนเนอร์ได้ (ปิดเฉพาะ session)
 */
export default function BmBlockedBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data: bms } = trpc.bm.list.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000, // refresh ทุก 5 นาที
    staleTime: 60 * 1000,
  });

  if (dismissed) return null;
  if (!bms || bms.length === 0) return null;

  const problem = bms.filter((b) => b.status !== "active");
  if (problem.length === 0) return null;

  // ถ้ามีบัญชีถูกบล็อกแม้แต่บัญชีเดียว ให้ถือว่าเป็นเตือนระดับสำคัญ (สีแดง)
  const hasBlocked = problem.some((b) => b.status === "blocked");

  const tone = hasBlocked
    ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
    : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";

  const iconTone = hasBlocked
    ? "text-red-500 dark:text-red-400"
    : "text-amber-500 dark:text-amber-400";

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${tone}`}
      role="alert"
    >
      <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${iconTone}`} />
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="font-semibold">
          พบบัญชี Business Manager ที่มีปัญหาการเชื่อมต่อ {problem.length} บัญชี
          — ข้อมูลที่แสดงอาจไม่เป็นปัจจุบัน
        </p>
        <ul className="space-y-0.5 text-[13px] leading-relaxed opacity-95">
          {problem.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-x-1.5">
              <span className="font-medium">{b.name || b.bmId}</span>
              <span className="opacity-80">— {statusText(b.status)}</span>
            </li>
          ))}
        </ul>
        <p className="text-[13px] opacity-90">
          {hasBlocked
            ? "กรุณาตรวจสอบการยืนยันธุรกิจ (Business Verification) และความปลอดภัย (2FA) ใน Meta Business Manager เมื่อ Meta อนุมัติแล้ว ข้อมูลจะกลับมาแสดงอัตโนมัติหลังการ Sync ครั้งถัดไป"
            : "กรุณาตรวจสอบและต่ออายุการเชื่อมต่อบัญชีในหน้าจัดการบัญชี"}
        </p>
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:opacity-80"
        >
          ไปหน้าจัดการบัญชี
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="ปิดการแจ้งเตือน"
        className="shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
