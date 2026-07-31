import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PosLayoutV2 } from "@/features/caja/components/pos-layoutV2"

export default async function CajaPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-zf-text">Caja</h1>
        <p className="mt-0.5 text-sm text-zf-text-secondary">Punto de venta</p>
      </div>
      <PosLayoutV2 businessId={session.user.businessId} />
    </div>
  )
}
