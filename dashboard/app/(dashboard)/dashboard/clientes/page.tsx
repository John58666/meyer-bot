import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ClientTableV2 } from "@/features/clients/components/client-tableV2"

export default async function ClientesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const businessId = session.user.businessId
  const role = session.user.role
  const professionalId = session.user.professionalId
  const isOwnerOrAdmin = role === "owner" || role === "admin"

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zf-text">Clientes</h1>
        <p className="mt-0.5 text-sm text-zf-text-secondary">CRM de clientes</p>
      </div>
      <ClientTableV2 businessId={businessId} isOwnerOrAdmin={isOwnerOrAdmin} userProfessionalId={professionalId} />
    </div>
  )
}
