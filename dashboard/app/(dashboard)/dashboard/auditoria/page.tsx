import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAuditLogs } from "@/lib/audit";
import { getEquipo } from "@/lib/actions";
import { AuditoriaClient } from "@/components/auditoria/auditoria-client";

interface Props {
  searchParams: Promise<{
    accion?: string;
    userId?: string;
    desde?: string;
    hasta?: string;
    page?: string;
  }>;
}

function getWeekBounds() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { desde: fmt(monday), hasta: fmt(sunday) };
}

export default async function AuditoriaPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "profesional") redirect("/dashboard");

  const businessId = session.user.businessId;
  const sp = await searchParams;
  const week = getWeekBounds();

  const desde = sp.desde || week.desde;
  const hasta = sp.hasta || week.hasta;

  const { entries, total, pages } = await getAuditLogs(businessId, {
    accion: sp.accion || undefined,
    userId: sp.userId ? parseInt(sp.userId) : undefined,
    desde,
    hasta,
    page: sp.page ? parseInt(sp.page) : 1,
  });

  const { miembros } = await getEquipo(businessId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Auditoría</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {total} evento{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xl">
          Registro de acciones realizadas en el sistema: creación, cancelación y reagendamiento de citas,
          cambios de configuración, gestión de usuarios y más. Usa los filtros para buscar eventos por
          acción, usuario o rango de fechas. Por defecto se muestra la semana actual.
        </p>
      </div>

      <AuditoriaClient
        entries={entries}
        total={total}
        pages={pages}
        currentPage={sp.page ? parseInt(sp.page) : 1}
        currentAccion={sp.accion || ""}
        currentUserId={sp.userId || ""}
        currentDesde={desde}
        currentHasta={hasta}
        miembros={miembros}
      />
    </div>
  );
}
