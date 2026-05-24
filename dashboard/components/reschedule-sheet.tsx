"use client";

import { useState, useTransition } from "react";
import { rescheduleAppointment } from "@/lib/actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const HORAS = [
  "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00",
  "17:00", "18:00",
];

function todayISO() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Bogota",
  });
}

interface RescheduleSheetProps {
  appointmentId: number;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RescheduleSheet({
  appointmentId,
  clientName,
  open,
  onOpenChange,
}: RescheduleSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const fecha = formData.get("fecha") as string;
    const hora = formData.get("hora") as string;

    startTransition(async () => {
      const result = await rescheduleAppointment(appointmentId, fecha, hora);
      if (result?.error) {
        setError(result.error);
      } else {
        toast.success("Cita reagendada correctamente");
        onOpenChange(false);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-[var(--bg-card)] border-t border-[var(--border-subtle)] rounded-t-2xl px-6 pb-8 sm:max-w-md sm:ml-auto sm:rounded-l-2xl sm:rounded-t-none sm:border-l sm:border-t-0"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-white text-lg">
            Reagendar — {clientName}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="r-fecha" className="text-[var(--text-secondary)] text-sm">
              Nueva fecha
            </Label>
            <Input
              id="r-fecha"
              name="fecha"
              type="date"
              required
              defaultValue={todayISO()}
              min={todayISO()}
              className="bg-[var(--bg-primary)] border-[var(--border-subtle)] text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-hora" className="text-[var(--text-secondary)] text-sm">
              Nueva hora
            </Label>
            <select
              id="r-hora"
              name="hora"
              required
              defaultValue=""
              className="w-full h-10 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white px-3 text-sm focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="" disabled>Selecciona una hora</option>
              {HORAS.map((h) => (
                <option key={h} value={h} className="bg-[var(--bg-card)]">{h}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-full h-11 mt-2"
          >
            {isPending ? "Guardando..." : "Confirmar reagendamiento"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
