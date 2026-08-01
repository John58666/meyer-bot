"use client"

import { useState } from "react"
import { Trash2, Plus, Minus, Check, CreditCard, Banknote, ArrowRightLeft, Smartphone } from "lucide-react"

type CartItem = {
  id: number
  name: string
  price: number
  type: "service" | "product"
  quantity: number
}

type PaymentMethod = { id: number; name: string; tipo: string }

interface Props {
  items: CartItem[]
  paymentMethods: PaymentMethod[]
  onUpdateQuantity: (id: number, type: "service" | "product", qty: number) => void
  onRemoveItem: (id: number, type: "service" | "product") => void
  onReset: () => void
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  transfer: <ArrowRightLeft className="h-4 w-4" />,
  digital: <Smartphone className="h-4 w-4" />,
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(value)
}

export function PosCartV2({ items, paymentMethods, onUpdateQuantity, onRemoveItem, onReset }: Props) {
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const ivaRate = 0.19
  const iva = Math.round(subtotal * ivaRate / (1 + ivaRate) * 100) / 100
  const total = Math.round((subtotal + iva) * 100) / 100

  const handleCheckout = () => {
    if (items.length === 0) return
    setShowSuccess(true)
  }

  const handleNewSale = () => {
    setShowSuccess(false)
    setPaymentMethodId(null)
    onReset()
  }

  if (showSuccess) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-zf-border/50 bg-zf-surface p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zf-success-bg">
          <Check className="h-8 w-8 text-zf-success-text" />
        </div>
        <p className="text-lg font-bold text-zf-text">Venta Exitosa</p>
        <p className="text-sm text-zf-text-secondary">Total: {formatCurrency(total)}</p>
        <p className="text-xs text-zf-text-muted">{items.length} items</p>
        <button type="button" onClick={handleNewSale}
          className="mt-2 rounded-xl bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]">
          Nueva Venta
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-zf-border/50 bg-zf-surface">
      <div className="border-b border-zf-border/30 px-5 py-3">
        <h3 className="text-sm font-semibold text-zf-text">Carrito ({items.length})</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="py-8 text-center text-xs text-zf-text-muted">Agrega servicios o productos del catálogo</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 rounded-lg border border-zf-border/20 bg-white p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zf-text truncate">{item.name}</p>
                  <p className="text-xs text-zf-text-secondary">{formatCurrency(item.price)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => onUpdateQuantity(item.id, item.type, item.quantity - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary hover:bg-zinc-100"><Minus className="h-3 w-3" /></button>
                  <span className="w-8 text-center text-sm font-semibold text-zf-text">{item.quantity}</span>
                  <button type="button" onClick={() => onUpdateQuantity(item.id, item.type, item.quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zf-border bg-white text-zf-text-secondary hover:bg-zinc-100"><Plus className="h-3 w-3" /></button>
                </div>
                <span className="w-16 text-right text-sm font-bold text-zinc-700">{formatCurrency(item.price * item.quantity)}</span>
                <button type="button" onClick={() => onRemoveItem(item.id, item.type)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zf-text-muted hover:bg-zf-error-bg hover:text-zf-error-text"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-zf-border/30 p-4 space-y-3">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-zf-text-secondary"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-zf-text-secondary"><span>IVA (19%)</span><span>{formatCurrency(iva)}</span></div>
          <div className="flex justify-between text-sm font-bold text-zf-text pt-1 border-t border-zf-border/30"><span>Total</span><span>{formatCurrency(total)}</span></div>
        </div>

        {paymentMethods.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zf-text-secondary">Método de pago</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {paymentMethods.map((m) => (
                <button key={m.id} type="button" onClick={() => setPaymentMethodId(m.id)}
                  className={[
                    "flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-all",
                    paymentMethodId === m.id ? "bg-zinc-800 text-white shadow-sm" : "border border-zf-border/30 text-zf-text-secondary hover:bg-zinc-100",
                  ].join(" ")}>
                  {METHOD_ICONS[m.tipo] ?? null}
                  <span className="truncate">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={handleCheckout} disabled={items.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-zinc-700 disabled:opacity-40 active:scale-[0.97]">
          Cobrar {formatCurrency(total)}
        </button>
        {items.length > 0 && !paymentMethodId && (
          <p className="text-center text-xs text-zf-warning-text">Selecciona un método de pago para continuar</p>
        )}
      </div>
    </div>
  )
}
