"use client"

import { useState, useTransition, useEffect } from "react"
import {
  getTeamMemberScheduleV2,
  updateTeamMemberScheduleV2,
  resetTeamMemberScheduleV2,
} from "../actionsV2"
import type { ScheduleData } from "../actionsV2"
import { AlertCircle, Lock, Clock, CheckCircle2, Loader2, RotateCcw } from "lucide-react"

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const HOURS = Array.from({ length: 25 }, (_, i) => i)

interface Props {
  businessId: number
  professionalId: number
  memberName: string
}

export function TeamScheduleEditorV2({ businessId, professionalId, memberName }: Props) {
  const [loading, setLoading] = useState(true)
  const [hasCustom, setHasCustom] = useState(false)
  const [customSchedule, setCustomSchedule] = useState<ScheduleData>({})
  const [businessSchedule, setBusinessSchedule] = useState<ScheduleData>({})
  const [mode, setMode] = useState<"inherited" | "custom">("inherited")
  const [draft, setDraft] = useState<ScheduleData>({})
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    async function fetchSchedule() {
      const res = await getTeamMemberScheduleV2(businessId, professionalId)
      if (cancelled) return
      setError("")
      if (res.error) {
        setError(res.error)
      } else {
        setHasCustom(res.hasCustom)
        setCustomSchedule(res.schedule ?? {})
        setBusinessSchedule(res.businessSchedule)
        setMode(res.hasCustom ? "custom" : "inherited")
        setDraft(res.hasCustom ? res.schedule ?? {} : res.businessSchedule)
      }
      setLoading(false)
    }
    fetchSchedule()
    return () => { cancelled = true }
  }, [businessId, professionalId])

  function toggleDay(day: number) {
    if (mode === "inherited") return
    setDraft((prev) => {
      const next = { ...prev }
      if (next[String(day)]) {
        delete next[String(day)]
      } else {
        next[String(day)] = { open: 9, close: 19 }
      }
      return next
    })
    setSaved(false)
  }

  function updateHour(day: number, field: "open" | "close", value: number) {
    if (mode === "inherited") return
    setDraft((prev) => {
      const next = { ...prev }
      if (next[String(day)]) {
        next[String(day)] = { ...next[String(day)], [field]: value }
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

  async function handleSave() {
    if (mode === "inherited") {
      if (hasCustom) {
        startTransition(async () => {
          setSaving(true)
          const res = await resetTeamMemberScheduleV2(businessId, professionalId)
          setSaving(false)
          if (res.error) {
            setError(res.error)
          } else {
            setHasCustom(false)
            setCustomSchedule({})
            setDraft(businessSchedule)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
          }
        })
      }
      return
    }

    if (hasErrors()) return
    setSaving(true)
    setError("")

    const isCustomSet = Object.keys(draft).length > 0

    if (!isCustomSet) {
      const res = await resetTeamMemberScheduleV2(businessId, professionalId)
      setSaving(false)
      if (res.error) {
        setError(res.error)
      } else {
        setHasCustom(false)
        setCustomSchedule({})
        setMode("inherited")
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
      return
    }

    const res = await updateTeamMemberScheduleV2(businessId, professionalId, draft)
    setSaving(false)
    if (res.error) {
      setError(res.error)
    } else {
      setHasCustom(true)
      setCustomSchedule(draft)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 rounded-xl bg-zf-surface p-6">
        <div className="h-4 w-1/3 rounded bg-zf-border/30" />
        <div className="h-20 rounded bg-zf-border/20" />
        <div className="h-20 rounded bg-zf-border/20" />
      </div>
    )
  }

  const isReadOnly = mode === "inherited"
  const displaySchedule = isReadOnly ? businessSchedule : draft

  return (
    <div className="space-y-5 rounded-xl border border-zf-border/50 bg-zf-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zf-text">
            Horario de {memberName}
          </h3>
          <p className="mt-1 text-xs text-zf-text-secondary">
            Define si sigue el ritmo del negocio o requiere agenda personalizada.
          </p>
        </div>
        {isReadOnly && (
          <span className="flex items-center gap-1.5 rounded-full bg-zf-accent-bg px-3 py-1 text-xs font-medium text-zf-accent-text">
            <Lock className="h-3 w-3" />
            Solo lectura
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            setMode("inherited")
            setDraft(businessSchedule)
            setSaved(false)
            setError("")
          }}
          aria-pressed={mode === "inherited"}
          className={[
            "flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:bg-zf-accent-bg/40",
            mode === "inherited"
              ? "border-zf-primary/30 bg-zf-accent-bg/40"
              : "border-zf-border bg-white",
          ].join(" ")}
        >
          <span
            className={[
              "h-5 w-5 shrink-0 rounded-full border-2 transition-all",
              mode === "inherited" ? "border-zf-primary bg-zf-primary" : "border-zf-border",
            ].join(" ")}
          >
            {mode === "inherited" && (
              <span className="mx-auto mt-1 block h-2 w-2 rounded-full bg-white" />
            )}
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-medium text-zf-text">
              Vincular al Horario del Negocio
            </span>
            <span className="text-xs text-zf-accent-text">
              {hasCustom ? "Cambio pendiente de guardar" : "Sincronización activa"}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("custom")
            setDraft(hasCustom ? customSchedule : businessSchedule)
            setSaved(false)
            setError("")
          }}
          aria-pressed={mode === "custom"}
          className={[
            "flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:bg-zf-accent-bg/40",
            mode === "custom"
              ? "border-zf-primary/30 bg-zf-accent-bg/40"
              : "border-zf-border bg-white",
          ].join(" ")}
        >
          <span
            className={[
              "h-5 w-5 shrink-0 rounded-full border-2 transition-all",
              mode === "custom" ? "border-zf-primary bg-zf-primary" : "border-zf-border",
            ].join(" ")}
          >
            {mode === "custom" && (
              <span className="mx-auto mt-1 block h-2 w-2 rounded-full bg-white" />
            )}
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-medium text-zf-text">
              Configurar Horario Personalizado
            </span>
            <span className="text-xs text-zf-text-secondary">Agenda independiente</span>
          </span>
        </button>
      </div>

      <div
        className={[
          "rounded-xl border border-zf-border/40 bg-zf-bg transition-opacity",
          isReadOnly ? "opacity-70" : "",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-zf-border/40 px-5 py-3">
          <span className="flex items-center gap-2 text-xs font-semibold text-zf-text">
            {isReadOnly ? (
              <>
                <Lock className="h-3.5 w-3.5 text-zf-text-muted" />
                Vista previa (horario del negocio)
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 text-zf-accent-text" />
                Configura el horario individual
              </>
            )}
          </span>
        </div>

        <div className="flex flex-col">
          {DAY_ORDER.map((day) => {
            const hs = displaySchedule[String(day)]
            const isOpen = hs != null
            return (
              <div
                key={day}
                className={[
                  "flex items-center gap-4 border-b border-zf-border/30 px-5 py-3 last:border-b-0",
                  !isOpen && "bg-zf-error-bg/30",
                ].join(" ")}
              >
                <span className="w-20 text-sm font-medium text-zf-text">
                  {DAY_LABELS[day]}
                </span>

                {isOpen && hs ? (
                  <div className="flex flex-1 items-center gap-2">
                    <select
                      disabled={isReadOnly}
                      value={hs.open}
                      onChange={(e) => updateHour(day, "open", parseInt(e.target.value))}
                      className="rounded-lg border border-zf-border bg-white px-3 py-2 text-sm text-zf-text focus:border-zf-primary focus:outline-none disabled:opacity-70"
                    >
                      {HOURS.filter((h) => h < (hs.close ?? 24)).map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-zf-text-secondary">a</span>
                    <select
                      disabled={isReadOnly}
                      value={hs.close}
                      onChange={(e) => updateHour(day, "close", parseInt(e.target.value))}
                      className="rounded-lg border border-zf-border bg-white px-3 py-2 text-sm text-zf-text focus:border-zf-primary focus:outline-none disabled:opacity-70"
                    >
                      {HOURS.filter((h) => h > (hs.open ?? 0)).map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="flex-1 text-xs font-bold uppercase text-zf-error-text">
                    Cerrado
                  </span>
                )}

                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => toggleDay(day)}
                    className="text-xs font-medium text-zf-accent-text transition-colors hover:text-zf-primary"
                  >
                    {isOpen ? "Cerrar día" : "Abrir día"}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-zf-error-text">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {mode === "custom" && hasCustom && (
          <button
            type="button"
            onClick={() => {
              setMode("inherited")
              setDraft(businessSchedule)
              setSaved(false)
              setError("")
            }}
            disabled={saving || isPending}
            className="flex items-center gap-1.5 rounded-xl border border-zf-border px-4 py-2 text-xs font-semibold text-zf-text-secondary transition-all hover:bg-zf-accent-bg disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar
          </button>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || isPending || (mode === "custom" && hasErrors())}
          className={[
            "flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold transition-all disabled:opacity-50",
            saved
              ? "bg-zf-success-bg text-zf-success-text"
              : "bg-zf-primary text-white hover:opacity-90",
          ].join(" ")}
        >
          {saving || isPending ? (
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
            <>Actualizar horario</>
          )}
        </button>
      </div>
    </div>
  )
}
