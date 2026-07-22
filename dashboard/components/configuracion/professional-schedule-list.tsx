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

export function ProfessionalScheduleList({ businessId, professionalId }: { businessId: number; professionalId?: number | null }) {
  const [professionals, setProfessionals] = useState<ProfessionalScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleData | null>(null);
  const isOwnerOrAdmin = professionalId == null;

  useEffect(() => {
    loadProfessionals();
  }, [businessId]);

  async function loadProfessionals() {
    setLoading(true);
    const data = await getAllProfessionalSchedules(businessId);
    setProfessionals(data);
    setLoading(false);
  }

  async function handleEdit(pid: number) {
    setError("");
    const schedule = await getProfessionalSchedule(businessId, pid);
    setEditingId(pid);
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

  async function handleRestore(pid: number) {
    setError("");
    const result = await deleteProfessionalSchedule(businessId, pid);
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

  const displayed = isOwnerOrAdmin
    ? professionals
    : professionals.filter(p => p.professionalId === professionalId);

  if (displayed.length === 0) return null;

  if (!isOwnerOrAdmin) {
    const prof = displayed[0];

    async function handleProfessionalSave(schedule: ScheduleData) {
      const result = await updateProfessionalSchedule(businessId, prof.professionalId, schedule);
      if (result?.error) {
        setError(result.error);
        return result;
      }
      setError("");
      loadProfessionals();
      return result;
    }

    return (
      <div className="space-y-3">
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] p-3">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Define tus días y horarios de atención. Si no configuras un horario personalizado, se usará el horario general del negocio.
          </p>
        </div>
        <HorarioClient
          businessId={businessId}
          initialSchedule={prof.schedule ?? {}}
          onSave={handleProfessionalSave}
        />
        {prof.hasCustomSchedule && (
          <button
            onClick={() => handleRestore(prof.professionalId)}
            className="w-full rounded-full h-10 text-sm font-semibold text-[var(--color-danger)] border border-[var(--color-danger)]/30 hover:bg-red-500/10 transition-all"
          >
            Restaurar horario del negocio
          </button>
        )}
        {error && (
          <p className="text-sm text-[var(--color-danger)] flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] p-3">
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Edita el horario de cada profesional si trabaja en horarios distintos al del negocio.
          Si un profesional no tiene horario personalizado, usa el horario general del negocio.
        </p>
      </div>

      {displayed.map((prof) => (
        <div key={prof.professionalId}>
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 rounded-xl border transition-colors",
            editingId === prof.professionalId
              ? "bg-[var(--color-accent)]/5 border-[var(--color-accent)]/30"
              : "bg-[var(--bg-card)] border-[var(--border-subtle)]"
          )}>
            <div className="hidden sm:flex w-8 h-8 rounded-full bg-[var(--color-accent)]/10 items-center justify-center shrink-0">
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

            <div className="flex items-center gap-1 shrink-0">
              {editingId === prof.professionalId ? (
                <button
                  onClick={handleCancel}
                  className="px-2.5 py-1.5 sm:px-3 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)] hover:border-[var(--color-accent)]/30 transition-colors"
                >
                  Cancelar
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleEdit(prof.professionalId)}
                    className="p-1.5 sm:p-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--color-accent)]/10 transition-colors"
                    title="Editar horario"
                  >
                    <Pencil size={14} className="sm:size-[16px]" />
                  </button>
                  {prof.hasCustomSchedule && (
                    <button
                      onClick={() => handleRestore(prof.professionalId)}
                      className="p-1.5 sm:p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--color-danger)] hover:bg-red-500/10 transition-colors"
                      title="Restaurar horario del negocio"
                    >
                      <RotateCcw size={14} className="sm:size-[16px]" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {editingId === prof.professionalId && editingSchedule && (
            <div className="mt-2 sm:ml-11">
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
