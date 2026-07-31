import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ProductCatalogV2 } from "@/features/inventory/components/product-catalogV2"

export default async function InventarioPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zf-text">Inventario</h1>
        <p className="mt-0.5 text-sm text-zf-text-secondary">Catálogo de productos</p>
      </div>
      <ProductCatalogV2 businessId={session.user.businessId} />
    </div>
  )
}
