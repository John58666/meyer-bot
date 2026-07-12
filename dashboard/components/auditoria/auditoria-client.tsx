"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, X, ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";
import { ACCIONES_LABELS, ENTIDAD_LABELS, describirDetalle } from "@/lib/audit-types";
import type { AuditLogEntry } from "@/lib/audit-types";
import type { MiembroEquipo } from "@/lib/actions";

interface Props {
  entries: AuditLogEntry[];
  total: number;
  pages: number;
  currentPage: number;
  currentAccion: string;
  currentUserId: string;
  currentDesde: string;
  currentHasta: string;
  miembros: MiembroEquipo[];
}

export function AuditoriaClient({
  entries,
  total,
  pages,
  currentPage,
  currentAccion,
  currentUserId,
  currentDesde,
  currentHasta,
  miembros,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [accion, setAccion] = useState(currentAccion);
  const [userId, setUserId] = useState(currentUserId);
  const [desde, setDesde] = useState(currentDesde);
  const [hasta, setHasta] = useState(currentHasta);

  function buildUrl(page: number) {
    const params = new URLSearchParams();
    if (accion) params.set("accion", accion);
    if (userId) params.set("userId", userId);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return `/dashboard/auditoria${qs ? `?${qs}` : ""}`;
  }

  function applyFilters() {
    router.push(buildUrl(1));
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const accionOptions = Object.entries(ACCIONES_LABELS);

  const userOptions = miembros
    .filter((m) => m.role !== "owner" || m.id === miembros.find((x) => x.role === "owner")?.id)
    .map((m) => ({ id: String(m.id), label: `${m.name} (${m.email})` }));

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Acción</label>
            <select
              value={accion}
              onChange={(e) => setAccion(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]/60"
            >
              <option value="">Todas</option>
              {accionOptions.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Usuario</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]/60"
            >
              <option value="">Todos</option>
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]/60"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]/60"
            />
          </div>
        </div>
        <button
          onClick={applyFilters}
          title="Aplicar filtros"
          className="mt-3 w-full sm:w-auto px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Filtrar
        </button>
      </div>

      {/* Tabla */}
      {entries.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-8 text-center">
          <ShieldAlert size={40} className="mx-auto mb-3 text-[var(--text-secondary)]" />
          <p className="text-[var(--text-secondary)] text-sm">
            No hay eventos de auditoría aún. Los eventos aparecerán aquí cuando se realicen acciones como crear o cancelar citas.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border-subtle)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">Acción</th>
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium hidden sm:table-cell">Usuario</th>
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium hidden md:table-cell">Entidad</th>
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={
                    i !== entries.length - 1
                      ? "border-b border-[var(--border-subtle)]"
                      : ""
                  }
                >
                  <td className="px-4 py-3 text-white font-medium">
                    {ACCIONES_LABELS[entry.accion] || entry.accion}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] hidden sm:table-cell">
                    {entry.user_name ? entry.user_name : <span className="text-[var(--text-secondary)]/60">WhatsApp</span>}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] hidden md:table-cell">
                    {ENTIDAD_LABELS[entry.entidad] || entry.entidad}{entry.entidad_id ? ` #${entry.entidad_id}` : ""}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                    {formatDate(entry.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(selected?.id === entry.id ? null : entry)}
                      className="text-[var(--text-secondary)] hover:text-white transition-colors"
                      title="Ver detalle"
                    >
                      {selected?.id === entry.id ? <X size={16} /> : <Eye size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer de detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border-subtle)] h-full overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Detalle del evento</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-[var(--text-secondary)] hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-[var(--text-secondary)] text-xs mb-0.5">Acción</dt>
                <dd className="text-white">{ACCIONES_LABELS[selected.accion] || selected.accion}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)] text-xs mb-0.5">Usuario</dt>
                <dd className="text-white">{selected.user_name ? selected.user_name : <span className="text-[var(--text-secondary)]/60">WhatsApp</span>}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)] text-xs mb-0.5">Entidad</dt>
                <dd className="text-white">{ENTIDAD_LABELS[selected.entidad] || selected.entidad}{selected.entidad_id ? ` #${selected.entidad_id}` : ""}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)] text-xs mb-0.5">Fecha</dt>
                <dd className="text-white">{formatDate(selected.created_at)}</dd>
              </div>
              {selected.ip_address && (
                <div>
                  <dt className="text-[var(--text-secondary)] text-xs mb-0.5">IP</dt>
                  <dd className="text-white font-mono text-xs">{selected.ip_address}</dd>
                </div>
              )}
              {(() => {
                const lineas = describirDetalle(selected.accion, selected.detalle);
                return lineas.length > 0 ? (
                  <div>
                    <dt className="text-[var(--text-secondary)] text-xs mb-0.5">Detalle</dt>
                    <dd className="text-white bg-[var(--bg-primary)] rounded-lg p-3 space-y-1">
                      {lineas.map((l, i) => (
                        <p key={i} className="text-xs">{l}</p>
                      ))}
                    </dd>
                  </div>
                ) : null;
              })()}
            </dl>
          </div>
        </div>
      )}

      {/* Paginación */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => router.push(buildUrl(currentPage - 1))}
            disabled={currentPage <= 1}
            title="Página anterior"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => router.push(buildUrl(p))}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                p === currentPage
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => router.push(buildUrl(currentPage + 1))}
            disabled={currentPage >= pages}
            title="Página siguiente"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
