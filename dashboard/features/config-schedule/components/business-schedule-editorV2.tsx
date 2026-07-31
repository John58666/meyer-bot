"use client"

import { useState, useEffect } from "react"
import {
  getBusinessScheduleV2,
  saveBusinessScheduleV2,
} from "../actionsV2"
import type { ScheduleData } from "../actionsV2"
import {
  Clock,
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Lock,
  RotateCcw,
  CalendarDays,
} from "lucide-react"

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
]
const HOURS = Array.from({ length: 25 }, (_, i) => i)
const DEFAULT_OPEN_HOUR = 9
const DEFAULT_CLOSE_HOUR = 19
const SUCCESS_FEEDBACK_MS = 3000

interface Props {
  businessId: number
}

export function BusinessScheduleEditorV2({ businessId }: Props) {
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<ScheduleData>({})
  const [draft, setDraft] = useState<ScheduleData>({})
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await getBusinessScheduleV2(businessId)
      if (cancelled) return
      if (res.error) {
        setError(res.error)
      } else if (res.schedule) {
        setSchedule(res.schedule)
        setDraft({ ...res.schedule })
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [businessId])

  function toggleDay(day: number) {
    setDraft((prev) => {
      const next = { ...prev }
      if (next[String(day)]) {
        delete next[String(day)]
      } else {
        next[String(day)] = { open: DEFAULT_OPEN_HOUR, close: DEFAULT_CLOSE_HOUR }
      }
      return next
    })
    setSaved(false)
  }

  function updateHour(day: number, field: "open" | "close", value: number) {
    setDraft((prev) => {
      const next = { ...prev }
      const entry = next[String(day)]
      if (entry) {
        next[String(day)] = { ...entry, [field]: value }
      }
      return next
    })
    setSaved(false)
  }

  function hasErrors(): boolean {
    for (const [, hs] of Object.entries(draft)) {
      if (hs.close <= hs.open) return true
    }
    return false
  }

  function hasChanges(): boolean {
    const orig = new Set(Object.keys(schedule))
    const curr = new Set(Object.keys(draft))
    for (const key of orig) {
      if (!curr.has(key)) return true
      const o = schedule[key]
      const c = draft[key]
      if (!c || o.open !== c.open || o.close !== c.close) return true
    }
    for (const key of curr) {
      if (!orig.has(key)) return true
    }
    return false
  }

  async function handleSave() {
    if (hasErrors()) return
    setSaving(true)
    setError("")

    const res = await saveBusinessScheduleV2(businessId, draft)
    setSaving(false)

    if (res.error) {
      setError(res.error)
    } else {
      setSchedule({ ...draft })
      setSaved(true)
      setTimeout(() => setSaved(false), SUCCESS_FEEDBACK_MS)
    }
  }

  async function handleDiscard() {
    setDraft({ ...schedule })
    setError("")
    setSaved(false)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zf-border/50 bg-zf-surface p-6">
        <div className="h-5 w-1/3 rounded bg-zf-border/30" />
        <div className="space-y-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-6 w-10 rounded bg-zf-border/20" />
              <div className="h-6 w-24 rounded bg-zf-border/20" />
              <div className="h-9 flex-1 rounded-lg bg-zf-border/20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zf-border/50 bg-zf-surface">
      <div className="flex items-center gap-3 border-b border-zf-border/40 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zf-accent-bg">
          <Clock className="h-4 w-4 text-zf-accent-text" />
        </div>
        <h3 className="text-sm font-semibold text-zf-text">
          Horario Semanal Base
        </h3>
        {schedule && Object.keys(schedule).length === 0 && (
          <span className="rounded-full bg-zf-warning-bg px-2.5 py-0.5 text-xs font-medium text-zf-warning-text">
            Sin configurar
          </span>
        )}
      </div>

      <div className="p-6">
        <div className="flex flex-col">
          {DAY_ORDER.map((day) => {
            const hs = draft[String(day)]
            const isOpen = hs != null

            return (
              <div
                key={day}
                className={[
                  "flex items-center gap-4 border-b border-zf-border/30 px-2 py-3 last:border-b-0 rounded-lg transition-colors",
                  !isOpen ? "bg-zf-bg/80" : "hover:bg-zf-accent-bg/20",
                ].join(" ")}
              >
                <label className="relative inline-flex cursor-pointer items-center shrink-0">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={() => toggleDay(day)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-zf-border after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-zf-primary peer-checked:after:translate-x-5" />
                </label>

                <span
                  className={[
                    "w-20 text-sm font-medium shrink-0",
                    isOpen ? "text-zf-text" : "text-zf-text-muted",
                  ].join(" ")}
                >
                  {DAY_LABELS[day]}
                </span>

                {isOpen && hs ? (
                  <div className="flex flex-1 items-center gap-2">
                    <select
                      value={hs.open}
                      onChange={(e) =>
                        updateHour(day, "open", parseInt(e.target.value))
                      }
                      className="rounded-lg border border-zf-border bg-white px-3 py-2 text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
                    >
                      {HOURS.filter((h) => h < (hs.close ?? 24)).map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-zf-text-secondary">a</span>
                    <select
                      value={hs.close}
                      onChange={(e) =>
                        updateHour(day, "close", parseInt(e.target.value))
                      }
                      className="rounded-lg border border-zf-border bg-white px-3 py-2 text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
                    >
                      {HOURS.filter((h) => h > (hs.open ?? 0)).map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="flex flex-1 items-center gap-2 rounded-lg bg-zf-bg/80 px-3 py-2 text-xs font-medium text-zf-text-muted">
                    <Lock className="h-3 w-3" />
                    Cerrado
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-zf-error-bg/50 px-4 py-3 text-xs text-zf-error-text">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-zf-border/40 bg-zf-bg/60 px-6 py-4 rounded-b-xl">
        <div className="flex items-center gap-2 text-xs text-zf-text-muted">
          <CalendarDays className="h-3.5 w-3.5" />
          {Object.keys(draft).length} de 7 días abiertos
        </div>

        <div className="flex items-center gap-3">
          {hasChanges() && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl border border-zf-border px-4 py-2 text-xs font-semibold text-zf-text-secondary transition-all hover:bg-zf-accent-bg disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Descartar
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={
              saving || hasErrors() || !hasChanges()
            }
            className={[
              "flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold transition-all disabled:opacity-50",
              saved
                ? "bg-zf-success-bg text-zf-success-text"
                : "bg-zf-primary text-white hover:opacity-90",
            ].join(" ")}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Guardando...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                ¡Actualizado!
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Guardar Horario
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
