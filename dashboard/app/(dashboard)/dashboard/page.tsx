import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTodayAppointments, getTodayStats } from "@/lib/appointments";
import { StatsCards } from "@/components/stats-cards";
import { AppointmentList } from "@/components/appointment-list";
import { RefreshButton } from "@/components/refresh-button";
import { NewAppointmentSheet } from "@/components/new-appointment-sheet";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const businessId = session.user.businessId;

  const [appointments, stats] = await Promise.all([
    getTodayAppointments(businessId),
    getTodayStats(businessId),
  ]);

  // Fecha de hoy en español para el header
  const fechaHoy = new Date().toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const fechaCapitalizada =
    fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Hoy</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {fechaCapitalizada}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewAppointmentSheet />
          <RefreshButton />
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Lista de citas */}
      <AppointmentList appointments={appointments} />
    </div>
  );
}
