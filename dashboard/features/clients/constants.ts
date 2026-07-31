export const STATUS_BADGE: Record<string, { bg: string; border: string; badge: string; badgeText: string; label: string }> = {
  Pendiente: {
    bg: "#fff7ed", border: "#f97316", badge: "#ffedd5", badgeText: "#9a3412", label: "Pendiente",
  },
  Confirmada: {
    bg: "#f5f0ff", border: "#a78bfa", badge: "#e0d6ff", badgeText: "#5b21b6", label: "Confirmada",
  },
  Completada: {
    bg: "#ecfdf5", border: "#10b981", badge: "#d1fae5", badgeText: "#065f46", label: "Completada",
  },
  Cancelada: {
    bg: "#f9fafb", border: "#d1d5db", badge: "#e5e7eb", badgeText: "#6b7280", label: "Cancelada",
  },
}
