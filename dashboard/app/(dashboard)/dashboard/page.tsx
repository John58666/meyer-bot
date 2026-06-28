import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTodayAppointments, getTodayStats } from "@/lib/appointments";
import { pool } from "@/lib/db";
import { StatsCards } from "@/components/stats-cards";
import { AppointmentList } from "@/components/appointment-list";
import { RefreshButton } from "@/components/refresh-button";
import { NewAppointmentSheet } from "@/components/new-appointment-sheet";
import { AutoRefresh } from "@/components/auto-refresh";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const businessId = session.user.businessId;
  const multiProfessional = session.user.multiProfessional;

  const [[appointments, stats], bizRows] = await Promise.all([
    Promise.all([getTodayAppointments(businessId), getTodayStats(businessId)]),
    pool
      .query("SELECT services_text FROM businesses WHERE id = $1", [businessId])
      .then((r) => r.rows),
  ]);
  const servicesText: string = bizRows[0]?.services_text ?? "";

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
      <AutoRefresh intervalMs={30000} />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Hoy</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {fechaCapitalizada}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewAppointmentSheet servicesText={servicesText} />
          <RefreshButton />
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Lista de citas */}
      <AppointmentList appointments={appointments} multiProfessional={multiProfessional} />
    </div>
  );
}
