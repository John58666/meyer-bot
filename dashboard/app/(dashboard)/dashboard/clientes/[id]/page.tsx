import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getClienteHistorial } from "@/lib/actions";
import { ClienteHistorialClient } from "@/components/clientes/cliente-historial-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClienteHistorialPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const clienteId = parseInt(id);
  if (isNaN(clienteId)) notFound();

  const { cliente, historial, error } = await getClienteHistorial(
    session.user.businessId,
    clienteId
  );

  if (!cliente) notFound();

  const formatFecha = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso + "T00:00:00").toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/Bogota",
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/clientes"
          className="text-xs text-[var(--text-secondary)] hover:text-white mb-4 inline-flex items-center gap-1 transition-colors"
        >
          ← Volver a clientes
        </Link>
        <h1 className="text-2xl font-bold text-white mt-2">{cliente.nombre}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">{cliente.numero}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Total visitas</p>
          <p className="text-2xl font-bold text-white">{cliente.total_visitas}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Primera visita</p>
          <p className="text-sm font-medium text-white">{formatFecha(cliente.primera_visita)}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Última visita</p>
          <p className="text-sm font-medium text-white">{formatFecha(cliente.ultima_visita)}</p>
        </div>
      </div>

      {/* Historial */}
      <h2 className="text-base font-semibold text-white mb-3">Historial de citas</h2>

      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <ClienteHistorialClient historial={historial} />
      )}
    </div>
  );
}
