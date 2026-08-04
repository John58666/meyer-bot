"use client"

import { useState, useTransition } from "react"
import { ModalV2 } from "@/components/shared/modalV2"
import { updateMiembroCredenciales } from "@/lib/actions"
import type { MiembroEquipo } from "@/lib/actions"
import { AlertCircle, Eye, EyeOff, Loader2, Key } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  member: MiembroEquipo
  businessId: number
}

export function TeamCredentialsModalV2({ open, onClose, member, businessId }: Props) {
  const [name, setName] = useState(member.name)
  const [email, setEmail] = useState(member.email)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    resetForm()
    onClose()
  }

  function resetForm() {
    setName(member.name)
    setEmail(member.email)
    setPassword("")
    setShowPassword(false)
    setError("")
  }

  function handleSubmit() {
    setError("")

    if (!name.trim()) {
      setError("El nombre es obligatorio")
      return
    }
    if (!email.trim()) {
      setError("El email es obligatorio")
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError("El email no es válido")
      return
    }
    if (password && password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }

    startTransition(async () => {
      const res = await updateMiembroCredenciales({
        userId: member.id,
        businessId,
        name: name.trim(),
        email: email.trim(),
        password: password || undefined,
      })
      if (res.error) {
        setError(res.error)
        return
      }
      handleClose()
    })
  }

  return (
    <ModalV2
      open={open}
      onClose={handleClose}
      title="Cambiar credenciales"
      description={member.name}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zf-text-secondary">
            Nombre completo
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del miembro"
            autoComplete="off"
            className="w-full rounded-xl border border-zf-border bg-zf-bg px-4 py-3 text-sm text-zf-text placeholder:text-zf-text-muted outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zf-text-secondary">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            autoComplete="off"
            className="w-full rounded-xl border border-zf-border bg-zf-bg px-4 py-3 text-sm text-zf-text placeholder:text-zf-text-muted outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zf-text-secondary">
            Nueva contraseña <span className="text-zf-text-muted">(opcional)</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Dejar vacío para no cambiar"
              autoComplete="new-password"
              className="w-full rounded-xl border border-zf-border bg-zf-bg px-4 py-3 pr-11 text-sm text-zf-text placeholder:text-zf-text-muted outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zf-text-muted transition-colors hover:text-zf-text"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-zf-error-text">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 rounded-xl border border-zf-border py-3 text-sm font-semibold text-zf-text-secondary transition-all hover:bg-zf-accent-bg active:scale-[0.97] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zf-primary py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Key className="h-4 w-4" />
                Guardar cambios
              </>
            )}
          </button>
        </div>
      </div>
    </ModalV2>
  )
}
