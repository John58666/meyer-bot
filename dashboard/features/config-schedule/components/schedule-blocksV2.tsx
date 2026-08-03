"use client"

import { useState, useEffect } from "react"
import {
  getBloqueosV2,
  getProfessionalsV2,
  createBloqueoV2,
  deleteBloqueoV2,
} from "../actionsV2"
import type { BloqueoRow } from "../actionsV2"
import { ModalV2 } from "@/components/shared/modalV2"
import {
  Plus,
  Search,
  Trash2,
  AlertCircle,
  Loader2,
  CalendarDays,
  Clock,
  User,
  Ban,
  Filter,
  X,
} from "lucide-react"

const TIPO_LABELS: Record<string, string> = {
  cerrado: "Cierre total",
  horario_especial: "Horario especial",
}

interface Props {
  businessId: number
  filterProfessionalId?: number | null
}

type FilterState = {
  search: string
  tipo: string
  professionalId: number | null
}

export function ScheduleBlocksV2({ businessId, filterProfessionalId }: Props) {
  const [blocks, setBlocks] = useState<BloqueoRow[]>([])
  const [professionals, setProfessionals] = useState<
    { id: number; name: string }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    tipo: "",
    professionalId: filterProfessionalId ?? null,
  })
  const [showFilters, setShowFilters] = useState(false)

  const [form, setForm] = useState({
    fecha: "",
    tipo: "cerrado" as "cerrado" | "horario_especial",
    hora_inicio: "",
    hora_fin: "",
    motivo: "",
    professionalId: null as number | null,
  })
  const [formError, setFormError] = useState("")

  async function loadData() {
    setError("")
    setLoading(true)
    try {
      const [blocksRes, profsRes] = await Promise.all([
        getBloqueosV2(businessId),
        getProfessionalsV2(businessId),
      ])
      setBlocks(blocksRes.bloqueos)
      if (profsRes.professionals) {
        setProfessionals(profsRes.professionals)
      }
    } catch {
      setError("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  function resetForm() {
    setForm({
      fecha: "",
      tipo: "cerrado",
      hora_inicio: "",
      hora_fin: "",
      motivo: "",
      professionalId: null,
    })
    setFormError("")
  }

  function handleOpenModal() {
    resetForm()
    setModalOpen(true)
  }

  function handleCloseModal() {
    resetForm()
    setModalOpen(false)
  }

  async function handleCreate() {
    setFormError("")
    if (!form.fecha) {
      setFormError("La fecha es obligatoria")
      return
    }
    if (form.tipo === "horario_especial") {
      if (!form.hora_inicio || !form.hora_fin) {
        setFormError("Horario especial requiere hora de inicio y fin")
        return
      }
      if (form.hora_inicio >= form.hora_fin) {
        setFormError("La hora de inicio debe ser menor que la de fin")
        return
      }
    }

    setSaving(true)
    const res = await createBloqueoV2({
      businessId,
      fecha: form.fecha,
      tipo: form.tipo,
      hora_inicio: form.tipo === "horario_especial" ? form.hora_inicio : undefined,
      hora_fin: form.tipo === "horario_especial" ? form.hora_fin : undefined,
      motivo: form.motivo || undefined,
      professionalId: form.professionalId,
    })
    setSaving(false)

    if (res.error) {
      setFormError(res.error)
    } else {
      handleCloseModal()
      loadData()
    }
  }

  async function handleDelete(id: number) {
    setDeleteId(id)
    setDeleting(true)
    const res = await deleteBloqueoV2(id, businessId)
    setDeleting(false)
    setDeleteId(null)

    if (res.error) {
      setError(res.error)
    } else {
      loadData()
    }
  }

  const filtered = blocks.filter((b) => {
    if (
      filters.search &&
      !b.professional_name
        ?.toLowerCase()
        .includes(filters.search.toLowerCase()) &&
      !b.motivo?.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false
    if (filters.tipo && b.tipo !== filters.tipo) return false
    if (
      filters.professionalId !== null &&
      b.professional_id !== filters.professionalId
    )
      return false
    return true
  })

  function clearFilters() {
    setFilters({ search: "", tipo: "", professionalId: null })
  }

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.tipo ? 1 : 0) +
    (filters.professionalId !== null ? 1 : 0)

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zf-border/50 bg-zf-surface p-6">
        <div className="flex items-center justify-between">
          <div className="h-5 w-1/3 rounded bg-zf-border/30" />
          <div className="h-9 w-32 rounded-lg bg-zf-border/20" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-zf-border/20" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zf-border/50 bg-zf-surface">
      <div className="flex flex-col gap-4 border-b border-zf-border/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zf-accent-bg">
            <Ban className="h-4 w-4 text-zf-accent-text" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zf-text">
              Gestión de Bloqueos
            </h3>
            <p className="text-xs text-zf-text-secondary">
              {filtered.length} de {blocks.length} bloqueos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zf-text-muted" />
            <input
              type="text"
              placeholder="Buscar..."
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              className="w-full rounded-lg border border-zf-border bg-white py-2 pl-9 pr-3 text-xs text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={[
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
              showFilters || activeFilterCount > 0
                ? "border-zf-primary/30 bg-zf-accent-bg text-zf-accent-text"
                : "border-zf-border text-zf-text-secondary hover:bg-zf-accent-bg/40",
            ].join(" ")}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zf-primary text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 rounded-lg bg-zf-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo Bloqueo
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 border-b border-zf-border/40 bg-zf-bg/60 px-6 py-3">
          <select
            value={filters.tipo}
            onChange={(e) =>
              setFilters((f) => ({ ...f, tipo: e.target.value }))
            }
            className="rounded-lg border border-zf-border bg-white px-3 py-1.5 text-xs text-zf-text focus:border-zf-primary focus:outline-none"
          >
            <option value="">Todos los Motivos</option>
            <option value="cerrado">Cierre total</option>
            <option value="horario_especial">Horario especial</option>
          </select>

          {filterProfessionalId == null && (
          <select
            value={filters.professionalId ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                professionalId: e.target.value
                  ? parseInt(e.target.value)
                  : null,
              }))
            }
            className="rounded-lg border border-zf-border bg-white px-3 py-1.5 text-xs text-zf-text focus:border-zinc-800 focus:outline-none"
          >
            <option value="">Todos los Profesionales</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          )}

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-zf-text-secondary transition-colors hover:text-zf-text"
            >
              <X className="h-3 w-3" />
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-zf-error-bg/50 px-4 py-3 text-xs text-zf-error-text">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-bg">
            <CalendarDays className="h-6 w-6 text-zf-text-muted" />
          </div>
          <p className="text-sm font-medium text-zf-text-secondary">
            {blocks.length === 0
              ? "No hay bloqueos registrados"
              : "Sin resultados para los filtros actuales"}
          </p>
          <p className="text-xs text-zf-text-muted">
            {blocks.length === 0
              ? "Agrega un nuevo bloqueo para empezar"
              : "Ajusta los filtros o crea uno nuevo"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zf-border/40 bg-zf-bg/60 text-xs font-semibold uppercase text-zf-text-secondary">
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Profesional</th>
                <th className="px-6 py-3">Motivo</th>
                <th className="px-6 py-3">Horario</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zf-border/30">
              {filtered.map((block) => (
                <tr
                  key={block.id}
                  className="transition-colors hover:bg-zf-accent-bg/20"
                >
                  <td className="px-6 py-3">
                    <span className="text-sm font-medium text-zf-text">
                      {new Date(block.fecha + "T00:00:00").toLocaleDateString(
                        "es-CO",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {block.professional_name ? (
                      <span className="flex items-center gap-1.5 text-sm text-zf-text">
                        <User className="h-3.5 w-3.5 text-zf-text-muted" />
                        {block.professional_name}
                      </span>
                    ) : (
                      <span className="rounded-full bg-zf-warning-bg px-2 py-0.5 text-xs font-medium text-zf-warning-text">
                        Todo el negocio
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm text-zf-text">
                      {block.motivo || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {block.hora_inicio && block.hora_fin ? (
                      <span className="flex items-center gap-1 text-sm text-zf-text">
                        <Clock className="h-3.5 w-3.5 text-zf-text-muted" />
                        {block.hora_inicio.slice(0, 5)} —{" "}
                        {block.hora_fin.slice(0, 5)}
                      </span>
                    ) : (
                      <span className="text-sm text-zf-text-secondary">
                        Todo el día
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={[
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        block.tipo === "cerrado"
                          ? "bg-zf-error-bg text-zf-error-text"
                          : "bg-zf-warning-bg text-zf-warning-text",
                      ].join(" ")}
                    >
                      {TIPO_LABELS[block.tipo] ?? block.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(block.id)}
                      disabled={deleting && deleteId === block.id}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-zf-text-secondary transition-colors hover:bg-zf-error-bg hover:text-zf-error-text disabled:opacity-50"
                    >
                      {deleting && deleteId === block.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalV2
        open={modalOpen}
        onClose={handleCloseModal}
        title="Nuevo Bloqueo"
        description="Programa un cierre total o un horario especial para un día específico."
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-zf-text-secondary">
              Fecha
            </label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) =>
                setForm((f) => ({ ...f, fecha: e.target.value }))
              }
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-lg border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-zf-text-secondary">
              Tipo de Bloqueo
            </label>
            <div className="flex gap-3">
              <label
                className={[
                  "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  form.tipo === "cerrado"
                    ? "border-zf-primary bg-zf-accent-bg text-zf-accent-text"
                    : "border-zf-border text-zf-text-secondary hover:bg-zf-accent-bg/30",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="tipo"
                  checked={form.tipo === "cerrado"}
                  onChange={() =>
                    setForm((f) => ({ ...f, tipo: "cerrado" }))
                  }
                  className="sr-only"
                />
                <Ban className="h-4 w-4" />
                Cierre total
              </label>
              <label
                className={[
                  "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  form.tipo === "horario_especial"
                    ? "border-zf-primary bg-zf-accent-bg text-zf-accent-text"
                    : "border-zf-border text-zf-text-secondary hover:bg-zf-accent-bg/30",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="tipo"
                  checked={form.tipo === "horario_especial"}
                  onChange={() =>
                    setForm((f) => ({
                      ...f,
                      tipo: "horario_especial",
                    }))
                  }
                  className="sr-only"
                />
                <Clock className="h-4 w-4" />
                Horario especial
              </label>
            </div>
          </div>

          {form.tipo === "horario_especial" && (
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zf-text-secondary">
                  Hora Inicio
                </label>
                <input
                  type="time"
                  value={form.hora_inicio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hora_inicio: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
                />
              </div>
              <span className="mt-5 text-sm text-zf-text-secondary">a</span>
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zf-text-secondary">
                  Hora Fin
                </label>
                <input
                  type="time"
                  value={form.hora_fin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hora_fin: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-zf-text-secondary">
              Profesional (opcional)
            </label>
            <select
              value={form.professionalId ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  professionalId: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                }))
              }
              className="w-full rounded-lg border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
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
            <label className="text-xs font-semibold uppercase text-zf-text-secondary">
              Motivo
            </label>
            <input
              type="text"
              value={form.motivo}
              onChange={(e) =>
                setForm((f) => ({ ...f, motivo: e.target.value }))
              }
              placeholder="Ej. Vacaciones, Día festivo..."
              className="w-full rounded-lg border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-zf-error-bg/50 px-4 py-3 text-xs text-zf-error-text">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleCloseModal}
            disabled={saving}
            className="flex-1 rounded-xl border border-zf-border px-4 py-2.5 text-sm font-semibold text-zf-text-secondary transition-all hover:bg-zf-accent-bg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zf-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Guardar Bloqueo"
            )}
          </button>
        </div>
      </ModalV2>
    </div>
  )
}
