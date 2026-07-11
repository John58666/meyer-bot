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

export default async function AuditoriaPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "profesional") redirect("/dashboard");

  const businessId = session.user.businessId;
  const sp = await searchParams;

  const { entries, total, pages } = await getAuditLogs(businessId, {
    accion: sp.accion || undefined,
    userId: sp.userId ? parseInt(sp.userId) : undefined,
    desde: sp.desde || undefined,
    hasta: sp.hasta || undefined,
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
      </div>

      <AuditoriaClient
        entries={entries}
        total={total}
        pages={pages}
        currentPage={sp.page ? parseInt(sp.page) : 1}
        currentAccion={sp.accion || ""}
        currentUserId={sp.userId || ""}
        currentDesde={sp.desde || ""}
        currentHasta={sp.hasta || ""}
        miembros={miembros}
      />
    </div>
  );
}
