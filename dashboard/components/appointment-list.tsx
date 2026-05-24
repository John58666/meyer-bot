import type { Appointment } from "@/lib/appointments";
import { Calendar } from "lucide-react";

interface AppointmentListProps {
  appointments: Appointment[];
}

const statusConfig = {
  Pendiente:  { label: "Pendiente",  bg: "bg-[var(--color-warning)]/10",  text: "text-[var(--color-warning)]" },
  Confirmada: { label: "Confirmada", bg: "bg-[var(--color-success)]/10",  text: "text-[var(--color-success)]" },
  Completada: { label: "Completada", bg: "bg-white/5",                    text: "text-[var(--text-secondary)]" },
  Cancelada:  { label: "Cancelada",  bg: "bg-[var(--color-danger)]/10",   text: "text-[var(--color-danger)]"  },
};

function formatHora(hora: string): string {
  // hora viene como "09:00:00" → "9:00 AM"
  const [h, m] = hora.split(":");
  const hour = parseInt(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${suffix}`;
}

function formatPhone(numero: string): string {
  const clean = numero.replace(/\D/g, "");
  if (clean.length === 10) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return clean;
}

export function AppointmentList({ appointments }: AppointmentListProps) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar size={40} className="text-[var(--text-muted)] mb-3" />
        <p className="text-[var(--text-primary)] font-medium mb-1">
          No hay citas hoy
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Las citas agendadas por WhatsApp aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        Citas del día — {appointments.length}{" "}
        {appointments.length === 1 ? "cita" : "citas"}
      </h2>
      {appointments.map((apt) => {
        const status = statusConfig[apt.estado] ?? statusConfig.Pendiente;
        return (
          <div
            key={apt.id}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 flex items-center gap-4"
          >
            {/* Hora */}
            <div className="flex-shrink-0 w-16 h-16 bg-[var(--color-accent)]/10 rounded-xl flex flex-col items-center justify-center">
              <span className="text-[var(--color-accent)] font-bold text-sm leading-tight">
                {formatHora(apt.hora).split(" ")[0]}
              </span>
              <span className="text-[var(--color-accent)] text-xs">
                {formatHora(apt.hora).split(" ")[1]}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{apt.nombre}</p>
              <p className="text-sm text-[var(--text-secondary)] truncate">
                {apt.servicio}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {formatPhone(apt.numero)}
              </p>
            </div>

            {/* Estado */}
            <div className="flex-shrink-0">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}
              >
                {status.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
