export function formatNumber(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return "—";
  return `฿${formatNumber(n, decimals)}`;
}

export function formatPercent(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return "—";
  return `${formatNumber(n, decimals)}%`;
}

export function formatRoas(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return "—";
  return formatNumber(n, decimals);
}

export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${formatNumber(n / 1_000_000, 1)}M`;
  if (Math.abs(n) >= 1_000) return `${formatNumber(n / 1_000, 1)}K`;
  return formatNumber(n, 0);
}

export function getRoasStatusClass(roas: number, target: number): string {
  if (!Number.isFinite(roas)) return "text-muted-foreground";
  if (roas >= target) return "text-emerald-600 dark:text-emerald-400";
  if (roas >= target * 0.75) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const bom = "\uFEFF"; // for Excel UTF-8
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function periodKeyForToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function periodKeyToLabel(key: string): string {
  const [y, m] = key.split("-");
  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
    "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
    "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  const monthIdx = parseInt(m, 10) - 1;
  return `${months[monthIdx] ?? m} ${y}`;
}

/**
 * Convert a date preset / custom range to { dateFrom, dateTo } YYYY-MM-DD pair (local timezone).
 * Used by Deep Ads Analysis (and any page where backend needs string dates).
 */
export function presetToDateRange(
  preset: string,
  since?: string,
  until?: string,
): { dateFrom: string; dateTo: string } {
  if (preset === "custom" && since && until) return { dateFrom: since, dateTo: until };
  const map: Record<string, number> = { "1d": 1, "3d": 3, "7d": 7, "14d": 14, "30d": 30 };
  const days = map[preset] ?? 7;
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - days + 1);
  return { dateFrom: fmt(from), dateTo: fmt(today) };
}

/**
 * Format a YYYY-MM-DD date string to Thai short label (e.g., "31 พ.ค.")
 */
export function formatDateShortTh(s: string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const month = months[parseInt(m[2], 10) - 1] ?? m[2];
  return `${parseInt(m[3], 10)} ${month}`;
}
