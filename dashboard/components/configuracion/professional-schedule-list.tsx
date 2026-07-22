"use client";

import { useState, useEffect } from "react";
import { getAllProfessionalSchedules, updateProfessionalSchedule, deleteProfessionalSchedule, getProfessionalSchedule, type ScheduleData } from "@/lib/actions";
import { HorarioClient } from "@/components/configuracion/horario-client";
import { Pencil, Clock, RotateCcw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfessionalScheduleItem {
  professionalId: number;
  professionalName: string;
  schedule: ScheduleData | null;
  hasCustomSchedule: boolean;
  updatedAt: string | null;
}

export function ProfessionalScheduleList({ businessId }: { businessId: number }) {
  const [professionals, setProfessionals] = useState<ProfessionalScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleData | null>(null);

  useEffect(() => {
    loadProfessionals();
  }, [businessId]);

  async function loadProfessionals() {
    setLoading(true);
    const data = await getAllProfessionalSchedules(businessId);
    setProfessionals(data);
    setLoading(false);
  }

  async function handleEdit(professionalId: number) {
    setError("");
    const schedule = await getProfessionalSchedule(businessId, professionalId);
    setEditingId(professionalId);
    setEditingSchedule(schedule ?? {});
  }

  async function handleSave(schedule: ScheduleData): Promise<{ error?: string } | undefined> {
    if (editingId == null) return;
    const result = await updateProfessionalSchedule(businessId, editingId, schedule);
    if (result?.error) {
      setError(result.error);
    } else {
      setEditingId(null);
      setEditingSchedule(null);
      loadProfessionals();
    }
  }

  async function handleRestore(professionalId: number) {
    setError("");
    const result = await deleteProfessionalSchedule(businessId, professionalId);
    if (result?.error) {
      setError(result.error);
    } else {
      loadProfessionals();
    }
  }

  function handleCancel() {
    setEditingId(null);
    setEditingSchedule(null);
    setError("");
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (professionals.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] p-3">
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Edita el horario de cada profesional si trabaja en horarios distintos al del negocio.
          Si un profesional no tiene horario personalizado, usa el horario general del negocio.
        </p>
      </div>

      {professionals.map((prof) => (
        <div key={prof.professionalId}>
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
            editingId === prof.professionalId
              ? "bg-[var(--color-accent)]/5 border-[var(--color-accent)]/30"
              : "bg-[var(--bg-card)] border-[var(--border-subtle)]"
          )}>
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-[var(--color-accent)]" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {prof.professionalName}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {prof.hasCustomSchedule
                  ? "Horario personalizado"
                  : "Usa horario del negocio"}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {editingId === prof.professionalId ? (
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)] hover:border-[var(--color-accent)]/30 transition-colors"
                >
                  Cancelar
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleEdit(prof.professionalId)}
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--color-accent)]/10 transition-colors"
                    title="Editar horario"
                  >
                    <Pencil size={16} />
                  </button>
                  {prof.hasCustomSchedule && (
                    <button
                      onClick={() => handleRestore(prof.professionalId)}
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--color-danger)] hover:bg-red-500/10 transition-colors"
                      title="Restaurar horario del negocio"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {editingId === prof.professionalId && editingSchedule && (
            <div className="mt-2 ml-11">
              <HorarioClient
                businessId={businessId}
                initialSchedule={editingSchedule}
                onSave={handleSave}
              />
            </div>
          )}
        </div>
      ))}

      {error && (
        <p className="text-sm text-[var(--color-danger)] flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}
