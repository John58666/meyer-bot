export type AuditAccion =
  | "create_appointment"
  | "cancel_appointment"
  | "complete_appointment"
  | "reactivate_appointment"
  | "reschedule_appointment"
  | "create_bloqueo"
  | "delete_bloqueo"
  | "create_miembro"
  | "toggle_miembro"
  | "update_role"
  | "update_services";

export type AuditEntidad =
  | "appointment"
  | "bloqueo"
  | "user"
  | "business";

export interface AuditLogEntry {
  id: number;
  business_id: number;
  user_id: number | null;
  accion: string;
  entidad: string;
  entidad_id: number | null;
  detalle: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user_name: string | null;
}

export interface AuditLogFilters {
  accion?: string;
  userId?: number;
  desde?: string;
  hasta?: string;
  page: number;
}

export const ACCIONES_LABELS: Record<string, string> = {
  create_appointment: "Crear cita",
  cancel_appointment: "Cancelar cita",
  complete_appointment: "Completar cita",
  reactivate_appointment: "Reactivar cita",
  reschedule_appointment: "Reagendar cita",
  create_bloqueo: "Bloquear agenda",
  delete_bloqueo: "Eliminar bloqueo",
  create_miembro: "Crear miembro",
  toggle_miembro: "Estado miembro",
  update_role: "Cambiar role",
  update_services: "Actualizar servicios",
};
