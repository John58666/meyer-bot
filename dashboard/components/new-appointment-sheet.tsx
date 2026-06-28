"use client";

import { useState, useTransition, useRef } from "react";
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
import { cn } from "@/lib/utils";

const SERVICIOS_FALLBACK = [
  "Corte dama",
  "Corte caballero",
  "Tinte completo",
  "Manicure + pedicure",
  "Peinado especial",
];

// Parsea "Corte caballero $18.000, Corte+barba $22.000" → ["Corte caballero", "Corte+barba"]
function parseServices(text: string): string[] {
  if (!text?.trim()) return [];
  return text
    .split(",")
    .map((s) => s.replace(/\$[\d.,]+/, "").trim())
    .filter(Boolean);
}

function todayISO() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Bogota",
  });
}

interface NewAppointmentSheetProps {
  fecha?: string;          // YYYY-MM-DD — precarga la fecha si viene del calendario
  servicesText?: string;   // "Nombre $precio, ..." — si no viene usa lista hardcodeada
  trigger?: React.ReactNode; // botón custom desde el calendario
}

export function NewAppointmentSheet({
  fecha: fechaProp,
  servicesText,
  trigger,
}: NewAppointmentSheetProps = {}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [fecha, setFecha] = useState(fechaProp ?? todayISO());
  const [hora, setHora] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const servicios = servicesText
    ? parseServices(servicesText)
    : SERVICIOS_FALLBACK;

  function resetForm() {
    setError("");
    setConflict(false);
    setHora("");
    setFecha(fechaProp ?? todayISO());
    formRef.current?.reset();
  }

  async function submitForm(forceOverride: boolean) {
    if (!formRef.current) return;
    setError("");
    setConflict(false);
    const formData = new FormData(formRef.current);
    if (forceOverride) formData.set("forceOverride", "true");

    startTransition(async () => {
      const result = await createAppointment(formData);
      if (result?.conflict) {
        setConflict(true);
      } else if (result?.error) {
        setError(result.error);
      } else {
        toast.success("Cita agendada correctamente");
        setOpen(false);
        resetForm();
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submitForm(false);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <SheetTrigger>
        {trigger ?? (
          <Button
            size="sm"
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-full gap-1"
          >
            <Plus size={16} />
            Nueva cita
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="bg-[var(--bg-card)] border-t border-[var(--border-subtle)] rounded-t-2xl px-6 pb-8 max-h-[92vh] overflow-y-auto sm:max-w-md sm:ml-auto sm:rounded-l-2xl sm:rounded-t-none sm:border-l sm:border-t-0"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-white text-lg">Nueva cita</SheetTitle>
        </SheetHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
              {servicios.map((s) => (
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
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              min={todayISO()}
              className="bg-[var(--bg-primary)] border-[var(--border-subtle)] text-white"
            />
          </div>

          {/* Hora — input libre, sin slots fijos */}
          <div className="space-y-1.5">
            <Label htmlFor="hora" className="text-[var(--text-secondary)] text-sm">
              Hora
            </Label>
            <input
              id="hora"
              name="hora"
              type="time"
              required
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className={cn(
                "w-full rounded-md border border-[var(--border-subtle)] px-3 h-10",
                "text-sm bg-[var(--bg-primary)] text-white",
                "focus:outline-none focus:border-[var(--color-accent)]",
              )}
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          )}

          {conflict ? (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 space-y-2">
              <p className="text-sm text-yellow-400">
                Ya hay una cita a esa hora. ¿Querés confirmar igual?
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={() => submitForm(true)}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full h-9 text-sm"
                >
                  {isPending ? "Guardando..." : "Sí, confirmar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConflict(false)}
                  className="flex-1 rounded-full h-9 text-sm"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-full h-11 mt-2"
            >
              {isPending ? "Guardando..." : "Confirmar cita"}
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
