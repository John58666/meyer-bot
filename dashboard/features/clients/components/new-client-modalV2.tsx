"use client"

import { useState, useEffect } from "react"
import { ModalV2 } from "@/components/shared/modalV2"
import { createClienteV2, updateClienteV2, getClienteByIdV2 } from "../actionsV2"
import type { Cliente } from "@/lib/actions"
import {
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  businessId: number
  cliente?: Cliente | null
  onSuccess: () => void
}

type Step = "form" | "success"

export function NewClientModalV2({ open, onClose, businessId, cliente, onSuccess }: Props) {
  const isEditing = !!cliente
  const [step, setStep] = useState<Step>("form")

  const [nombre, setNombre] = useState("")
  const [numero, setNumero] = useState("")
  const [email, setEmail] = useState("")
  const [direccion, setDireccion] = useState("")
  const [notas, setNotas] = useState("")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [loadingClient, setLoadingClient] = useState(false)

  const loadFullClient = async (id: number) => {
    setLoadingClient(true)
    const res = await getClienteByIdV2(businessId, id)
    setLoadingClient(false)
    if ("cliente" in res && res.cliente) {
      setEmail(res.cliente.email ?? "")
      setDireccion(res.cliente.direccion ?? "")
      setNotas(res.cliente.notas ?? "")
    } else {
      setEmail("")
      setDireccion("")
      setNotas("")
    }
  }

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("form")
      setError("")
      setSaving(false)
      if (cliente) {
        setNombre(cliente.nombre)
        setNumero(cliente.numero)
        loadFullClient(cliente.id)
      } else {
        setNombre("")
        setNumero("")
        setEmail("")
        setDireccion("")
        setNotas("")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cliente])

  const canSubmit = nombre.trim() && numero.trim()

  const handleSubmit = async () => {
    setError("")
    if (!canSubmit) {
      setError("Nombre y teléfono son obligatorios")
      return
    }

    const data = {
      nombre: nombre.trim(),
      numero: numero.trim(),
      email: email.trim() || undefined,
      direccion: direccion.trim() || undefined,
      notas: notas.trim() || undefined,
    }

    setSaving(true)
    const result = isEditing
      ? await updateClienteV2(businessId, cliente!.id, data)
      : await createClienteV2(businessId, data)
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

  if (!open) return null

  if (step === "success") {
    return (
      <ModalV2 open={open} onClose={onClose} showCloseButton={false}>
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-success-bg">
            <Check className="h-7 w-7 text-zf-success-text" />
          </div>
          <p className="text-lg font-semibold text-zf-text">
            {isEditing ? "Cliente actualizado" : "Cliente registrado"}
          </p>
          <p className="text-sm text-zf-text-secondary">
            {isEditing ? "Los datos se han guardado correctamente" : "El cliente se ha creado correctamente"}
          </p>
        </div>
      </ModalV2>
    )
  }

  return (
    <ModalV2
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Cliente" : "Registrar Nuevo Cliente"}
      className="w-full max-w-lg"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
              Nombre <span className="text-zf-error-text">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Sofía Castro"
              className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
              Teléfono <span className="text-zf-error-text">*</span>
            </label>
            <input
              type="tel"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ej: 3001234567"
              className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
            Correo electrónico
          </label>
          {loadingClient ? (
            <div className="flex items-center gap-2 rounded-xl bg-zf-bg px-4 py-3 text-sm text-zf-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
            Dirección
          </label>
          {loadingClient ? (
            <div className="h-10 rounded-xl bg-zf-border/20 animate-pulse" />
          ) : (
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej: Calle 123 #45-67"
              className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">
            Notas / Observaciones
          </label>
          {loadingClient ? (
            <div className="h-20 rounded-xl bg-zf-border/20 animate-pulse" />
          ) : (
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Añadir notas..."
              rows={3}
              className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20"
            />
          )}
        </div>

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
          disabled={saving || !canSubmit}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zf-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 active:scale-[0.97]"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEditing ? "Guardando..." : "Registrando..."}
            </>
          ) : isEditing ? (
            "Guardar Cambios"
          ) : (
            "Registrar Cliente"
          )}
        </button>
      </div>
    </ModalV2>
  )
}
