import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DashboardPageV2 } from "@/features/dashboard-home/components/dashboard-pageV2"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const businessId = session.user.businessId
  const professionalId = session.user.professionalId
  const isOwnerOrAdmin = session.user.role === "owner" || session.user.role === "admin";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zf-text">Dashboard</h1>
        <p className="mt-0.5 text-sm text-zf-text-secondary">Métricas del negocio</p>
      </div>
      <DashboardPageV2 businessId={businessId} isOwnerOrAdmin={isOwnerOrAdmin} userProfessionalId={professionalId} />
    </div>
  )
}
