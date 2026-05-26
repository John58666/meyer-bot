import type { WeekAppointment } from "@/lib/appointments";
import { Calendar } from "lucide-react";

interface WeekViewProps {
  appointments: Record<string, WeekAppointment[]>;
  todayISO: string;
}

const DAYS_ES: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const statusConfig: Record<string, { bg: string; text: string }> = {
  Pendiente:  { bg: "bg-[var(--color-warning)]/10",  text: "text-[var(--color-warning)]" },
  Confirmada: { bg: "bg-[var(--color-success)]/10",  text: "text-[var(--color-success)]" },
  Completada: { bg: "bg-white/5",                    text: "text-[var(--text-secondary)]" },
  Cancelada:  { bg: "bg-[var(--color-danger)]/10",   text: "text-[var(--color-danger)]"  },
};

function formatHora(hora: string): string {
  const [h, m] = hora.split(":");
  const hour = parseInt(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${suffix}`;
}

// Genera los 7 días de la semana (lun–dom) a partir de una fecha ISO
function getWeekDays(todayISO: string): string[] {
  const today = new Date(todayISO + "T00:00:00");
  const day = today.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + diffToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function WeekView({ appointments, todayISO }: WeekViewProps) {
  const weekDays = getWeekDays(todayISO);
  const totalSemana = Object.values(appointments).flat().length;

  return (
    <div className="space-y-4">
      {/* Resumen semanal */}
      <p className="text-sm text-[var(--text-secondary)]">
        {totalSemana} {totalSemana === 1 ? "cita" : "citas"} esta semana
      </p>

      {weekDays.map((dateISO) => {
        const date = new Date(dateISO + "T00:00:00Z");
        const dayName = DAYS_ES[date.getUTCDay()];
        const dayNum = date.getUTCDate();
        const month = MONTHS_ES[date.getUTCMonth()];
        const isToday = dateISO === todayISO;
        const dayCitas = appointments[dateISO] ?? [];

        return (
          <div key={dateISO}>
            {/* Header del día */}
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  isToday
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--bg-card)] text-[var(--text-secondary)]"
                }`}
              >
                {dayNum}
              </div>
              <span
                className={`text-sm font-medium ${
                  isToday ? "text-white" : "text-[var(--text-secondary)]"
                }`}
              >
                {dayName} {dayNum} de {month}
                {isToday && (
                  <span className="ml-2 text-xs text-[var(--color-accent)]">
                    hoy
                  </span>
                )}
              </span>
              {dayCitas.length > 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  {dayCitas.length} {dayCitas.length === 1 ? "cita" : "citas"}
                </span>
              )}
            </div>

            {/* Citas del día o placeholder vacío */}
            {dayCitas.length === 0 ? (
              <div className="ml-11 py-3 px-4 rounded-lg border border-dashed border-[var(--border-subtle)] text-sm text-[var(--text-muted)]">
                Sin citas
              </div>
            ) : (
              <div className="ml-11 space-y-2">
                {dayCitas.map((apt) => {
                  const status = statusConfig[apt.estado] ?? statusConfig.Pendiente;
                  return (
                    <div
                      key={apt.id}
                      className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 flex items-center gap-3"
                    >
                      <span className="text-sm font-medium text-[var(--color-accent)] w-16 flex-shrink-0">
                        {formatHora(apt.hora)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white break-words leading-tight">
                          {apt.nombre}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] break-words">
                          {apt.servicio}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${status.bg} ${status.text}`}
                      >
                        {apt.estado}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
