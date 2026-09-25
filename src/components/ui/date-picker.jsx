import * as React from "react";
import { format, addDays, addMonths, isSameDay } from "date-fns";
import { uz } from "date-fns/locale";
import { CalendarDays, X, ChevronDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Doctor Vita Zamonaviy Mukammal DatePicker
 * @param {string|Date} value - "YYYY-MM-DD" yoki Date
 * @param {function} onChange - (isoString: string) => void
 * @param {string|Date} min - minimal sana
 * @param {string|Date} max - maksimal sana
 * @param {boolean} clearable - tozalash tugmasi
 * @param {boolean} showPresets - tezkor tanlovlar ("Bugun", "Ertaga", "+3 kun", "+1 hafta")
 * @param {string} placeholder - matn
 * @param {string} className - trigger class
 * @param {string} testId - test id
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  clearable = true,
  showPresets = true,
  placeholder = "Sana tanlang",
  className,
  testId,
  disabled = false,
  formatStr = "d-MMMM, yyyy",
  presets,
  ...props
}) {
  const [open, setOpen] = React.useState(false);

  // Qiymatni Date obyektiga o'tkazish
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? undefined : value;
    }
    if (typeof value === "string") {
      const parsed = new Date(`${value.split("T")[0]}T00:00:00`);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  }, [value]);

  const minDate = React.useMemo(() => {
    if (!min) return undefined;
    if (min instanceof Date) return min;
    const parsed = new Date(`${min.split("T")[0]}T00:00:00`);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }, [min]);

  const maxDate = React.useMemo(() => {
    if (!max) return undefined;
    if (max instanceof Date) return max;
    const parsed = new Date(`${max.split("T")[0]}T00:00:00`);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }, [max]);

  const defaultPresets = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list = [
      { label: "Bugun", date: today },
      { label: "Ertaga", date: addDays(today, 1) },
      { label: "+3 kun", date: addDays(today, 3) },
      { label: "+1 hafta", date: addDays(today, 7) },
      { label: "+1 oy", date: addMonths(today, 1) },
    ];

    if (minDate) {
      return list.filter((p) => p.date >= minDate);
    }
    return list;
  }, [minDate]);

  const activePresets = presets || defaultPresets;

  const handleSelect = (selected) => {
    if (!selected) {
      if (clearable) onChange?.("");
      setOpen(false);
      return;
    }
    const iso = format(selected, "yyyy-MM-dd");
    onChange?.(iso);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "group h-10 w-full min-w-[150px] rounded-xl border border-line bg-white px-3 text-left text-sm transition-all duration-150",
            "flex items-center justify-between gap-2 shadow-2xs hover:border-rose/50 hover:bg-[#FAF9F5] focus:outline-none focus:ring-2 focus:ring-rose/25",
            disabled && "opacity-50 cursor-not-allowed bg-cream/40",
            open && "border-rose ring-2 ring-rose/20",
            className,
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0 truncate">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-rose flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarDays className="w-3.5 h-3.5 text-rose" />
            </div>
            <span
              className={cn(
                "truncate font-medium text-xs",
                dateValue ? "text-noir font-semibold" : "text-stone/75 font-normal",
              )}
            >
              {dateValue
                ? format(dateValue, formatStr, { locale: uz })
                : placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {clearable && dateValue && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                title="Sanani tozalash"
                className="p-1 rounded-md text-stone/50 hover:text-destructive hover:bg-red-50 transition-colors"
              >
                <X className="w-3 h-3" />
              </span>
            )}
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-stone/60 transition-transform duration-200",
                open && "rotate-180 text-rose",
              )}
            />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto p-0 border border-line/80 shadow-[0_16px_38px_-10px_rgba(16,48,42,0.18)] rounded-2xl bg-white overflow-hidden animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
      >
        {showPresets && activePresets && activePresets.length > 0 && (
          <div className="p-2.5 bg-[#FAF9F5] border-b border-line/60 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-semibold text-stone uppercase tracking-wider px-1">
              Tezkor:
            </span>
            {activePresets.map((preset, idx) => {
              const isActive = dateValue && isSameDay(preset.date, dateValue);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(preset.date)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all",
                    isActive
                      ? "bg-rose text-white shadow-2xs font-semibold"
                      : "bg-white border border-line/70 text-stone hover:text-noir hover:bg-cream hover:border-stone/40",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}

        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          fromDate={minDate}
          toDate={maxDate}
          disabled={(d) => {
            if (minDate && d < minDate) return true;
            if (maxDate && d > maxDate) return true;
            return false;
          }}
          showFooter={true}
          showQuickActions={true}
          onClear={clearable && dateValue ? () => handleSelect(undefined) : undefined}
          className="border-0 shadow-none rounded-none p-3.5"
          initialFocus
          {...props}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Doctor Vita Zamonaviy Sana Oralig'i (DateRangePicker)
 */
export function DateRangePicker({
  value, // { from: "YYYY-MM-DD", to: "YYYY-MM-DD" } yoki Date obyektlari
  onChange, // ({ from: "YYYY-MM-DD", to: "YYYY-MM-DD" }) => void
  placeholder = "Sana oralig'ini tanlang",
  className,
  clearable = true,
  disabled = false,
}) {
  const [open, setOpen] = React.useState(false);

  const rangeValue = React.useMemo(() => {
    if (!value) return undefined;
    const from = value.from
      ? value.from instanceof Date
        ? value.from
        : new Date(`${value.from.split("T")[0]}T00:00:00`)
      : undefined;
    const to = value.to
      ? value.to instanceof Date
        ? value.to
        : new Date(`${value.to.split("T")[0]}T00:00:00`)
      : undefined;
    return { from, to };
  }, [value]);

  const handleSelect = (range) => {
    if (!range) {
      onChange?.({ from: "", to: "" });
      return;
    }
    const fromIso = range.from ? format(range.from, "yyyy-MM-dd") : "";
    const toIso = range.to ? format(range.to, "yyyy-MM-dd") : "";
    onChange?.({ from: fromIso, to: toIso });
    if (range.from && range.to) {
      setOpen(false);
    }
  };

  const displayText = React.useMemo(() => {
    if (!rangeValue?.from) return placeholder;
    const fromStr = format(rangeValue.from, "d-MMM", { locale: uz });
    if (!rangeValue.to) return `${fromStr} - ...`;
    const toStr = format(rangeValue.to, "d-MMM, yyyy", { locale: uz });
    return `${fromStr} - ${toStr}`;
  }, [rangeValue, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "group h-10 w-full min-w-[200px] rounded-xl border border-line bg-white px-3 text-left text-sm transition-all duration-150",
            "flex items-center justify-between gap-2 shadow-2xs hover:border-rose/50 hover:bg-[#FAF9F5] focus:outline-none focus:ring-2 focus:ring-rose/25",
            disabled && "opacity-50 cursor-not-allowed bg-cream/40",
            open && "border-rose ring-2 ring-rose/20",
            className,
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0 truncate">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-rose flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarDays className="w-3.5 h-3.5 text-rose" />
            </div>
            <span
              className={cn(
                "truncate font-medium text-xs",
                rangeValue?.from ? "text-noir font-semibold" : "text-stone/75 font-normal",
              )}
            >
              {displayText}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {clearable && rangeValue?.from && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange?.({ from: "", to: "" });
                }}
                title="Oraliqni tozalash"
                className="p-1 rounded-md text-stone/50 hover:text-destructive hover:bg-red-50 transition-colors"
              >
                <X className="w-3 h-3" />
              </span>
            )}
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-stone/60 transition-transform duration-200",
                open && "rotate-180 text-rose",
              )}
            />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto p-0 border border-line/80 shadow-[0_16px_38px_-10px_rgba(16,48,42,0.18)] rounded-2xl bg-white overflow-hidden animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
      >
        <Calendar
          mode="range"
          selected={rangeValue}
          onSelect={handleSelect}
          numberOfMonths={2}
          className="border-0 shadow-none rounded-none p-4"
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
