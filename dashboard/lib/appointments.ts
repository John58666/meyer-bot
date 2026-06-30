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
  businessId: number,
  professionalId?: number | null
): Promise<Appointment[]> {
  const today = getTodayBogota();
  const params: (string | number)[] = [today, businessId];
  const profFilter = professionalId != null
    ? ` AND professional_id = $${params.push(professionalId)}`
    : '';

  const { rows } = await pool.query(
    `SELECT id, hora::text, nombre, servicio, numero, estado, created_at::text
     FROM appointments
     WHERE fecha = $1 AND business_id = $2
     ${profFilter}
     ORDER BY hora ASC`,
    params
  );
  return rows;
}

export async function getTodayStats(
  businessId: number,
  professionalId?: number | null
): Promise<TodayStats> {
  const today = getTodayBogota();
  const params: (string | number)[] = [today, businessId];
  const profFilter = professionalId != null
    ? ` AND professional_id = $${params.push(professionalId)}`
    : '';

  const { rows } = await pool.query(
    `SELECT
       COUNT(*)                                    AS total,
       COUNT(*) FILTER (WHERE estado = 'Pendiente')   AS pendientes,
       COUNT(*) FILTER (WHERE estado = 'Completada')  AS completadas,
       COUNT(*) FILTER (WHERE estado = 'Cancelada')   AS canceladas
     FROM appointments
     WHERE fecha = $1 AND business_id = $2
     ${profFilter}`,
    params
  );
  return {
    total:       parseInt(rows[0].total),
    pendientes:  parseInt(rows[0].pendientes),
    completadas: parseInt(rows[0].completadas),
    canceladas:  parseInt(rows[0].canceladas),
  };
}

export type WeekAppointment = Appointment & {
  fecha: string; // YYYY-MM-DD
};

export type AppointmentRow = {
  id: number;
  fecha: string;
  hora: string;
  nombre: string;
  servicio: string;
  numero: string;
  estado: "Pendiente" | "Confirmada" | "Cancelada" | "Completada";
};

export async function getAppointmentsByMonth(
  businessId: number,
  year: number,
  month: number,
  professionalId?: number | null
): Promise<AppointmentRow[]> {
  const params: number[] = [businessId, year, month];
  const profFilter = professionalId != null
    ? ` AND professional_id = $${params.push(professionalId)}`
    : '';

  const { rows } = await pool.query(
    `SELECT id, fecha::text, hora::text, nombre, servicio, numero, estado
     FROM appointments WHERE business_id = $1
     AND DATE_TRUNC('month', fecha) = DATE_TRUNC('month', make_date($2, $3, 1))
     ${profFilter}
     ORDER BY fecha, hora`,
    params
  );
  return rows;
}

export async function getWeekAppointments(
  businessId: number,
  professionalId?: number | null
): Promise<Record<string, WeekAppointment[]>> {
  // Lunes de esta semana en Bogotá
  const nowBogota = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })
  );
  const day = nowBogota.getDay(); // 0=dom, 1=lun...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(nowBogota);
  monday.setDate(nowBogota.getDate() + diffToMonday);

  // Domingo de esta semana
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const toISO = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  const params: (string | number)[] = [toISO(monday), toISO(sunday), businessId];
  const profFilter = professionalId != null
    ? ` AND professional_id = $${params.push(professionalId)}`
    : '';

  const { rows } = await pool.query(
    `SELECT id, fecha::text, hora::text, nombre, servicio, numero, estado, created_at::text
     FROM appointments
     WHERE fecha BETWEEN $1 AND $2
       AND business_id = $3
       ${profFilter}
     ORDER BY fecha ASC, hora ASC`,
    params
  );

  // Agrupar por fecha
  const grouped: Record<string, WeekAppointment[]> = {};
  for (const row of rows) {
    if (!grouped[row.fecha]) grouped[row.fecha] = [];
    grouped[row.fecha].push(row);
  }
  return grouped;
}
