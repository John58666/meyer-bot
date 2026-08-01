"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarDays, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface Props {
  date: Date
  onSelect: (date: Date) => void
  className?: string
}

export function DatePickerPopoverV2({ date, onSelect, className }: Props) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (selected: Date | undefined) => {
    if (selected) {
      onSelect(selected)
      setOpen(false)
    }
  }

  const today = new Date()
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Seleccionar fecha, actual: ${format(date, "d 'de' MMMM, yyyy", { locale: es })}`}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-zf-border bg-white px-4 py-2 text-sm font-semibold text-zf-text",
            "transition-colors hover:bg-zinc-50 active:scale-[0.97]",
            "min-w-[180px] justify-between",
            className
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-zinc-700" />
            <span className="capitalize">
              {isToday ? "Hoy" : format(date, "d 'de' MMMM", { locale: es })}
              <span className="hidden text-zf-text-secondary sm:inline">
                , {date.getFullYear()}
              </span>
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-zf-text-muted transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          month={date}
          locale={es}
          weekStartsOn={1}
          footer={
            <button
              type="button"
              onClick={() => handleSelect(new Date())}
              className="mt-2 w-full rounded-lg border border-zf-border bg-white py-1.5 text-xs font-semibold text-zf-text-secondary transition-colors hover:bg-zinc-100"
            >
              Ir a Hoy
            </button>
          }
        />
      </PopoverContent>
    </Popover>
  )
}
