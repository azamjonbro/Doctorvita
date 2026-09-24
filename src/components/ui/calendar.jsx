import * as React from "react";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      locale={uz}
      weekStartsOn={1}
      formatters={{
        formatCaption: (date) => format(date, "LLLL yyyy", { locale: uz }),
        formatWeekdayName: (date) => format(date, "EEE", { locale: uz }),
      }}
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-4 rounded-[28px] border border-[#d9d2ca] bg-[#f6f3f0] shadow-[0_10px_28px_rgba(26,31,28,0.08)]",
        className,
      )}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "relative flex items-center justify-center pt-1 pb-3",
        caption_label:
          "text-[28px] font-semibold tracking-[-0.04em] text-[#1f2b27]",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between px-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-9 border-[#d2cbc3] bg-transparent p-0 text-[#1f2b27] hover:bg-[#eef3ef] hover:border-[#b8c4bd]",
        ),
        nav_button_previous: "left-0",
        nav_button_next: "right-0",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell:
          "flex h-10 flex-1 items-center justify-center rounded-md text-[#4b5a53] text-[0.78rem] font-medium uppercase",
        row: "mt-2 flex w-full",
        cell: cn(
          "relative flex-1 p-0 text-center text-sm focus-within:relative focus-within:z-20",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 text-base font-normal text-[#1f2b27] rounded-lg aria-selected:opacity-100 hover:bg-[#edf2ee] hover:text-[#1f2b27]",
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-[#2e7d63] text-white font-semibold hover:bg-[#2a705a] hover:text-white focus:bg-[#2e7d63] focus:text-white",
        day_today: "bg-[#edf2ee] text-[#1f2b27] ring-1 ring-[#d9e3dd]",
        day_outside:
          "day-outside text-[#a2a9a5] opacity-80 aria-selected:bg-[#2e7d63]/80 aria-selected:text-white",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-[#e5f0eb] aria-selected:text-[#1f2b27]",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
