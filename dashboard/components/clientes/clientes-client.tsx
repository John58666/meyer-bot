"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Cliente } from "@/lib/actions";

interface Props {
  clientes: Cliente[];
}

export function ClientesClient({ clientes }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.numero.includes(q)
    );
  }, [clientes, search]);

  const formatFecha = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Bogota",
    });
  };

  return (
    <div className="space-y-4">
      {/* Búsqueda */}
      <input
        type="text"
        placeholder="Buscar por nombre o número..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-white placeholder-[var(--text-secondary)] text-sm focus:outline-none focus:border-[var(--color-accent)]/60"
      />

      {/* Tabla */}
      {filtered.length === 0 ? (
        <p className="text-[var(--text-secondary)] text-sm py-8 text-center">
          {search ? "Sin resultados para esa búsqueda." : "Aún no hay clientes registrados."}
        </p>
      ) : (
        <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">Nombre</th>
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium hidden sm:table-cell">Número</th>
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">Visitas</th>
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium hidden md:table-cell">Último servicio</th>
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium hidden md:table-cell">Última visita</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/dashboard/clientes/${c.id}`)}
                  className={`cursor-pointer transition-colors hover:bg-[var(--color-accent)]/5 ${
                    i !== filtered.length - 1 ? "border-b border-[var(--border-subtle)]" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-white font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] hidden sm:table-cell">{c.numero}</td>
                  <td className="px-4 py-3 text-white">{c.total_visitas}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] hidden md:table-cell">
                    {c.ultimo_servicio ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] hidden md:table-cell">
                    {formatFecha(c.ultima_visita)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
