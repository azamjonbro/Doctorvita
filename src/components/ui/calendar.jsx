import * as React from "react";
import { format, isToday } from "date-fns";
import { uz } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, RotateCcw, CalendarCheck2 } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * Doctor Vita Zamonaviy Mukammal Kalendar Komponenti
 * React Day Picker v9 to'liq qo'llab-quvvatlanadi
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  showFooter = false,
  showQuickActions = false,
  onClear,
  ...props
}) {
  const selectedDate = React.useMemo(() => {
    if (!props.selected) return undefined;
    if (props.selected instanceof Date && !isNaN(props.selected.getTime())) return props.selected;
    if (typeof props.selected === "string") {
      const parsed = new Date(props.selected.includes("T") ? props.selected : `${props.selected}T00:00:00`);
      return !isNaN(parsed.getTime()) ? parsed : undefined;
    }
    if (typeof props.selected === "object" && props.selected?.from instanceof Date) {
      return props.selected.from;
    }
    return undefined;
  }, [props.selected]);

  return (
    <div className={cn("p-3.5 bg-white rounded-2xl border border-line/80 shadow-[0_12px_32px_-8px_rgba(16,48,42,0.12)] w-fit", className)}>
      <DayPicker
        locale={uz}
        weekStartsOn={1}
        formatters={{
          formatCaption: (date) => {
            const formatted = format(date, "LLLL yyyy", { locale: uz });
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
          },
          formatWeekdayName: (date) => format(date, "EEEEEE", { locale: uz }),
        }}
        showOutsideDays={showOutsideDays}
        className="w-full"
        classNames={{
          root: "w-full",
          months: "flex flex-col sm:flex-row gap-4",
          month: "space-y-3.5",
          month_caption: "relative flex items-center justify-center pt-1 pb-2 px-1",
          caption_label: "text-sm font-semibold tracking-tight text-noir select-none capitalize",
          nav: "absolute inset-x-0 top-1 flex items-center justify-between px-1 pointer-events-none",
          button_previous: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 p-0 rounded-lg border border-line/70 bg-white/90 text-stone hover:text-noir hover:bg-cream hover:border-stone/30 pointer-events-auto transition-all active:scale-95 shadow-2xs flex items-center justify-center",
          ),
          button_next: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 p-0 rounded-lg border border-line/70 bg-white/90 text-stone hover:text-noir hover:bg-cream hover:border-stone/30 pointer-events-auto transition-all active:scale-95 shadow-2xs flex items-center justify-center",
          ),
          month_grid: "w-full border-collapse select-none",
          weekdays: "flex w-full mb-1.5 border-b border-line/50 pb-1.5",
          weekday:
            "flex-1 text-center text-[11px] font-semibold uppercase tracking-wider text-stone/75 select-none",
          weeks: "space-y-1",
          week: "flex w-full mt-1 justify-between",
          day: "relative h-9 w-9 p-0 text-center text-sm flex-1 flex items-center justify-center focus-within:relative focus-within:z-20",
          day_button: cn(
            "h-8 w-8 p-0 font-medium text-xs text-noir rounded-xl transition-all duration-150 flex items-center justify-center mx-auto",
            "hover:bg-emerald-50 hover:text-rose hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose/40",
          ),
          selected:
            "[&>button]:!bg-gradient-to-br [&>button]:!from-[#2E7D63] [&>button]:!to-[#205845] [&>button]:!text-white [&>button]:font-semibold [&>button]:shadow-sm [&>button]:shadow-rose/30 [&>button]:hover:!brightness-105",
          today:
            "[&>button]:font-bold [&>button]:text-rose [&>button]:ring-1.5 [&>button]:ring-rose/40 [&>button]:bg-emerald-50/40 relative [&>button]:after:content-[''] [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:w-1 [&>button]:after:h-1 [&>button]:after:bg-rose [&>button]:after:rounded-full",
          outside:
            "opacity-35 text-stone/40 [&>button]:hover:bg-transparent [&>button]:hover:text-stone/60",
          disabled:
            "opacity-20 cursor-not-allowed pointer-events-none text-stone/40 [&>button]:line-through",
          range_start:
            "rounded-l-xl bg-emerald-50/90 [&>button]:!bg-gradient-to-br [&>button]:!from-[#2E7D63] [&>button]:!to-[#205845] [&>button]:!text-white [&>button]:rounded-xl [&>button]:shadow-sm",
          range_end:
            "rounded-r-xl bg-emerald-50/90 [&>button]:!bg-gradient-to-br [&>button]:!from-[#2E7D63] [&>button]:!to-[#205845] [&>button]:!text-white [&>button]:rounded-xl [&>button]:shadow-sm",
          range_middle:
            "bg-emerald-50/70 [&>button]:!bg-transparent [&>button]:!text-emerald-950 [&>button]:font-medium [&>button]:rounded-none [&>button]:hover:!bg-emerald-100/60",
          hidden: "invisible",
          ...classNames,
        }}
        components={{
          Chevron: ({ orientation, className: chevronClass, ...rest }) => {
            const Component =
              orientation === "left"
                ? ChevronLeft
                : orientation === "right"
                ? ChevronRight
                : orientation === "up"
                ? ChevronUp
                : ChevronDown;
            return <Component className={cn("h-4 w-4", chevronClass)} {...rest} />;
          },
        }}
        {...props}
      />

      {(showFooter || showQuickActions || onClear) && (
        <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between gap-2 text-xs">
          <div className="text-stone flex items-center gap-1.5 text-[11px] truncate">
            {selectedDate ? (
              <>
                <CalendarCheck2 className="w-3.5 h-3.5 text-rose shrink-0" />
                <span className="text-noir font-medium truncate">
                  {format(selectedDate, "d-MMMM, yyyy", { locale: uz })}
                </span>
              </>
            ) : (
              <span className="text-stone/70">Sana belgilanmagan</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {showQuickActions && (
              <button
                type="button"
                onClick={() => {
                  if (props.onSelect) {
                    props.onSelect(new Date());
                  }
                }}
                className="px-2 py-1 rounded-md text-[11px] font-medium text-rose hover:bg-emerald-50 transition-colors"
              >
                Bugun
              </button>
            )}
            {onClear && selectedDate && (
              <button
                type="button"
                onClick={onClear}
                className="px-2 py-1 rounded-md text-[11px] font-medium text-stone hover:text-destructive hover:bg-red-50 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Tozalash
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
