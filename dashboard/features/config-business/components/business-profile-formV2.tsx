"use client"

import { useState, useEffect, useTransition } from "react"
import { getBusinessProfile, updateBusinessProfile } from "@/features/config-business/actionsV2"
import type { BusinessProfile, BusinessProfileInput } from "@/features/config-business/actionsV2"
import { BadgeV2 } from "@/components/shared/badgeV2"
import { AlertCircle, CheckCircle2, Save, Building2, Store } from "lucide-react"

interface BusinessProfileFormV2Props {
  businessId: number
}

const CURRENCIES = [
  { value: "COP", label: "Peso Colombiano (COP - $)" },
  { value: "MXN", label: "Peso Mexicano (MXN - $)" },
  { value: "BRL", label: "Real Brasileño (BRL - R$)" },
  { value: "USD", label: "Dólar Americano (USD - $)" },
  { value: "EUR", label: "Euro (EUR - €)" },
  { value: "ARS", label: "Peso Argentino (ARS - $)" },
  { value: "CLP", label: "Peso Chileno (CLP - $)" },
]

const NOTICE_OPTIONS = [
  { value: 1, label: "1 hora" },
  { value: 2, label: "2 horas" },
  { value: 4, label: "4 horas" },
  { value: 24, label: "24 horas" },
]

export function BusinessProfileFormV2({ businessId }: BusinessProfileFormV2Props) {
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<BusinessProfileInput>({
    name: "",
    address: "",
    phone: "",
    email: "",
    description: "",
    tax_id: "",
    currency: "COP",
    allow_flexible_staff_hours: true,
    min_booking_notice_hours: 24,
    logo_url: null,
  })

  useEffect(() => {
    getBusinessProfile(businessId).then((res) => {
      if (res.profile) {
        setProfile(res.profile)
        setForm({
          name: res.profile.name,
          address: res.profile.address ?? "",
          phone: res.profile.phone ?? "",
          email: res.profile.email ?? "",
          description: res.profile.description ?? "",
          tax_id: res.profile.tax_id ?? "",
          currency: res.profile.currency ?? "COP",
          allow_flexible_staff_hours: res.profile.allow_flexible_staff_hours ?? true,
          min_booking_notice_hours: res.profile.min_booking_notice_hours ?? 24,
          logo_url: res.profile.logo_url,
        })
      } else {
        setError(res.error ?? "Error al cargar perfil")
      }
      setLoading(false)
    }).catch(() => {
      setError("Error de conexión al cargar perfil")
      setLoading(false)
    })
  }, [businessId])

  function handleSave() {
    setError("")
    setSaved(false)
    startTransition(async () => {
      const res = await updateBusinessProfile(businessId, form)
      if (res.error) {
        setError(res.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-zf-surface p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-zf-border/30" />
          <div className="h-40 rounded-xl bg-zf-border/20" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-12 rounded-xl bg-zf-border/20" />
            <div className="h-12 rounded-xl bg-zf-border/20" />
            <div className="h-12 rounded-xl bg-zf-border/20" />
            <div className="h-12 rounded-xl bg-zf-border/20" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="rounded-xl bg-zf-surface p-6 shadow-sm">
        <p className="text-sm text-zf-text-secondary">No se pudo cargar el perfil del negocio.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-zf-surface p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zf-accent-bg">
            <Building2 className="h-5 w-5 text-zf-accent-text" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zf-text">Perfil del Negocio</h2>
            <p className="text-xs text-zf-text-secondary">Información principal de tu establecimiento</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-zf-text-secondary">
              Nombre Comercial <span className="text-zf-error-text">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Peluquería Meyer"
              className="w-full rounded-xl border border-zf-border bg-zf-bg px-4 py-3 text-sm text-zf-text placeholder:text-zf-text-muted outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zf-text-secondary">Identificación Fiscal (NIT/RUT)</label>
            <input
              value={form.tax_id ?? ""}
              onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
              placeholder="Ej: 76.123.456-K"
              className="w-full rounded-xl border border-zf-border bg-zf-bg px-4 py-3 text-sm text-zf-text placeholder:text-zf-text-muted outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zf-text-secondary">Teléfono de Contacto</label>
            <input
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Ej: +57 300 123 4567"
              type="tel"
              className="w-full rounded-xl border border-zf-border bg-zf-bg px-4 py-3 text-sm text-zf-text placeholder:text-zf-text-muted outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zf-text-secondary">Correo Electrónico</label>
            <input
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Ej: info@meyer.com"
              type="email"
              className="w-full rounded-xl border border-zf-border bg-zf-bg px-4 py-3 text-sm text-zf-text placeholder:text-zf-text-muted outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zf-text-secondary">Dirección Física</label>
            <input
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Ej: Av. Principal #123"
              className="w-full rounded-xl border border-zf-border bg-zf-bg px-4 py-3 text-sm text-zf-text placeholder:text-zf-text-muted outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-zf-text-secondary">Descripción del Negocio</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Breve descripción de tu negocio..."
              rows={3}
              className="w-full resize-none rounded-xl border border-zf-border bg-zf-bg px-4 py-3 text-sm text-zf-text placeholder:text-zf-text-muted outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-zf-surface p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zf-accent-bg">
            <Store className="h-5 w-5 text-zf-accent-text" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zf-text">Reglas Operativas</h2>
            <p className="text-xs text-zf-text-secondary">Configura el comportamiento de la agenda y reservas</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-zf-text">Permitir Horarios Flexibles</p>
              <p className="text-xs text-zf-text-secondary">
                Si se desactiva, el personal no podrá abrir turnos en días que el local esté cerrado.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={form.allow_flexible_staff_hours ?? true}
                onChange={(e) => setForm({ ...form, allow_flexible_staff_hours: e.target.checked })}
                className="peer sr-only"
              />
              <div className="h-7 w-14 rounded-full bg-zf-border peer-checked:bg-zf-primary after:absolute after:start-[4px] after:top-[2px] after:h-6 after:w-6 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>

          <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-zf-text">Anticipación Mínima para Reservas</p>
              <p className="text-xs text-zf-text-secondary">
                Tiempo mínimo antes de que un cliente pueda agendar por sí mismo.
              </p>
            </div>
            <select
              value={form.min_booking_notice_hours ?? 24}
              onChange={(e) => setForm({ ...form, min_booking_notice_hours: parseInt(e.target.value) })}
              className="w-full appearance-none rounded-xl border border-zf-border bg-zf-bg px-4 py-2.5 text-sm text-zf-text outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20 md:w-48"
            >
              {NOTICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-zf-text">Moneda del Sistema</p>
              <p className="text-xs text-zf-text-secondary">Moneda base para precios y transacciones.</p>
            </div>
            <select
              value={form.currency ?? "COP"}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full appearance-none rounded-xl border border-zf-border bg-zf-bg px-4 py-2.5 text-sm text-zf-text outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20 md:w-48"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-zf-error-text">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-zf-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.97] disabled:opacity-50"
      >
        {isPending ? (
          "Guardando..."
        ) : saved ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Cambios Guardados
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Guardar Configuración
          </>
        )}
      </button>
    </div>
  )
}
