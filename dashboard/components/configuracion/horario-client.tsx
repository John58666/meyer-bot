"use client";

import { useState } from "react";
import { updateScheduleText, type ScheduleData } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { ToggleLeft, ToggleRight, AlertCircle } from "lucide-react";

interface HorarioClientProps {
  businessId: number;
  initialSchedule: ScheduleData;
  /** If provided, called instead of updateScheduleText (e.g. for per-professional saves) */
  onSave?: (schedule: ScheduleData) => Promise<{ error?: string } | undefined>;
}

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HorarioClient({ businessId, initialSchedule, onSave }: HorarioClientProps) {
  const [schedule, setSchedule] = useState<ScheduleData>(initialSchedule);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function isOpen(day: number) {
    return schedule[String(day)] != null;
  }

  function toggleDay(day: number) {
    setSchedule((prev) => {
      const next = { ...prev };
      if (next[String(day)]) {
        delete next[String(day)];
      } else {
        next[String(day)] = { open: 9, close: 19 };
      }
      return next;
    });
    setSaved(false);
    setError("");
  }

  function updateHour(day: number, field: "open" | "close", value: number) {
    setSchedule((prev) => {
      const next = { ...prev };
      if (next[String(day)]) {
        next[String(day)] = { ...next[String(day)], [field]: value };
      }
      return next;
    });
    setSaved(false);
    setError("");
  }

  function hasErrors() {
    for (const [day, hs] of Object.entries(schedule)) {
      if (hs.close <= hs.open) return true;
    }
    return false;
  }

  async function handleSave() {
    if (hasErrors()) return;
    setError("");
    setSaving(true);
    const result = onSave
      ? await onSave(schedule)
      : await updateScheduleText(businessId, schedule);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] p-3">
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Define los días y horarios de atención de tu negocio. Los días desactivados aparecerán como cerrados.
        </p>
      </div>

      <div className="space-y-2">
        {DAY_LABELS.map((label, day) => {
          const open = isOpen(day);
          const hs = schedule[String(day)];
          return (
            <div
              key={day}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
                open
                  ? "bg-[var(--bg-card)] border-[var(--border-subtle)]"
                  : "bg-[var(--bg-primary)] border-[var(--border-subtle)] opacity-60",
              )}
            >
              <button
                onClick={() => toggleDay(day)}
                className="shrink-0 text-[var(--text-secondary)] hover:text-white transition-colors"
                title={open ? "Cerrar día" : "Abrir día"}
              >
                {open ? <ToggleRight size={22} className="text-green-400" /> : <ToggleLeft size={22} />}
              </button>

              <span className={cn("text-sm w-20", open ? "text-white font-medium" : "text-[var(--text-secondary)]")}>
                {label}
              </span>

              {open && hs && (
                <div className="flex items-center gap-2 ml-auto">
                  <select
                    value={hs.open}
                    onChange={(e) => updateHour(day, "open", parseInt(e.target.value))}
                    className="px-2 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]/60"
                  >
                    {HOURS.filter((h) => h < (schedule[String(day)]?.close ?? 24)).map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                  <span className="text-[var(--text-secondary)] text-xs">a</span>
                  <select
                    value={hs.close}
                    onChange={(e) => updateHour(day, "close", parseInt(e.target.value))}
                    className="px-2 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]/60"
                  >
                    {HOURS.filter((h) => h > (schedule[String(day)]?.open ?? 0)).map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "00")}:00
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-[var(--color-danger)] flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving || hasErrors()}
        className={cn(
          "w-full rounded-full h-10 text-sm font-semibold text-white transition-all",
          saved ? "bg-[var(--color-success)]" : "bg-[var(--color-accent)] hover:opacity-90",
          (saving || hasErrors()) && "opacity-50 pointer-events-none",
        )}
      >
        {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar horarios"}
      </button>
    </div>
  );
}
