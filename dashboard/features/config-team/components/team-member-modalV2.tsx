"use client"

import { useState, useTransition } from "react"
import { ModalV2 } from "@/components/shared/modalV2"
import { createMiembroEquipo } from "../actionsV2"
import { AlertCircle, Eye, EyeOff, CheckCircle2, Loader2, UserPlus } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  businessId: number
  onCreated: () => void
}

export function TeamMemberModalV2({ open, onClose, businessId, onCreated }: Props) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"admin" | "profesional">("profesional")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function resetForm() {
    setName("")
    setEmail("")
    setPassword("")
    setRole("profesional")
    setShowPassword(false)
    setError("")
    setSaved(false)
  }

  function handleClose() {
    resetForm()
    onClose()
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
    if (!password) {
      setError("La contraseña es obligatoria")
      return
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }

    startTransition(async () => {
      const res = await createMiembroEquipo({
        businessId,
        email: email.trim(),
        password,
        name: name.trim(),
        role,
      })
      if (res.error) {
        setError(res.error)
        return
      }
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        resetForm()
        onCreated()
        onClose()
      }, 800)
    })
  }

  return (
    <ModalV2
      open={open}
      onClose={handleClose}
      title="Agregar Miembro"
      description="Crea un nuevo usuario para tu equipo"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zf-text-secondary">
            Nombre completo
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Camila Restrepo"
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
            placeholder="camila@correo.com"
            autoComplete="off"
            className="w-full rounded-xl border border-zf-border bg-zf-bg px-4 py-3 text-sm text-zf-text placeholder:text-zf-text-muted outline-none transition-all focus:border-zf-primary focus:ring-2 focus:ring-zf-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zf-text-secondary">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
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

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zf-text-secondary">Rol</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("profesional")}
              className={[
                "flex flex-col items-start rounded-xl border p-3 text-left transition-all",
                role === "profesional"
                  ? "border-zf-primary/40 bg-zf-accent-bg/40"
                  : "border-zf-border hover:bg-zf-accent-bg/20",
              ].join(" ")}
            >
              <span className="text-sm font-medium text-zf-text">Profesional</span>
              <span className="mt-0.5 text-xs text-zf-text-secondary">
                Solo su agenda
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={[
                "flex flex-col items-start rounded-xl border p-3 text-left transition-all",
                role === "admin"
                  ? "border-zf-primary/40 bg-zf-accent-bg/40"
                  : "border-zf-border hover:bg-zf-accent-bg/20",
              ].join(" ")}
            >
              <span className="text-sm font-medium text-zf-text">Administrador</span>
              <span className="mt-0.5 text-xs text-zf-text-secondary">
                Acceso total (excepto equipo)
              </span>
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
            className="flex-1 rounded-xl border border-zf-border py-3 text-sm font-semibold text-zf-text-secondary transition-all hover:bg-zf-accent-bg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className={[
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold shadow-sm transition-all disabled:opacity-50",
              saved
                ? "bg-zf-success-bg text-zf-success-text"
                : "bg-zf-primary text-white hover:opacity-90 active:scale-[0.97]",
            ].join(" ")}
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                ¡Creado!
              </>
            ) : isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Agregar Miembro
              </>
            )}
          </button>
        </div>
      </div>
    </ModalV2>
  )
}
