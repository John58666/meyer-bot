import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getWeekAppointments } from "@/lib/appointments";
import { WeekView } from "@/components/week-view";
import { RefreshButton } from "@/components/refresh-button";
import { SemanaClient } from "@/app/(dashboard)/semana/SemanaClient";

export default async function SemanaPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const businessId = session.user.businessId;
  const appointments = await getWeekAppointments(businessId);

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
        <RefreshButton />
      </div>

      <SemanaClient>
        <WeekView appointments={appointments} todayISO={todayISO} />
      </SemanaClient>
    </div>
  );
}
