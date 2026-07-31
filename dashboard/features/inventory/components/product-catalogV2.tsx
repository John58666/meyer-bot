"use client"

import { useState, useEffect, useCallback } from "react"
import { getProductsV2, toggleProductActiveV2, deleteProductV2 } from "../actionsV2"
import type { Product } from "../actionsV2"
import {
  Search, Plus, Loader2, AlertCircle, SearchX, Package,
  Pencil, Trash2, Power, PowerOff, ChevronLeft, ChevronRight,
} from "lucide-react"
import { ProductModalV2 } from "./product-modalV2"

interface Props {
  businessId: number
}

function formatCurrency(value: number | null): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(value)
}

function getStockBadge(product: Product) {
  const stock = product.current_stock
  const alert = product.min_stock_alert
  if (stock <= 0) return { label: "Agotado", bg: "bg-zf-error-bg", text: "text-zf-error-text" }
  if (stock <= alert) return { label: "Bajo", bg: "bg-zf-warning-bg", text: "text-zf-warning-text" }
  return { label: "Disponible", bg: "bg-zf-success-bg", text: "text-zf-success-text" }
}

export function ProductCatalogV2({ businessId }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [productType, setProductType] = useState("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [lowStock, setLowStock] = useState(0)
  const [noStock, setNoStock] = useState(0)
  const [inventoryValue, setInventoryValue] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [toggleLoading, setToggleLoading] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    setError("")
    setLoading(true)
    try {
      const res = await getProductsV2(businessId, search || undefined, productType !== "all" ? productType : undefined, page)
      if (res.products) setProducts(res.products)
      setTotal(res.total ?? 0)
      setPages(res.pages ?? 0)
      setLowStock(res.lowStock ?? 0)
      setNoStock(res.noStock ?? 0)
      setInventoryValue(res.inventoryValue ?? 0)
      if (res.error) setError(res.error)
    } catch {
      setError("Error al cargar productos")
    } finally {
      setLoading(false)
    }
  }, [businessId, search, productType, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  const handleToggle = async (id: number, active: boolean) => {
    setToggleLoading(id)
    await toggleProductActiveV2(businessId, id, !active)
    setToggleLoading(null)
    loadData()
  }

  const handleDelete = async (id: number) => {
    setDeleteLoading(id)
    await deleteProductV2(businessId, id)
    setDeleteLoading(null)
    loadData()
  }

  if (loading && products.length === 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-zf-border/20" />)}
        </div>
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-zf-border/20" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-zf-border/50 bg-zf-surface py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-error-bg"><AlertCircle className="h-7 w-7 text-zf-error-text" /></div>
        <p className="text-sm font-semibold text-zf-error-text">{error}</p>
        <button type="button" onClick={loadData} className="rounded-xl bg-zf-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90">Reintentar</button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zf-border/50 bg-zf-surface px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zf-accent-bg"><Package className="h-4 w-4 text-zf-accent-text" /></div>
              <div>
                <p className="text-lg font-bold text-zf-text">{total}</p>
                <p className="text-[10px] font-bold uppercase text-zf-text-secondary">Total productos</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zf-border/50 bg-zf-surface px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zf-warning-bg"><AlertCircle className="h-4 w-4 text-zf-warning-text" /></div>
              <div>
                <p className="text-lg font-bold text-zf-text">{lowStock + noStock}</p>
                <p className="text-[10px] font-bold uppercase text-zf-text-secondary">Stock bajo / agotado</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zf-border/50 bg-zf-surface px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zf-success-bg"><Package className="h-4 w-4 text-zf-success-text" /></div>
              <div>
                <p className="text-lg font-bold text-zf-text">{formatCurrency(inventoryValue)}</p>
                <p className="text-[10px] font-bold uppercase text-zf-text-secondary">Valor inventario</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zf-text-muted" />
              <input type="text" placeholder="Buscar por nombre o SKU..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full rounded-xl border border-zf-border bg-white py-2 pl-10 pr-3 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20" />
            </div>
            <select value={productType} onChange={(e) => { setProductType(e.target.value); setPage(1) }}
              className="rounded-xl border border-zf-border bg-white px-3 py-2 text-xs text-zf-text focus:border-zf-primary focus:outline-none">
              <option value="all">Todos los tipos</option>
              <option value="retail">Venta Directa</option>
              <option value="supply">Insumo</option>
            </select>
          </div>
          <button type="button" onClick={() => { setEditingProduct(null); setModalOpen(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-zf-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]">
            <Plus className="h-3.5 w-3.5" />Nuevo Producto
          </button>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zf-border/50 bg-zf-surface py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-bg"><SearchX className="h-6 w-6 text-zf-text-muted" /></div>
            <p className="text-sm font-medium text-zf-text-secondary">{search ? "Sin resultados" : "Sin productos registrados"}</p>
            {!search && <button type="button" onClick={() => { setEditingProduct(null); setModalOpen(true) }}
              className="flex items-center gap-1.5 rounded-xl bg-zf-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]">
              <Plus className="h-4 w-4" />Registrar primer producto</button>}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-zf-border/50 bg-zf-surface">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zf-border/30 bg-zf-bg/50 text-[10px] font-bold uppercase text-zf-text-secondary">
                    <th className="px-5 py-3">Producto</th>
                    <th className="px-5 py-3">SKU</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Costo</th>
                    <th className="px-5 py-3">Precio</th>
                    <th className="px-5 py-3 text-center">Stock</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zf-border/10">
                  {products.map((p) => {
                    const badge = getStockBadge(p)
                    return (
                      <tr key={p.id} className={`transition-colors hover:bg-zf-accent-bg/10 ${!p.active ? "opacity-40" : ""}`}>
                        <td className="px-5 py-3">
                          <p className="text-sm font-semibold text-zf-text">{p.name}</p>
                          {p.description && <p className="text-xs text-zf-text-secondary truncate max-w-[200px]">{p.description}</p>}
                        </td>
                        <td className="px-5 py-3"><span className="text-sm text-zf-text-secondary">{p.sku || "—"}</span></td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.product_type === "supply" ? "bg-zf-neutral-bg text-zf-text-muted" : "bg-zf-accent-bg text-zf-accent-text"}`}>
                            {p.product_type === "supply" ? "Insumo" : "Retail"}
                          </span>
                        </td>
                        <td className="px-5 py-3"><span className="text-sm text-zf-text-secondary">{formatCurrency(p.cost_price)}</span></td>
                        <td className="px-5 py-3"><span className="text-sm text-zf-text-secondary">{p.product_type === "supply" ? "—" : formatCurrency(p.sale_price)}</span></td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badge.bg} ${badge.text}`}>
                            {badge.label} ({p.current_stock})
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => { setEditingProduct(p); setModalOpen(true) }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-zf-text-secondary transition-colors hover:bg-zf-accent-bg hover:text-zf-accent-text" title="Editar">
                              <Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => handleToggle(p.id, p.active)} disabled={toggleLoading === p.id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-zf-text-secondary transition-colors hover:bg-zf-accent-bg" title={p.active ? "Desactivar" : "Activar"}>
                              {toggleLoading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : p.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}</button>
                            <button type="button" onClick={() => handleDelete(p.id)} disabled={deleteLoading === p.id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-zf-text-secondary transition-colors hover:bg-zf-error-bg hover:text-zf-error-text" title="Eliminar">
                              {deleteLoading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-between text-xs text-zf-text-secondary">
                <span>Mostrando {(page-1)*10+1}-{Math.min(page*10, total)} de {total}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zf-border bg-white disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page >= pages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zf-border bg-white disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {modalOpen && <ProductModalV2 open={modalOpen} onClose={() => setModalOpen(false)} businessId={businessId} product={editingProduct} onSuccess={loadData} />}
    </>
  )
}
