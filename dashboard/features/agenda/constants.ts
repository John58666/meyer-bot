export const DAYS_FULL: Record<number, string> = {
  0: "Domingo", 1: "Lunes", 2: "Martes", 3: "Miércoles",
  4: "Jueves", 5: "Viernes", 6: "Sábado",
}

export const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

export const STATUS_BADGE: Record<string, { bg: string; border: string; badge: string; badgeText: string; label: string }> = {
  Pendiente: {
    bg: "#fef3c7",
    border: "#a16207",
    badge: "#fde68a",
    badgeText: "#92400e",
    label: "Pendiente",
  },
  Confirmada: {
    bg: "#f5f0ff",
    border: "#a78bfa",
    badge: "#e0d6ff",
    badgeText: "#5b21b6",
    label: "Confirmada",
  },
  Completada: {
    bg: "#ecfdf5",
    border: "#10b981",
    badge: "#d1fae5",
    badgeText: "#065f46",
    label: "Completada",
  },
  Cancelada: {
    bg: "#f9fafb",
    border: "#d1d5db",
    badge: "#e5e7eb",
    badgeText: "#6b7280",
    label: "Cancelada",
  },
}
