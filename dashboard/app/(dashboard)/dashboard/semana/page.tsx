import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getWeekAppointments } from "@/lib/appointments";
import { getActiveProfessionals } from "@/lib/actions";
import { pool } from "@/lib/db";
import { WeekView } from "@/components/week-view";
import { RefreshButton } from "@/components/refresh-button";
import { SemanaClient } from "@/app/(dashboard)/semana/SemanaClient";

export default async function SemanaPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const businessId = session.user.businessId;
  const professionalId = session.user.professionalId;
  const multiProfessional = session.user.multiProfessional;
  // Solo owner/admin ven el selector con TODOS los profesionales al agendar.
  const isOwnerOrAdmin = professionalId == null;
  const appointments = await getWeekAppointments(businessId, professionalId);

  const { rows: bizRows } = await pool.query(
    "SELECT services_text FROM businesses WHERE id = $1",
    [businessId],
  );
  const servicesText: string = bizRows[0]?.services_text ?? "";
  const professionals = isOwnerOrAdmin ? await getActiveProfessionals(businessId) : [];

  const todayISO = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Bogota",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Semana</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Vista semanal de citas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/semana/bloqueos"
            className="text-xs text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 transition-colors hover:border-[var(--color-accent)]/50"
          >
            Bloqueos
          </Link>
          <RefreshButton />
        </div>
      </div>

      <SemanaClient multiProfessional={multiProfessional} servicesText={servicesText} professionals={professionals}>
        <WeekView appointments={appointments} todayISO={todayISO} multiProfessional={multiProfessional} />
      </SemanaClient>
    </div>
  );
}
