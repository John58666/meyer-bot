"use client"

import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Props {
  selectedDay: string
  onSelectDay: (day: string) => void
  onPrevWeek: () => void
  onNextWeek: () => void
}

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
}

function getWeekDays(referenceDate: string): { date: string; label: string; short: string }[] {
  const ref = new Date(referenceDate + "T00:00:00")
  const day = ref.getDay()
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - (day === 0 ? 6 : day - 1))

  const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dow = d.getDay()
    return {
      date: dateStr,
      label: `${DAYS_SHORT[dow]} ${d.getDate()}`,
      short: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`,
    }
  })
}

export function DayStripV2({ selectedDay, onSelectDay, onPrevWeek, onNextWeek }: Props) {
  const days = getWeekDays(selectedDay)
  const today = todayISO()

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onPrevWeek}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zinc-100 active:scale-[0.97]"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex flex-1 gap-1 overflow-x-auto">
        {days.map((d) => {
          const isSelected = d.date === selectedDay
          const isToday = d.date === today
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onSelectDay(d.date)}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg px-3 py-1.5 text-center transition-all active:scale-[0.97] min-w-[56px]",
                isSelected
                  ? "bg-zinc-800 text-white shadow-sm"
                  : isToday
                    ? "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300"
                    : "text-zf-text-secondary hover:bg-zinc-100"
              )}
            >
              <span className="text-[10px] font-medium uppercase leading-none">{d.label}</span>
              <span className="text-[9px] leading-none mt-0.5 opacity-60">{d.short}</span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onNextWeek}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zinc-100 active:scale-[0.97]"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
