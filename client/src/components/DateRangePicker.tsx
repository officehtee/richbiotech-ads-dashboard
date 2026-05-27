import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRangeInput, DatePreset } from "@shared/types";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "3d", label: "3 วันล่าสุด" },
  { key: "7d", label: "7 วัน" },
  { key: "14d", label: "14 วัน" },
  { key: "30d", label: "30 วัน" },
  { key: "custom", label: "กำหนดเอง" },
];

export type DateRangePickerProps = {
  value: DateRangeInput;
  onChange: (v: DateRangeInput) => void;
};

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [from, setFrom] = useState<Date | undefined>(
    value.since ? new Date(value.since) : undefined,
  );
  const [to, setTo] = useState<Date | undefined>(
    value.until ? new Date(value.until) : undefined,
  );

  const fmt = (d?: Date) => (d ? d.toISOString().slice(0, 10) : "");

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
            onClick={() => {
              if (p.key === "custom") {
                setCustomOpen(true);
              } else {
                onChange({ preset: p.key });
              }
            }}
          >
            {p.label}
          </Button>
        );
      })}
      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={value.preset === "custom" ? "default" : "ghost"}
            size="sm"
            className="gap-1"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {value.preset === "custom" && value.since && value.until ? (
              <span className="text-xs">
                {value.since} → {value.until}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="flex gap-3 flex-wrap">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">เริ่มต้น</p>
              <Calendar mode="single" selected={from} onSelect={setFrom} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">สิ้นสุด</p>
              <Calendar mode="single" selected={to} onSelect={setTo} />
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
