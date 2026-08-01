"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full h-9",
        caption_label: "text-sm font-semibold text-zf-text capitalize",
        button_previous: "absolute left-1 h-7 w-7 flex items-center justify-center rounded-lg text-zf-text-muted hover:text-zf-text hover:bg-zinc-100 transition-colors",
        button_next: "absolute right-1 h-7 w-7 flex items-center justify-center rounded-lg text-zf-text-muted hover:text-zf-text hover:bg-zinc-100 transition-colors",
        weekdays: "flex",
        weekday: "text-zf-text-muted rounded-md w-9 font-normal text-[0.7rem] uppercase tracking-wider text-center",
        weeks: "flex flex-col gap-1",
        week: "flex w-full mt-0",
        day: cn(
          "relative p-0 text-center text-xs",
          "[&:has([aria-selected])]:bg-zinc-100 rounded-md"
        ),
        day_button: cn(
          "h-9 w-9 p-0 font-normal text-zf-text hover:bg-zinc-100 rounded-md transition-colors",
          "[.rdp-selected_&]:bg-zinc-800 [.rdp-selected_&]:text-white [.rdp-selected_&]:hover:bg-zinc-700",
          "[.rdp-today_&]:font-bold [.rdp-today_&]:text-zinc-800"
        ),
        outside: "text-zf-text-muted opacity-30",
        disabled: "text-zf-text-muted opacity-30",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
