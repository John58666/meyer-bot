"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Props {
  selectedDay: string
  onSelectDay: (day: string) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  onGoToMonth?: (year: number, month: number) => void
  showMonthPicker?: boolean
}

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
}

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

function getWeekDays(referenceDate: string): { date: string; label: string }[] {
  const ref = new Date(referenceDate + "T00:00:00")
  const day = ref.getDay()
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - (day === 0 ? 6 : day - 1))

  const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      date: d.toISOString().slice(0, 10),
      label: `${DAYS_SHORT[d.getDay()]} ${d.getDate()}`,
    }
  })
}

export function DayStripV2({ selectedDay, onSelectDay, onPrevWeek, onNextWeek, onGoToMonth, showMonthPicker }: Props) {
  const days = getWeekDays(selectedDay)
  const today = todayISO()
  const [monthOpen, setMonthOpen] = useState(false)

  const ref = new Date(selectedDay + "T00:00:00")
  const currentMonth = ref.getMonth()
  const currentYear = ref.getFullYear()

  const handleSelectMonth = (monthIdx: number) => {
    setMonthOpen(false)
    onGoToMonth?.(currentYear, monthIdx)
  }

  return (
    <div className="relative flex items-center gap-1 w-full">
      <button
        type="button"
        onClick={onPrevWeek}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zinc-100 active:scale-[0.97]"
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
                "flex shrink-0 items-center justify-center rounded-lg px-3 py-2.5 text-center transition-all active:scale-[0.97]",
                isSelected
                  ? "bg-zinc-800 text-white shadow-sm"
                  : isToday
                    ? "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300"
                    : "text-zf-text-secondary hover:bg-zinc-100"
              )}
            >
              <span className="text-xs font-semibold">{d.label}</span>
            </button>
          )
        })}
      </div>

      {showMonthPicker && (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMonthOpen(!monthOpen)}
            className="flex items-center gap-1 rounded-lg border border-zf-border bg-white px-3 py-2 text-xs font-semibold text-zf-text transition-colors hover:bg-zinc-50 active:scale-[0.97]"
          >
            {MONTHS_ES[currentMonth]} {currentYear}
          </button>
          {monthOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMonthOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 rounded-xl border border-zf-border/40 bg-zf-surface p-3 shadow-lg">
                <div className="grid grid-cols-3 gap-1 w-64">
                  {MONTHS_ES.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMonth(i)}
                      className={cn(
                        "rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                        i === currentMonth
                          ? "bg-zinc-800 text-white"
                          : "text-zf-text-secondary hover:bg-zinc-100"
                      )}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onNextWeek}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary transition-colors hover:bg-zinc-100 active:scale-[0.97]"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
