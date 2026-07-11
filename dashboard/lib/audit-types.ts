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

export const ENTIDAD_LABELS: Record<string, string> = {
  appointment: "Cita",
  bloqueo: "Bloqueo",
  user: "Usuario",
  business: "Negocio",
};

export function describirDetalle(accion: string, detalle: Record<string, unknown> | null): string[] {
  if (!detalle) return [];
  switch (accion) {
    case "create_appointment":
    case "complete_appointment":
    case "cancel_appointment":
    case "reschedule_appointment":
      return [
        detalle.nombre ? `Cliente: ${detalle.nombre}` : null,
        detalle.servicio ? `Servicio: ${detalle.servicio}` : null,
        detalle.fecha ? `Fecha: ${detalle.fecha}` : null,
        detalle.hora ? `Hora: ${detalle.hora}` : null,
        detalle.origen ? `Origen: ${detalle.origen === "whatsapp" ? "WhatsApp" : "Dashboard"}` : null,
        detalle.professional_name ? `Profesional: ${detalle.professional_name}` : null,
        detalle.estado_anterior && detalle.estado_nuevo
          ? `Cambio: ${detalle.estado_anterior} → ${detalle.estado_nuevo}`
          : null,
      ].filter(Boolean) as string[];
    case "create_bloqueo":
      return [
        detalle.fecha ? `Fecha bloqueada: ${detalle.fecha}` : null,
        detalle.tipo ? `Tipo: ${detalle.tipo === "cerrado" ? "Cerrado" : "Horario especial"}` : null,
        detalle.motivo ? `Motivo: ${detalle.motivo}` : null,
        detalle.professional_name ? `Profesional: ${detalle.professional_name}` : null,
      ].filter(Boolean) as string[];
    case "delete_bloqueo":
      return [
        detalle.fecha ? `Fecha: ${detalle.fecha}` : null,
        detalle.motivo ? `Motivo: ${detalle.motivo}` : null,
      ].filter(Boolean) as string[];
    case "create_miembro":
    case "toggle_miembro":
    case "update_role":
      return [
        detalle.nombre ? `Nombre: ${detalle.nombre}` : null,
        detalle.email ? `Email: ${detalle.email}` : null,
        detalle.role ? `Rol: ${detalle.role === "owner" ? "Dueño" : detalle.role === "admin" ? "Administrador" : "Profesional"}` : null,
        detalle.estado ? `Estado: ${detalle.estado}` : null,
      ].filter(Boolean) as string[];
    case "update_services":
      return [
        detalle.servicios_count ? `Servicios actualizados: ${detalle.servicios_count}` : null,
        detalle.schedule_days ? `Días de atención: ${detalle.schedule_days}` : null,
      ].filter(Boolean) as string[];
    default:
      return [JSON.stringify(detalle, null, 2)];
  }
}
