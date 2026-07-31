"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ModalV2 } from "@/components/shared/modalV2"
import {
  getClientesV2,
  getServicesV2,
  getAvailableSlotsV2,
  createAppointmentV2,
  createBloqueoV2,
} from "../actionsV2"
import type { Cliente, ServiceRow } from "../actionsV2"
import {
  Search,
  Loader2,
  AlertCircle,
  Check,
  Calendar,
  Lock,
} from "lucide-react"
import { formatHora } from "@/lib/utils"

interface Props {
  open: boolean
  onClose: () => void
  businessId: number
  preselectedSlot: { date: string; hour: string; professionalId: number | null } | null
  professionals: { id: number; name: string }[]
  onSuccess: () => void
}

type Tab = "cita" | "bloquear"
type Step = "form" | "success"

const MOTIVOS_BLOQUEO = [
  "Almuerzo",
  "Cita médica",
  "Imprevisto personal",
  "Capacitación",
  "Vacaciones",
  "Mantenimiento",
  "Otro",
]

export function AgendaModalV2({
  open,
  onClose,
  businessId,
  preselectedSlot,
  professionals,
  onSuccess,
}: Props) {
  const [tab, setTab] = useState<Tab>("cita")
  const [step, setStep] = useState<Step>("form")

  const [clienteSearch, setClienteSearch] = useState("")
  const [clientesResults, setClientesResults] = useState<Cliente[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)

  const [services, setServices] = useState<ServiceRow[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<number | "">("")

  const [selectedProfId, setSelectedProfId] = useState<number | null>(
    preselectedSlot?.professionalId ?? professionals[0]?.id ?? null
  )

  const [fecha, setFecha] = useState(preselectedSlot?.date ?? "")
  const [hora, setHora] = useState(preselectedSlot?.hour ?? "")

  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState("")

  const [nombreCliente, setNombreCliente] = useState("")
  const [numeroCliente, setNumeroCliente] = useState("")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [bloqueoProfId, setBloqueoProfId] = useState<number | null>(preselectedSlot?.professionalId ?? null)
  const [bloqueoFecha, setBloqueoFecha] = useState(preselectedSlot?.date ?? "")
  const [bloqueoHoraInicio, setBloqueoHoraInicio] = useState(preselectedSlot?.hour ?? "")
  const [bloqueoHoraFin, setBloqueoHoraFin] = useState("")
  const [bloqueoMotivo, setBloqueoMotivo] = useState("")
  const [bloqueoNotas, setBloqueoNotas] = useState("")

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadServices = useCallback(async () => {
    const res = await getServicesV2(businessId)
    if (res.services) setServices(res.services)
  }, [businessId])

  const loadSlots = useCallback(async () => {
    if (!fecha) return
    setLoadingSlots(true)
    setHora("")
    setSlotsError("")
    setAvailableSlots([])
    try {
      const res = await getAvailableSlotsV2(businessId, fecha, selectedProfId)
      setAvailableSlots(res.slots)
      if (res.error) setSlotsError(res.error)
    } catch {
      setSlotsError("Error al cargar horarios disponibles")
    } finally {
      setLoadingSlots(false)
    }
  }, [businessId, fecha, selectedProfId])

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadServices()
      setStep("form")
      setError("")
      setSaving(false)
      if (preselectedSlot) {
        setFecha(preselectedSlot.date)
        setHora(preselectedSlot.hour)
        setSelectedProfId(preselectedSlot.professionalId ?? professionals[0]?.id ?? null)
        setBloqueoProfId(preselectedSlot.professionalId ?? null)
        setBloqueoFecha(preselectedSlot.date)
        setBloqueoHoraInicio(preselectedSlot.hour)
      }
    }
  }, [open, preselectedSlot, loadServices, professionals])

  useEffect(() => {
    if (open && fecha) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadSlots()
    }
  }, [open, fecha, selectedProfId, loadSlots])

  useEffect(() => {
    if (clienteSearch.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClientesResults([])
      return
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await getClientesV2(businessId, clienteSearch)
      if (res.clientes) setClientesResults(res.clientes)
      setSearching(false)
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [clienteSearch, businessId])

  const handleSelectCliente = (c: Cliente) => {
    setSelectedCliente(c)
    setNombreCliente(c.nombre ?? "")
    setNumeroCliente(c.numero ?? "")
    setClienteSearch("")
    setClientesResults([])
  }

  const handleClearCliente = () => {
    setSelectedCliente(null)
    setNombreCliente("")
    setNumeroCliente("")
  }

  const selectedService = services.find((s) => s.id === selectedServiceId)

  const canSubmit =
    (selectedCliente || (nombreCliente.trim() && numeroCliente.trim())) &&
    selectedServiceId &&
    hora &&
    fecha

  const handleCreateCita = async () => {
    setError("")
    if (!canSubmit) {
      setError("Completa todos los campos requeridos")
      return
    }

    const formData = new FormData()
    formData.append("nombre", selectedCliente?.nombre ?? nombreCliente.trim())
    formData.append("numero", selectedCliente?.numero ?? numeroCliente.trim())
    formData.append("servicio", selectedService?.name ?? "")
    formData.append("fecha", fecha)
    formData.append("hora", hora)
    if (selectedProfId) formData.append("professionalId", String(selectedProfId))

    setSaving(true)
    const result = await createAppointmentV2(formData)
    setSaving(false)

    if ("conflict" in result && result.conflict) {
      formData.append("forceOverride", "true")
      setSaving(true)
      const retry = await createAppointmentV2(formData)
      setSaving(false)
      if ("error" in retry && retry.error) {
        setError(retry.error)
      } else {
        setStep("success")
        setTimeout(() => {
          onClose()
          onSuccess()
        }, 1200)
      }
    } else if ("error" in result && result.error) {
      setError(result.error)
    } else {
      setStep("success")
      setTimeout(() => {
        onClose()
        onSuccess()
      }, 1200)
    }
  }

  const handleCreateBloqueo = async () => {
    setError("")
    if (!bloqueoFecha) {
      setError("La fecha es obligatoria")
      return
    }

    setSaving(true)
    const result = await createBloqueoV2({
      businessId,
      professionalId: bloqueoProfId,
      fecha: bloqueoFecha,
      tipo: bloqueoHoraInicio && bloqueoHoraFin ? "horario_especial" : "cerrado",
      hora_inicio: bloqueoHoraInicio || undefined,
      hora_fin: bloqueoHoraFin || undefined,
      motivo: bloqueoMotivo || bloqueoNotas || undefined,
    })
    setSaving(false)

    if ("error" in result && result.error) {
      setError(result.error)
    } else {
      setStep("success")
      setTimeout(() => {
        onClose()
        onSuccess()
      }, 1200)
    }
  }

  const handleSubmit = () => {
    if (tab === "cita") {
      handleCreateCita()
    } else {
      handleCreateBloqueo()
    }
  }

  if (!open) return null

  if (step === "success") {
    return (
      <ModalV2 open={open} onClose={onClose} showCloseButton={false}>
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-success-bg">
            <Check className="h-7 w-7 text-zf-success-text" />
          </div>
          <p className="text-lg font-semibold text-zf-text">
            {tab === "cita" ? "Cita agendada" : "Horario bloqueado"}
          </p>
          <p className="text-sm text-zf-text-secondary">
            {tab === "cita" ? "La cita se ha creado correctamente" : "El bloqueo se ha registrado"}
          </p>
        </div>
      </ModalV2>
    )
  }

  return (
    <ModalV2
      open={open}
      onClose={onClose}
      title="Gestión de Agenda"
      className="w-full max-w-lg"
    >
      <div className="-mx-6 -mt-4 mb-0 border-b border-zf-border/40">
        <div className="flex px-6 pt-2">
          <button
            type="button"
            onClick={() => setTab("cita")}
            className={[
              "px-4 py-2.5 text-sm font-semibold transition-all",
              tab === "cita"
                ? "border-b-2 border-zf-primary text-zf-accent-text"
                : "text-zf-text-secondary hover:text-zf-text",
            ].join(" ")}
          >
            <Calendar className="mr-1.5 inline h-3.5 w-3.5" />
            Nueva Cita
          </button>
          <button
            type="button"
            onClick={() => setTab("bloquear")}
            className={[
              "px-4 py-2.5 text-sm font-semibold transition-all",
              tab === "bloquear"
                ? "border-b-2 border-zf-primary text-zf-accent-text"
                : "text-zf-text-secondary hover:text-zf-text",
            ].join(" ")}
          >
            <Lock className="mr-1.5 inline h-3.5 w-3.5" />
            Bloquear Horario
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {tab === "cita" ? (
          <>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
                Cliente
              </label>
              {selectedCliente ? (
                <div className="flex items-center justify-between rounded-xl border border-zf-primary/30 bg-zf-accent-bg/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-zf-text">
                      {selectedCliente.nombre}
                    </p>
                    <p className="text-xs text-zf-text-secondary">
                      {selectedCliente.numero}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearCliente}
                    className="text-xs font-medium text-zf-text-secondary hover:text-zf-error-text"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zf-text-muted" />
                    <input
                      type="text"
                      placeholder="Buscar cliente (Nombre o Teléfono)"
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      className="w-full rounded-xl border border-zf-border bg-white py-2.5 pl-10 pr-3 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zf-text-muted" />
                    )}
                  </div>
                  {clientesResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-zf-border/50 bg-white shadow-sm">
                      {clientesResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCliente(c)}
                          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-zf-accent-bg/40"
                        >
                          <div>
                            <p className="font-medium text-zf-text">{c.nombre}</p>
                            <p className="text-xs text-zf-text-secondary">{c.numero}</p>
                          </div>
                          <span className="text-[10px] text-zf-text-muted">
                            {c.total_visitas} visitas
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Nombre *"
                      value={nombreCliente}
                      onChange={(e) => setNombreCliente(e.target.value)}
                      className="flex-1 rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono *"
                      value={numeroCliente}
                      onChange={(e) => setNumeroCliente(e.target.value)}
                      className="flex-1 rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
                  Servicio
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) =>
                    setSelectedServiceId(e.target.value ? parseInt(e.target.value) : "")
                  }
                  className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
                >
                  <option value="">Selecciona un servicio</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - ${s.price?.toLocaleString()} ({s.duration_minutes} min)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
                  Profesional
                </label>
                <select
                  value={selectedProfId ?? ""}
                  onChange={(e) =>
                    setSelectedProfId(e.target.value ? parseInt(e.target.value) : null)
                  }
                  className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
                >
                  {professionals.length === 0 && (
                    <option value="">Sin profesionales</option>
                  )}
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
                Hora disponible
              </label>
              {loadingSlots ? (
                <div className="flex items-center gap-2 rounded-xl bg-zf-bg px-4 py-3 text-sm text-zf-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando horarios disponibles...
                </div>
              ) : slotsError ? (
                <div className="rounded-xl bg-zf-error-bg/50 px-4 py-3 text-sm text-zf-error-text">
                  {slotsError}
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="rounded-xl bg-zf-warning-bg/30 px-4 py-3 text-sm text-zf-warning-text">
                  No hay horarios disponibles para esta fecha
                </div>
              ) : (
                <div className="grid max-h-[160px] grid-cols-4 gap-2 overflow-y-auto">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setHora(slot)}
                      className={[
                        "rounded-lg border px-2 py-2 text-xs font-semibold transition-all",
                        hora === slot
                          ? "border-zf-primary bg-zf-primary text-white"
                          : "border-zf-border text-zf-text-secondary hover:border-zf-primary hover:text-zf-text",
                      ].join(" ")}
                    >
                      {formatHora(slot)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
                Profesional
              </label>
              <select
                value={bloqueoProfId ?? ""}
                onChange={(e) =>
                  setBloqueoProfId(e.target.value ? parseInt(e.target.value) : null)
                }
                className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
              >
                <option value="">Todo el negocio</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
                Fecha y Horario
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="date"
                  value={bloqueoFecha}
                  onChange={(e) => setBloqueoFecha(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="flex-1 rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={bloqueoHoraInicio}
                    onChange={(e) => setBloqueoHoraInicio(e.target.value)}
                    className="w-28 rounded-xl border border-zf-border bg-white px-3 py-2.5 text-center text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
                  />
                  <span className="text-sm text-zf-text-secondary">a</span>
                  <input
                    type="time"
                    value={bloqueoHoraFin}
                    onChange={(e) => setBloqueoHoraFin(e.target.value)}
                    className="w-28 rounded-xl border border-zf-border bg-white px-3 py-2.5 text-center text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
                  />
                </div>
              </div>
              {bloqueoHoraInicio && bloqueoHoraFin === "" && (
                <p className="text-xs text-zf-text-muted">
                  Si no especificas horario, será un cierre total del día
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
                Motivo del Bloqueo
              </label>
              <select
                value={bloqueoMotivo}
                onChange={(e) => setBloqueoMotivo(e.target.value)}
                className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
              >
                <option value="">Sin motivo especificado</option>
                {MOTIVOS_BLOQUEO.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
                Notas
              </label>
              <textarea
                value={bloqueoNotas}
                onChange={(e) => setBloqueoNotas(e.target.value)}
                placeholder="Ej: Pausa para almuerzo programada"
                rows={3}
                className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
              />
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-zf-error-bg/50 px-4 py-3 text-xs text-zf-error-text">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex-1 rounded-xl border border-zf-border px-4 py-2.5 text-sm font-semibold text-zf-text-secondary transition-all hover:bg-zf-accent-bg disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || (tab === "cita" ? !canSubmit : !bloqueoFecha)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zf-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 active:scale-[0.97]"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {tab === "cita" ? "Agendando..." : "Bloqueando..."}
            </>
          ) : tab === "cita" ? (
            "Confirmar y Agendar Cita"
          ) : (
            "Confirmar Bloqueo de Horario"
          )}
        </button>
      </div>
    </ModalV2>
  )
}

