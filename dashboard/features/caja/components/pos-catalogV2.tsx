"use client"

import type { ServiceRow, Product } from "../actionsV2"

interface Props {
  services: ServiceRow[]
  products: Product[]
  activeTab: "services" | "products"
  onTabChange: (tab: "services" | "products") => void
  onAddService: (s: ServiceRow) => void
  onAddProduct: (p: Product) => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(value)
}

export function PosCatalogV2({ services, products, activeTab, onTabChange, onAddService, onAddProduct }: Props) {
  return (
    <div className="flex flex-col rounded-xl border border-zf-border/50 bg-zf-surface">
      <div className="flex border-b border-zf-border/30 p-2">
        <button
          type="button"
          onClick={() => onTabChange("services")}
          className={[
            "flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
            activeTab === "services" ? "bg-zf-primary text-white shadow-sm" : "text-zf-text-secondary hover:text-zf-text",
          ].join(" ")}
        >
          Servicios ({services.length})
        </button>
        <button
          type="button"
          onClick={() => onTabChange("products")}
          className={[
            "flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
            activeTab === "products" ? "bg-zf-primary text-white shadow-sm" : "text-zf-text-secondary hover:text-zf-text",
          ].join(" ")}
        >
          Productos ({products.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "services" ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onAddService(s)}
                className="flex flex-col items-start gap-1 rounded-xl border border-zf-border/30 bg-white p-3 text-left transition-all hover:border-zf-primary/40 hover:shadow-sm active:scale-[0.97]"
              >
                <span className="text-sm font-semibold text-zf-text">{s.name}</span>
                <span className="text-xs text-zf-text-secondary">{s.duration_minutes} min</span>
                <span className="text-sm font-bold text-zf-accent-text">{formatCurrency(s.price)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onAddProduct(p)}
                className="flex flex-col items-start gap-1 rounded-xl border border-zf-border/30 bg-white p-3 text-left transition-all hover:border-zf-primary/40 hover:shadow-sm active:scale-[0.97]"
              >
                <span className="text-sm font-semibold text-zf-text">{p.name}</span>
                <span className="text-xs text-zf-text-muted">{p.product_type === "supply" ? "Insumo" : `Stock: ${p.current_stock}`}</span>
                <span className="text-sm font-bold text-zf-accent-text">{p.product_type === "supply" ? "N/A" : formatCurrency(p.sale_price ?? 0)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
