"use client"

import { useState, useEffect } from "react"
import { ModalV2 } from "@/components/shared/modalV2"
import { createProductV2, updateProductV2 } from "../actionsV2"
import type { Product } from "../actionsV2"
import { Loader2, AlertCircle, Check } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  businessId: number
  product?: Product | null
  onSuccess: () => void
}

type Step = "form" | "success"

export function ProductModalV2({ open, onClose, businessId, product, onSuccess }: Props) {
  const isEditing = !!product
  const [step, setStep] = useState<Step>("form")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [productType, setProductType] = useState<"retail" | "supply">("retail")
  const [costPrice, setCostPrice] = useState("")
  const [salePrice, setSalePrice] = useState("")
  const [stock, setStock] = useState("")
  const [minStockAlert, setMinStockAlert] = useState("5")
  const [ivaIncluded, setIvaIncluded] = useState(true)
  const [ivaPercentage, setIvaPercentage] = useState("19")
  const [supplier, setSupplier] = useState("")

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("form")
      setError("")
      setSaving(false)
      if (product) {
        setName(product.name)
        setSku(product.sku ?? "")
        setDescription(product.description ?? "")
        setCategory(product.category ?? "")
        setProductType((product.product_type as "retail" | "supply") ?? "retail")
        setCostPrice(String(product.cost_price))
        setSalePrice(product.sale_price != null ? String(product.sale_price) : "")
        setStock(String(product.current_stock))
        setMinStockAlert(String(product.min_stock_alert))
        setIvaIncluded(product.iva_included)
        setIvaPercentage(String(product.iva_percentage))
        setSupplier(product.supplier ?? "")
      } else {
        setName(""); setSku(""); setDescription(""); setCategory(""); setProductType("retail")
        setCostPrice(""); setSalePrice(""); setStock("0"); setMinStockAlert("5")
        setIvaIncluded(true); setIvaPercentage("19"); setSupplier("")
      }
    }
  }, [open, product])

  const isSupply = productType === "supply"

  const handleSubmit = async () => {
    setError("")
    const costVal = parseFloat(costPrice)
    if (!name.trim()) { setError("El nombre es obligatorio"); return }
    if (!costPrice || isNaN(costVal) || costVal < 0) { setError("El costo de compra debe ser ≥ 0"); return }

    const saleVal = salePrice ? parseFloat(salePrice) : undefined
    if (saleVal != null && saleVal < 0) { setError("El precio de venta debe ser ≥ 0"); return }

    const data = {
      name: name.trim(), sku: sku.trim() || undefined,
      description: description.trim() || undefined, category: category.trim() || undefined,
      product_type: productType, cost_price: costVal,
      sale_price: isSupply ? undefined : saleVal,
      current_stock: parseInt(stock) || 0, min_stock_alert: parseInt(minStockAlert) || 5,
      iva_included: isSupply ? false : ivaIncluded, iva_percentage: isSupply ? 0 : parseFloat(ivaPercentage) || 0,
      supplier: supplier.trim() || undefined,
    }

    setSaving(true)
    const result = isEditing ? await updateProductV2(businessId, product!.id, data) : await createProductV2(businessId, data)
    setSaving(false)

    if ("error" in result && result.error) {
      setError(result.error)
    } else {
      setStep("success")
      setTimeout(() => { onClose(); onSuccess() }, 1200)
    }
  }

  if (!open) return null

  if (step === "success") {
    return (
      <ModalV2 open={open} onClose={onClose} showCloseButton={false}>
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-success-bg"><Check className="h-7 w-7 text-zf-success-text" /></div>
          <p className="text-lg font-semibold text-zf-text">{isEditing ? "Producto actualizado" : "Producto registrado"}</p>
          <p className="text-sm text-zf-text-secondary">{isEditing ? "Los cambios se han guardado" : "El producto se ha creado correctamente"}</p>
        </div>
      </ModalV2>
    )
  }

  return (
    <ModalV2 open={open} onClose={onClose} title={isEditing ? "Editar Producto" : "Nuevo Producto"} className="w-full max-w-2xl">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">Nombre <span className="text-zf-error-text">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Champú Matizador" className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">SKU / Código</label>
            <input type="text" value={sku} onChange={e => setSku(e.target.value)} placeholder="Ej: CH-MAT-001" className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción del producto" rows={3} className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">Categoría</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ej: Shampoo, Tratamiento" className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">Tipo de Producto</label>
          <div className="flex gap-4">
            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${!isSupply ? "border-zf-primary bg-zf-accent-bg text-zf-accent-text" : "border-zf-border text-zf-text-secondary hover:bg-zf-accent-bg/30"}`}>
              <input type="radio" name="type" checked={!isSupply} onChange={() => setProductType("retail")} className="sr-only" />Venta Directa
            </label>
            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${isSupply ? "border-zf-primary bg-zf-accent-bg text-zf-accent-text" : "border-zf-border text-zf-text-secondary hover:bg-zf-accent-bg/30"}`}>
              <input type="radio" name="type" checked={isSupply} onChange={() => setProductType("supply")} className="sr-only" />Insumo
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">Costo de Compra ($) <span className="text-zf-error-text">*</span></label>
            <input type="number" step="0.01" min="0" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20" />
          </div>
          <div className={`space-y-2 ${isSupply ? "opacity-40 pointer-events-none" : ""}`}>
            <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">Precio de Venta ($)</label>
            <input type="number" step="0.01" min="0" value={salePrice} onChange={e => setSalePrice(e.target.value)} disabled={isSupply} placeholder="0.00" className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">Stock Inicial</label>
            <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} placeholder="0" className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">Alerta Stock Mínimo</label>
            <input type="number" min="0" value={minStockAlert} onChange={e => setMinStockAlert(e.target.value)} placeholder="5" className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20" />
          </div>
        </div>

        <div className={`space-y-3 ${isSupply ? "opacity-40 pointer-events-none" : ""}`}>
          <div className="flex items-center gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={ivaIncluded} onChange={e => setIvaIncluded(e.target.checked)} disabled={isSupply} className="accent-zf-primary h-4 w-4" />
              <span className="text-zf-text">IVA Incluido</span>
            </label>
            <select value={ivaPercentage} onChange={e => setIvaPercentage(e.target.value)} disabled={isSupply}
              className="rounded-xl border border-zf-border bg-white px-3 py-2 text-xs text-zf-text focus:border-zf-primary focus:outline-none">
              <option value="19">IVA 19%</option>
              <option value="5">IVA 5%</option>
              <option value="0">Exento</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zf-text-secondary">Proveedor</label>
          <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Nombre del proveedor" className="w-full rounded-xl border border-zf-border bg-white px-3 py-2.5 text-sm text-zf-text placeholder:text-zf-text-muted focus:border-zf-primary focus:outline-none focus:ring-1 focus:ring-zf-primary/20" />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-zf-error-bg/50 px-4 py-3 text-xs text-zf-error-text"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-zf-border px-4 py-2.5 text-sm font-semibold text-zf-text-secondary transition-all hover:bg-zf-accent-bg disabled:opacity-50">Cancelar</button>
        <button type="button" onClick={handleSubmit} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zf-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 active:scale-[0.97]">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</> : isEditing ? "Guardar Cambios" : "Registrar Producto"}
        </button>
      </div>
    </ModalV2>
  )
}
