"use client"

import { useState, useEffect, useTransition } from "react"
import { getPaymentMethods, togglePaymentMethod, updatePaymentMethod } from "@/features/config-payments/actionsV2"
import type { PaymentMethod } from "@/features/config-payments/actionsV2"
import { Wallet, CreditCard, Banknote, Landmark, Smartphone, AlertCircle, Pencil, Check, X } from "lucide-react"

const TIPO_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-6 w-6" />,
  card: <CreditCard className="h-6 w-6" />,
  transfer: <Landmark className="h-6 w-6" />,
  digital: <Smartphone className="h-6 w-6" />,
}

const TIPO_COLORS: Record<string, string> = {
  cash: "bg-emerald-100 text-emerald-700",
  card: "bg-blue-100 text-blue-700",
  transfer: "bg-purple-100 text-purple-700",
  digital: "bg-amber-100 text-amber-700",
}

const TIPO_OPTIONS = ["cash", "card", "transfer", "digital"] as const

interface Props { businessId: number }

export function PaymentMethodsListV2({ businessId }: Props) {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [toggling, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editTipo, setEditTipo] = useState("")
  const [editInstructions, setEditInstructions] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getPaymentMethods(businessId).then((res) => {
      if ("methods" in res && res.methods) setMethods(res.methods)
      if ("error" in res && res.error) setError(res.error)
      setLoading(false)
    }).catch(() => { setError("Error al cargar métodos de pago"); setLoading(false) })
  }, [businessId])

  function handleToggle(id: number, currentActive: boolean) {
    startTransition(async () => {
      const res = await togglePaymentMethod(id, businessId, !currentActive)
      if ("error" in res && res.error) setError(res.error)
      else setMethods(prev => prev.map(m => m.id === id ? { ...m, is_active: !currentActive } : m))
    })
  }

  function startEdit(m: PaymentMethod) {
    setEditingId(m.id)
    setEditName(m.name)
    setEditTipo(m.tipo)
    setEditInstructions(typeof m.instructions === "string" ? m.instructions : JSON.stringify(m.instructions) || "")
    setError("")
  }

  function cancelEdit() { setEditingId(null) }

  async function saveEdit(m: PaymentMethod) {
    if (!editName.trim()) return
    setSaving(true)
    const res = await updatePaymentMethod(m.id, businessId, { name: editName.trim(), tipo: editTipo, instructions: editInstructions.trim() || undefined })
    setSaving(false)
    if ("error" in res && res.error) { setError(res.error); return }
    setMethods(prev => prev.map(x => x.id === m.id ? { ...x, name: editName.trim(), tipo: editTipo as PaymentMethod["tipo"], instructions: editInstructions.trim() as unknown as Record<string, unknown> } : x))
    setEditingId(null)
  }

  if (loading) return <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-zf-border/20" />)}</div>
  if (methods.length === 0) return <div className="rounded-xl bg-zf-surface p-8 text-center"><Wallet className="mx-auto h-10 w-10 text-zf-text-muted" /><p className="mt-3 text-xs text-zf-text-secondary">No hay métodos de pago configurados</p></div>

  return (
    <div className="space-y-3">
      {error && <div className="flex items-center gap-2 rounded-xl bg-zf-error-bg/50 px-4 py-3 text-xs text-zf-error-text"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {methods.map((m) => (
          <div key={m.id} className="rounded-xl border border-zf-border/50 bg-zf-surface p-4">
            {editingId === m.id ? (
              <div className="space-y-3">
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full rounded-lg border border-zf-border bg-white px-3 py-2 text-sm text-zf-text focus:border-zf-primary focus:outline-none" />
                <select value={editTipo} onChange={e => setEditTipo(e.target.value)} className="w-full rounded-lg border border-zf-border bg-white px-3 py-2 text-xs text-zf-text focus:border-zf-primary focus:outline-none">
                  {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <textarea value={editInstructions} onChange={e => setEditInstructions(e.target.value)} placeholder="Instrucciones de pago (ej: cuenta bancaria, alias, datos para transferencia)" rows={3} className="w-full rounded-lg border border-zf-border bg-white px-3 py-2 text-xs text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(m)} disabled={saving} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-zf-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />Guardar</button>
                  <button onClick={cancelEdit} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-zf-border px-3 py-2 text-xs font-semibold text-zf-text-secondary"><X className="h-3.5 w-3.5" />Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${TIPO_COLORS[m.tipo] ?? "bg-zf-accent-bg text-zf-accent-text"}`}>
                    {TIPO_ICONS[m.tipo] ?? <Wallet className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zf-text">{m.name}</h3>
                    <p className="text-xs text-zf-text-muted capitalize">{m.tipo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(m)} className="flex h-7 w-7 items-center justify-center rounded-lg text-zf-text-muted hover:bg-zf-accent-bg hover:text-zf-accent-text"><Pencil className="h-3.5 w-3.5" /></button>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" checked={m.is_active} onChange={() => handleToggle(m.id, m.is_active)} disabled={toggling} className="peer sr-only" />
                    <div className="h-5 w-9 rounded-full bg-zf-border after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-zf-primary peer-checked:after:translate-x-full" />
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
