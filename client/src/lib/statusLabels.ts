/**
 * Phase 3A — client wrapper สำหรับ mapping effective_status
 * logic หลักอยู่ที่ @shared/statusLabels (pure, unit test ได้)
 * ไฟล์นี้เพิ่มเฉพาะคลาส Tailwind ของ badge ตามโทนสี
 */
export {
  getDisplayStatus,
  getStatusCsvText,
  STATUS_MAP,
  type StatusTone,
  type DisplayStatus,
} from "@shared/statusLabels";

import type { StatusTone } from "@shared/statusLabels";

/** คลาส Tailwind ของ badge ตามโทนสี (รองรับ light/dark) */
export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  green:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  red: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  yellow:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  orange:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  gray: "bg-muted text-muted-foreground border-border",
};
