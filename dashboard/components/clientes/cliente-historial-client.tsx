"use client";

import type { ClienteHistorialItem } from "@/lib/actions";

interface Props {
  historial: ClienteHistorialItem[];
}

const ESTADO_STYLES: Record<string, string> = {
  Completada: "bg-green-500/10 text-green-400",
  Pendiente:  "bg-yellow-500/10 text-yellow-400",
  Cancelada:  "bg-red-500/10 text-red-400",
};

export function ClienteHistorialClient({ historial }: Props) {
  if (historial.length === 0) {
    return (
      <p className="text-[var(--text-secondary)] text-sm py-8 text-center">
        Sin citas registradas.
      </p>
    );
  }

  const formatFecha = (iso: string) => {
    return new Date(iso + "T00:00:00").toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Bogota",
    });
  };

  const formatHora = (hora: string) => {
    const [hh, mm] = hora.split(":").map(Number);
    const ampm = hh < 12 ? "AM" : "PM";
    const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
    return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
  };

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">Fecha</th>
            <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium hidden sm:table-cell">Hora</th>
            <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">Servicio</th>
            <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {historial.map((item, i) => (
            <tr
              key={item.id}
              className={i !== historial.length - 1 ? "border-b border-[var(--border-subtle)]" : ""}
            >
              <td className="px-4 py-3 text-white">{formatFecha(item.fecha)}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)] hidden sm:table-cell">
                {formatHora(item.hora)}
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{item.servicio}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    ESTADO_STYLES[item.estado] ?? "bg-gray-500/10 text-gray-400"
                  }`}
                >
                  {item.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
