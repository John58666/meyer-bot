import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SidebarV2 } from "@/components/shared/sidebarV2"
import { TopbarV2 } from "@/components/shared/topbarV2"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-zf-bg">
      <TopbarV2 />
      <SidebarV2 />
      <main className="ml-0 mt-14 pb-14 p-6 lg:ml-16 lg:pb-0">
        {children}
      </main>
    </div>
  )
}
