import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar, BottomNav } from "@/components/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Topbar user={session.user} />
      <Sidebar />
      <main className="ml-0 sm:ml-[56px] mt-[56px] pb-[56px] sm:pb-0 p-6">{children}</main>
      <BottomNav />
    </div>
  );
}
