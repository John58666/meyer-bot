"use client"

import { useState, useEffect, useTransition } from "react"
import { getPaymentMethods, togglePaymentMethod } from "@/features/config-payments/actionsV2"
import type { PaymentMethod } from "@/features/config-payments/actionsV2"
import { Wallet, CreditCard, Banknote, Landmark, Smartphone, AlertCircle } from "lucide-react"

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

interface PaymentMethodsListV2Props {
  businessId: number
}

export function PaymentMethodsListV2({ businessId }: PaymentMethodsListV2Props) {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [toggling, startTransition] = useTransition()

  useEffect(() => {
    getPaymentMethods(businessId).then((res) => {
      if (res.methods) {
        setMethods(res.methods)
      } else {
        setError(res.error ?? "Error al cargar métodos de pago")
      }
      setLoading(false)
    }).catch(() => {
      setError("Error de conexión al cargar métodos de pago")
      setLoading(false)
    })
  }, [businessId])

  function handleToggle(id: number, currentActive: boolean) {
    setError("")
    startTransition(async () => {
      const res = await togglePaymentMethod(id, businessId, !currentActive)
      if (res.error) {
        setError(res.error)
      } else {
        setMethods((prev) =>
          prev.map((m) => (m.id === id ? { ...m, is_active: !currentActive } : m))
        )
      }
    })
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse rounded-xl bg-zf-surface p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-zf-border/30" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-zf-border/30" />
                <div className="h-3 w-24 rounded bg-zf-border/20" />
              </div>
              <div className="h-6 w-12 rounded-full bg-zf-border/30" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (methods.length === 0) {
    return (
      <div className="rounded-xl bg-zf-surface p-8 text-center shadow-sm">
        <Wallet className="mx-auto h-10 w-10 text-zf-text-muted" />
        <p className="mt-3 text-sm text-zf-text-secondary">No hay métodos de pago configurados.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {methods.map((method) => (
          <div
            key={method.id}
            className="flex items-center justify-between rounded-xl bg-zf-surface p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${TIPO_COLORS[method.tipo] ?? "bg-zf-accent-bg text-zf-accent-text"}`}
              >
                {TIPO_ICONS[method.tipo] ?? <Wallet className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zf-text">{method.name}</h3>
                <p className="text-xs text-zf-text-muted capitalize">{method.tipo}</p>
              </div>
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={method.is_active}
                onChange={() => handleToggle(method.id, method.is_active)}
                disabled={toggling}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-zf-border after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-zf-primary peer-checked:after:translate-x-full" />
            </label>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-zf-error-text">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  )
}
