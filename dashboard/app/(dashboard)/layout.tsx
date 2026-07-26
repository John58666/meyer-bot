import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar, BottomNav } from "@/components/topbar";
import { Footer } from "@/components/footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Topbar user={session.user} role={session.user.role} />
      <Sidebar role={session.user.role} />
      <main className="ml-0 lg:ml-[56px] mt-[56px] pb-[56px] lg:pb-0 p-6">
        {children}
        <Footer businessName={session.user.businessName} />
      </main>
      <BottomNav />
    </div>
  );
}
