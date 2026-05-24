"use client";

import { useState, useTransition } from "react";
import { createAppointment } from "@/lib/actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const SERVICIOS = [
  "Corte dama",
  "Corte caballero",
  "Tinte completo",
  "Manicure + pedicure",
  "Peinado especial",
];

const HORAS = [
  "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00",
  "17:00", "18:00",
];

// Fecha de hoy en formato YYYY-MM-DD para el input de fecha
function todayISO() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Bogota",
  });
}

export function NewAppointmentSheet() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createAppointment(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        toast.success("Cita agendada correctamente");
        setOpen(false);
        // Reset form
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <Button
          size="sm"
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-full gap-1"
        >
          <Plus size={16} />
          Nueva cita
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="bg-[var(--bg-card)] border-t border-[var(--border-subtle)] rounded-t-2xl px-6 pb-8 max-h-[92vh] overflow-y-auto sm:max-w-md sm:ml-auto sm:rounded-l-2xl sm:rounded-t-none sm:border-l sm:border-t-0"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-white text-lg">Nueva cita</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="nombre" className="text-[var(--text-secondary)] text-sm">
              Nombre del cliente
            </Label>
            <Input
              id="nombre"
              name="nombre"
              placeholder="Ej: María García"
              required
              className="bg-[var(--bg-primary)] border-[var(--border-subtle)] text-white placeholder:text-[var(--text-muted)]"
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <Label htmlFor="numero" className="text-[var(--text-secondary)] text-sm">
              Teléfono
            </Label>
            <Input
              id="numero"
              name="numero"
              type="tel"
              placeholder="Ej: 3001234567"
              required
              className="bg-[var(--bg-primary)] border-[var(--border-subtle)] text-white placeholder:text-[var(--text-muted)]"
            />
          </div>

          {/* Servicio */}
          <div className="space-y-1.5">
            <Label htmlFor="servicio" className="text-[var(--text-secondary)] text-sm">
              Servicio
            </Label>
            <select
              id="servicio"
              name="servicio"
              required
              defaultValue=""
              className="w-full h-10 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white px-3 text-sm focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="" disabled>
                Selecciona un servicio
              </option>
              {SERVICIOS.map((s) => (
                <option key={s} value={s} className="bg-[var(--bg-card)]">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div className="space-y-1.5">
            <Label htmlFor="fecha" className="text-[var(--text-secondary)] text-sm">
              Fecha
            </Label>
            <Input
              id="fecha"
              name="fecha"
              type="date"
              required
              defaultValue={todayISO()}
              min={todayISO()}
              className="bg-[var(--bg-primary)] border-[var(--border-subtle)] text-white"
            />
          </div>

          {/* Hora */}
          <div className="space-y-1.5">
            <Label htmlFor="hora" className="text-[var(--text-secondary)] text-sm">
              Hora
            </Label>
            <select
              id="hora"
              name="hora"
              required
              defaultValue=""
              className="w-full h-10 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white px-3 text-sm focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="" disabled>
                Selecciona una hora
              </option>
              {HORAS.map((h) => (
                <option key={h} value={h} className="bg-[var(--bg-card)]">
                  {h}
                </option>
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
            {isPending ? "Guardando..." : "Confirmar cita"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
