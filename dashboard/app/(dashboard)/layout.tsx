import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

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
      <main className="ml-[56px] mt-[56px] p-6">{children}</main>
    </div>
  );
}
