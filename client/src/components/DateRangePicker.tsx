import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRangeInput, DatePreset } from "@shared/types";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { th } from "date-fns/locale";

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "วันนี้" },
  { key: "yesterday", label: "เมื่อวาน" },
  { key: "3d", label: "3 วัน" },
  { key: "7d", label: "7 วัน" },
  { key: "14d", label: "14 วัน" },
  { key: "30d", label: "30 วัน" },
];

export type DateRangePickerProps = {
  value: DateRangeInput;
  onChange: (v: DateRangeInput) => void;
};

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [customOpen, setCustomOpen] = useState(false);
  // Parse YYYY-MM-DD as local-date (ไม่ตีความเป็น UTC midnight ซึ่งจะ shift ไป shift มาตาม timezone)
  const parseLocalDate = (s?: string): Date | undefined => {
    if (!s) return undefined;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return new Date(s);
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  };

  const [from, setFrom] = useState<Date | undefined>(parseLocalDate(value.since));
  const [to, setTo] = useState<Date | undefined>(parseLocalDate(value.until));

  // Format Date → YYYY-MM-DD ตามเขตเวลาท้องถิ่น (ไม่ใช้ toISOString ที่ shift เป็น UTC)
  const fmt = (d?: Date) => {
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESETS.map((p) => {
        const active = value.preset === p.key;
        return (
          <Button
            key={p.key}
            variant={active ? "default" : "outline"}
            size="sm"
            className={active ? "" : "bg-background"}
            onClick={() => onChange({ preset: p.key })}
          >
            {p.label}
          </Button>
        );
      })}
      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={value.preset === "custom" ? "default" : "outline"}
            size="sm"
            className={value.preset === "custom" ? "gap-1" : "gap-1 bg-background"}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {value.preset === "custom" && value.since && value.until ? (
              <span className="text-xs">
                {value.since} → {value.until}
              </span>
            ) : (
              <span>กำหนดเอง</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="flex gap-3 flex-wrap">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">เริ่มต้น</p>
              <Calendar mode="single" selected={from} onSelect={setFrom} locale={th} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">สิ้นสุด</p>
              <Calendar mode="single" selected={to} onSelect={setTo} locale={th} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => setCustomOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              size="sm"
              disabled={!from || !to}
              onClick={() => {
                if (from && to) {
                  onChange({ preset: "custom", since: fmt(from), until: fmt(to) });
                  setCustomOpen(false);
                }
              }}
            >
              ตกลง
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
