"use client";

import { useState, useTransition } from "react";
import { updateAppointmentStatus } from "@/lib/actions";
import { RescheduleSheet } from "@/components/reschedule-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoreVertical, CheckCircle, XCircle, Calendar } from "lucide-react";
import { toast } from "sonner";

interface AppointmentActionsProps {
  id: number;
  nombre: string;
  estado: string;
}

export function AppointmentActions({
  id,
  nombre,
  estado,
}: AppointmentActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);

  function handleComplete() {
    startTransition(async () => {
      const result = await updateAppointmentStatus(id, "Completada");
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Cita marcada como completada");
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await updateAppointmentStatus(id, "Cancelada");
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Cita cancelada");
        setShowCancelDialog(false);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"
            disabled={isPending}
          >
            <MoreVertical size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-[var(--bg-card)] border-[var(--border-subtle)] text-white min-w-[160px]"
        >
          {estado !== "Completada" && (
            <DropdownMenuItem
              onClick={handleComplete}
              className="cursor-pointer focus:bg-white/5 gap-2"
            >
              <CheckCircle size={14} className="text-[var(--color-success)]" />
              Completada
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => setShowReschedule(true)}
            className="cursor-pointer focus:bg-white/5 gap-2"
          >
            <Calendar size={14} className="text-[var(--color-accent)]" />
            Reagendar
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[var(--border-subtle)]" />
          {estado !== "Cancelada" && (
            <DropdownMenuItem
              onClick={() => setShowCancelDialog(true)}
              className="cursor-pointer text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:bg-white/5 gap-2"
            >
              <XCircle size={14} />
              Cancelar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmación cancelar */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-subtle)] text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Cancelar esta cita?</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              La cita de {nombre} quedará como cancelada. Esta acción se puede
              revertir cambiando el estado manualmente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              className="border-[var(--border-subtle)] text-white hover:bg-white/5"
            >
              Volver
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isPending}
              className="bg-[var(--color-danger)] hover:bg-red-700 text-white"
            >
              {isPending ? "Cancelando..." : "Sí, cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet para reagendar */}
      <RescheduleSheet
        appointmentId={id}
        clientName={nombre}
        open={showReschedule}
        onOpenChange={setShowReschedule}
      />
    </>
  );
}
