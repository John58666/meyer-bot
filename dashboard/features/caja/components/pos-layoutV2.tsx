"use client"

import { useState, useEffect, useCallback } from "react"
import { getCatalogServicesV2, getCatalogProductsV2, getPaymentMethodsV2 } from "../actionsV2"
import type { ServiceRow } from "@/lib/services"
import type { Product } from "@/features/inventory/actionsV2"
import { PosCatalogV2 } from "./pos-catalogV2"
import { PosCartV2 } from "./pos-cartV2"
import { AlertCircle } from "lucide-react"

interface Props {
  businessId: number
}

type CartItem = {
  id: number
  name: string
  price: number
  type: "service" | "product"
  quantity: number
}

type PaymentMethod = { id: number; name: string; tipo: string }

export function PosLayoutV2({ businessId }: Props) {
  const [services, setServices] = useState<ServiceRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"services" | "products">("services")
  const [cart, setCart] = useState<CartItem[]>([])

  const loadData = useCallback(async () => {
    setError("")
    setLoading(true)
    try {
      const [svcRes, prodRes, payRes] = await Promise.all([
        getCatalogServicesV2(businessId),
        getCatalogProductsV2(businessId),
        getPaymentMethodsV2(businessId),
      ])
      if (svcRes.services) setServices(svcRes.services)
      if (prodRes.products) setProducts(prodRes.products)
      if (payRes.methods) setPaymentMethods(payRes.methods as PaymentMethod[])
      if (svcRes.error || prodRes.error || payRes.error) setError("Error al cargar datos")
    } catch {
      setError("Error al cargar catálogo")
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  const addService = (s: ServiceRow) => {
    setCart(prev => {
      const existing = prev.find(i => i.type === "service" && i.id === s.id)
      if (existing) return prev.map(i => i.type === "service" && i.id === s.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { id: s.id, name: s.name, price: s.price, type: "service", quantity: 1 }]
    })
  }

  const addProduct = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.type === "product" && i.id === p.id)
      if (existing) return prev.map(i => i.type === "product" && i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { id: p.id, name: p.name, price: p.sale_price ?? 0, type: "product", quantity: 1 }]
    })
  }

  const updateQuantity = (id: number, type: "service" | "product", qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => !(i.type === type && i.id === id)))
      return
    }
    setCart(prev => prev.map(i => i.type === type && i.id === id ? { ...i, quantity: qty } : i))
  }

  const removeItem = (id: number, type: "service" | "product") => {
    setCart(prev => prev.filter(i => !(i.type === type && i.id === id)))
  }

  const resetCart = () => setCart([])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="h-96 animate-pulse rounded-xl bg-zf-border/20" />
        <div className="h-96 animate-pulse rounded-xl bg-zf-border/20" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-zf-border/50 bg-zf-surface py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zf-error-bg"><AlertCircle className="h-7 w-7 text-zf-error-text" /></div>
        <p className="text-sm font-semibold text-zf-error-text">{error}</p>
        <button type="button" onClick={loadData} className="rounded-xl bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90">Reintentar</button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr] lg:h-[calc(100vh-7rem)]">
      <div className="lg:h-full lg:overflow-hidden">
        <PosCatalogV2 services={services} products={products} activeTab={activeTab} onTabChange={setActiveTab}
          onAddService={addService} onAddProduct={addProduct} />
      </div>
      <div className="lg:h-full">
        <PosCartV2 items={cart} paymentMethods={paymentMethods}
          onUpdateQuantity={updateQuantity} onRemoveItem={removeItem} onReset={resetCart} />
      </div>
    </div>
  )
}
