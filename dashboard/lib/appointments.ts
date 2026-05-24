import { pool } from "@/lib/db";

export type Appointment = {
  id: number;
  hora: string;
  nombre: string;
  servicio: string;
  numero: string;
  estado: "Pendiente" | "Confirmada" | "Cancelada" | "Completada";
  created_at: string;
};

export type TodayStats = {
  total: number;
  pendientes: number;
  completadas: number;
  canceladas: number;
};

// Fecha de hoy en timezone Bogotá → formato YYYY-MM-DD
function getTodayBogota(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Bogota",
  });
}

export async function getTodayAppointments(
  businessId: number
): Promise<Appointment[]> {
  const today = getTodayBogota();
  const { rows } = await pool.query(
    `SELECT id, hora::text, nombre, servicio, numero, estado, created_at::text
     FROM appointments
     WHERE fecha = $1 AND business_id = $2
     ORDER BY hora ASC`,
    [today, businessId]
  );
  return rows;
}

export async function getTodayStats(
  businessId: number
): Promise<TodayStats> {
  const today = getTodayBogota();
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)                                    AS total,
       COUNT(*) FILTER (WHERE estado = 'Pendiente')   AS pendientes,
       COUNT(*) FILTER (WHERE estado = 'Completada')  AS completadas,
       COUNT(*) FILTER (WHERE estado = 'Cancelada')   AS canceladas
     FROM appointments
     WHERE fecha = $1 AND business_id = $2`,
    [today, businessId]
  );
  return {
    total:       parseInt(rows[0].total),
    pendientes:  parseInt(rows[0].pendientes),
    completadas: parseInt(rows[0].completadas),
    canceladas:  parseInt(rows[0].canceladas),
  };
}
