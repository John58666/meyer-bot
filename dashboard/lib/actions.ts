"use server";

import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { auth } from "@/auth";
import { parsePrice } from "@/lib/parse-services";
import bcrypt from "bcryptjs";

// ── Crear cita manual ─────────────────────────────────────────
export async function createAppointment(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("No autenticado");

  const nombre = formData.get("nombre") as string;
  const numero = formData.get("numero") as string;
  const servicio = formData.get("servicio") as string;
  const fecha = formData.get("fecha") as string; // YYYY-MM-DD
  const hora = formData.get("hora") as string;   // HH:MM
  const forceOverride = formData.get("forceOverride") === "true";
  const businessId = session.user.businessId;

  if (!nombre || !numero || !servicio || !fecha || !hora) {
    return { error: "Todos los campos son obligatorios" };
  }

  try {
    if (!forceOverride) {
      const { rows } = await pool.query(
        `SELECT id FROM appointments
         WHERE business_id = $1 AND fecha = $2 AND hora = $3::time AND estado != 'Cancelada'`,
        [businessId, fecha, hora],
      );
      if (rows.length > 0) return { conflict: true };
    }

    await pool.query(
      `INSERT INTO appointments (business_id, fecha, hora, nombre, servicio, numero, estado)
       VALUES ($1, $2, $3::time, $4, $5, $6, 'Pendiente')`,
      [businessId, fecha, hora, nombre.trim(), servicio, numero.trim()]
    );

    await pool.query(
      `INSERT INTO customers (business_id, numero, nombre, primera_visita, ultima_visita, total_visitas)
       VALUES ($1, $2, $3, NOW(), NOW(), 1)
       ON CONFLICT (business_id, numero)
       DO UPDATE SET
         nombre        = EXCLUDED.nombre,
         ultima_visita = NOW(),
         total_visitas = customers.total_visitas + 1,
         updated_at    = NOW()`,
      [businessId, numero.trim(), nombre.trim()]
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/semana");
    return { success: true };
  } catch (err) {
    console.error("createAppointment error:", err);
    return { error: "Error al crear la cita" };
  }
}

// ── Actualizar estado ─────────────────────────────────────────
export async function updateAppointmentStatus(
  id: number,
  estado: "Completada" | "Cancelada" | "Pendiente"
) {
  const session = await auth();
  if (!session) throw new Error("No autenticado");

  const professionalId = session.user.professionalId;
  const params: (string | number)[] = [estado, id, session.user.businessId];
  const profFilter = professionalId != null
    ? ` AND professional_id = $${params.push(professionalId)}`
    : '';

  try {
    const { rowCount } = await pool.query(
      `UPDATE appointments
       SET estado = $1, updated_at = NOW()
       WHERE id = $2 AND business_id = $3
       ${profFilter}`,
      params
    );
    if (rowCount === 0) {
      return { error: "No tienes permiso para modificar esta cita" };
    }
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/semana");
    return { success: true };
  } catch (err) {
    console.error("updateAppointmentStatus error:", err);
    return { error: "Error al actualizar la cita" };
  }
}

// ── Reagendar cita ────────────────────────────────────────────
export async function rescheduleAppointment(
  id: number,
  fecha: string,
  hora: string
) {
  const session = await auth();
  if (!session) throw new Error("No autenticado");

  if (!fecha || !hora) return { error: "Fecha y hora son obligatorias" };

  try {
    await pool.query(
      `UPDATE appointments
       SET fecha = $1, hora = $2::time, estado = 'Pendiente', updated_at = NOW()
       WHERE id = $3 AND business_id = $4`,
      [fecha, hora, id, session.user.businessId]
    );
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/semana");
    return { success: true };
  } catch (err) {
    console.error("rescheduleAppointment error:", err);
    return { error: "Error al reagendar la cita" };
  }
}

// ─── MÉTRICAS ────────────────────────────────────────────────────────────────

export type RangoMetricas = 'hoy' | 'semana' | 'mes';

export interface FilaCita {
  estado: string;
  servicio: string;
  hora_slot: number;
  fecha: string;
}

export interface MetricasData {
  totalCitas: number;
  completadas: number;
  pendientes: number;
  canceladas: number;
  tasaCancelacion: number;
  ingresos: number;
  horaPico: number | null;
  historialPorDia: Array<{
    fecha: string;
    total: number;
    ingresos: number;
  }>;
}

export async function getMetricas(
  businessId: number,
  rango: RangoMetricas,
  professionalId?: number | null
): Promise<{ data: MetricasData | null; error: string | null }> {
  try {
    // Calcular rango de fechas en zona America/Bogota
    const ahora = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
    );

    let fechaDesde: string;
    let fechaHasta: string;

    if (rango === 'hoy') {
      const iso = ahora.toISOString().split('T')[0];
      fechaDesde = iso;
      fechaHasta = iso;
    } else if (rango === 'semana') {
      const dia = ahora.getDay();
      const diffLunes = dia === 0 ? -6 : 1 - dia;
      const lunes = new Date(ahora);
      lunes.setDate(ahora.getDate() + diffLunes);
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      fechaDesde = lunes.toISOString().split('T')[0];
      fechaHasta = domingo.toISOString().split('T')[0];
    } else {
      const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
      fechaDesde = primerDia.toISOString().split('T')[0];
      fechaHasta = ultimoDia.toISOString().split('T')[0];
    }

    // Query condicional: solo filtra professional_id si se pasa explícitamente
    // (evita referenciar la columna si aún no existe en el schema)
    const baseParams: (string | number)[] = [businessId, fechaDesde, fechaHasta];
    const profFilter = professionalId != null
      ? ` AND professional_id = $${baseParams.push(professionalId)}`
      : '';

    const { rows: filas } = await pool.query<FilaCita>(
      `SELECT
         estado,
         servicio,
         EXTRACT(HOUR FROM hora)::int AS hora_slot,
         fecha::text
       FROM appointments
       WHERE business_id = $1
         AND fecha BETWEEN $2 AND $3
         ${profFilter}
       ORDER BY fecha ASC, hora ASC`,
      baseParams
    );

    const { rows: negocioRows } = await pool.query<{ services_text: string }>(
      `SELECT services_text FROM businesses WHERE id = $1 LIMIT 1`,
      [businessId]
    );
    const precioMap = parsePrice(negocioRows[0]?.services_text ?? '');

    const totalCitas = filas.length;
    const completadas = filas.filter(f => f.estado === 'Completada').length;
    const pendientes  = filas.filter(f => f.estado === 'Pendiente').length;
    const canceladas  = filas.filter(f => f.estado === 'Cancelada').length;
    const tasaCancelacion = totalCitas > 0
      ? Math.round((canceladas / totalCitas) * 100)
      : 0;

    const ingresos = filas
      .filter(f => f.estado === 'Completada')
      .reduce((acc, f) => acc + (precioMap.get(f.servicio) ?? 0), 0);

    const conteoHoras: Record<number, number> = {};
    filas
      .filter(f => f.estado !== 'Cancelada')
      .forEach(f => {
        conteoHoras[f.hora_slot] = (conteoHoras[f.hora_slot] ?? 0) + 1;
      });
    const horaPico = Object.keys(conteoHoras).length > 0
      ? parseInt(
          Object.entries(conteoHoras).sort((a, b) => b[1] - a[1])[0][0]
        )
      : null;

    const porDia: Record<string, { total: number; ingresos: number }> = {};
    filas.forEach(f => {
      if (!porDia[f.fecha]) porDia[f.fecha] = { total: 0, ingresos: 0 };
      if (f.estado !== 'Cancelada') {
        porDia[f.fecha].total += 1;
      }
      if (f.estado === 'Completada') {
        porDia[f.fecha].ingresos += precioMap.get(f.servicio) ?? 0;
      }
    });

    const historialPorDia = Object.entries(porDia)
      .map(([fecha, v]) => ({ fecha, ...v }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    return {
      data: {
        totalCitas,
        completadas,
        pendientes,
        canceladas,
        tasaCancelacion,
        ingresos,
        horaPico,
        historialPorDia,
      },
      error: null,
    };
  } catch (e) {
    console.error('[getMetricas]', e);
    return { data: null, error: 'Error cargando métricas' };
  }
}

// ─── Bloqueos de agenda ───────────────────────────────────────────────────────

export async function getBloqueos(businessId: number, professionalId?: number | null) {
  const params: number[] = [businessId];
  const profCondition = professionalId != null
    ? `professional_id = $${params.push(professionalId)}`
    : `professional_id IS NULL`;

  const { rows } = await pool.query(
    `SELECT id, fecha::text, tipo, hora_inicio::text, hora_fin::text, motivo
     FROM schedule_exceptions
     WHERE business_id = $1
       AND ${profCondition}
       AND fecha >= (NOW() AT TIME ZONE 'America/Bogota')::date
     ORDER BY fecha ASC`,
    params
  )
  return rows
}

export async function createBloqueo(data: {
  businessId: number
  fecha: string
  tipo: 'cerrado' | 'horario_especial'
  hora_inicio?: string
  hora_fin?: string
  motivo?: string
  professionalId?: number | null
}) {
  const { businessId, fecha, tipo, hora_inicio, hora_fin, motivo, professionalId } = data

  if (tipo === 'horario_especial') {
    if (!hora_inicio || !hora_fin)
      return { error: 'Horario especial requiere hora de inicio y fin' }
    if (hora_inicio >= hora_fin)
      return { error: 'La hora de inicio debe ser menor que la hora de fin' }
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  if (fecha < today) return { error: 'No se pueden bloquear fechas pasadas' }

  await pool.query(
    `INSERT INTO schedule_exceptions (business_id, fecha, tipo, hora_inicio, hora_fin, motivo, professional_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      businessId,
      fecha,
      tipo,
      tipo === 'horario_especial' ? hora_inicio : null,
      tipo === 'horario_especial' ? hora_fin : null,
      motivo || null,
      professionalId ?? null,
    ]
  )
  revalidatePath('/dashboard/semana/bloqueos')
  return { ok: true }
}

export async function deleteBloqueo(id: number, businessId: number) {
  await pool.query(
    `DELETE FROM schedule_exceptions WHERE id = $1 AND business_id = $2`,
    [id, businessId]
  )
  revalidatePath('/dashboard/semana/bloqueos')
  return { ok: true }
}

export async function updateServicesText(businessId: number, servicesText: string) {
  const entries = servicesText.split(',').map(s => s.trim()).filter(Boolean)

  if (entries.length === 0)
    return { error: 'Agrega al menos un servicio' }

  for (const entry of entries) {
    if (!entry.match(/^.+\s*\$[0-9.,]+$/))
      return { error: `Formato inválido: "${entry}". Usa: Nombre $precio` }
  }

  await pool.query(
    `UPDATE businesses SET services_text = $1 WHERE id = $2`,
    [entries.join(', '), businessId]
  )
  revalidatePath('/dashboard/configuracion')
  return { ok: true }
}

// ─── CRM — Clientes ──────────────────────────────────────────────────────────

export interface Cliente {
  id: number;
  numero: string;
  nombre: string;
  total_visitas: number;
  ultima_visita: string | null;
  primera_visita: string | null;
  ultimo_servicio: string | null;
}

export interface ClienteHistorialItem {
  id: number;
  fecha: string;
  hora: string;
  servicio: string;
  estado: string;
}

export async function getClientes(
  businessId: number,
  search?: string,
  professionalId?: number | null
): Promise<{ clientes: Cliente[]; error: string | null }> {
  try {
    const params: (string | number)[] = [businessId];
    const searchFilter =
      search && search.trim().length > 0
        ? ` AND (c.nombre ILIKE $${params.length + 1} OR c.numero ILIKE $${params.length + 1})`
        : "";
    if (search && search.trim().length > 0) {
      params.push(`%${search.trim()}%`);
    }

    // Profesional: solo clientes con al menos una cita atendida por él
    const profFilter = professionalId != null
      ? ` AND EXISTS (
           SELECT 1 FROM appointments a
           WHERE a.business_id = c.business_id
             AND a.numero = c.numero
             AND a.professional_id = $${params.push(professionalId)}
         )`
      : "";

    const { rows } = await pool.query<Cliente>(
      `SELECT
         c.id,
         c.numero,
         c.nombre,
         c.total_visitas,
         c.ultima_visita::text,
         c.primera_visita::text,
         (
           SELECT a.servicio
           FROM appointments a
           WHERE a.business_id = c.business_id
             AND a.numero = c.numero
             AND a.estado = 'Completada'
           ORDER BY a.fecha DESC, a.hora DESC
           LIMIT 1
         ) AS ultimo_servicio
       FROM customers c
       WHERE c.business_id = $1
         ${searchFilter}
         ${profFilter}
       ORDER BY c.ultima_visita DESC NULLS LAST`,
      params
    );

    return { clientes: rows, error: null };
  } catch (e) {
    console.error("[getClientes]", e);
    return { clientes: [], error: "Error cargando clientes" };
  }
}

// ─── Equipo — Gestión de usuarios (solo owner) ────────────────────────────────

export interface MiembroEquipo {
  id: number;
  email: string;
  name: string;
  role: string;
  active: boolean;
  professional_id: number | null;
  professional_name: string | null;
  created_at: string;
}

export async function getEquipo(
  businessId: number
): Promise<{ miembros: MiembroEquipo[]; error: string | null }> {
  try {
    const { rows } = await pool.query<MiembroEquipo>(
      `SELECT u.id, u.email, u.name, u.role, u.active, u.professional_id,
              p.name AS professional_name, u.created_at::text
       FROM users u
       LEFT JOIN professionals p ON p.id = u.professional_id
       WHERE u.business_id = $1
       ORDER BY
         CASE u.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
         u.name ASC`,
      [businessId]
    );
    return { miembros: rows, error: null };
  } catch (e) {
    console.error("[getEquipo]", e);
    return { miembros: [], error: "Error cargando el equipo" };
  }
}

export async function createMiembroEquipo(data: {
  businessId: number;
  email: string;
  password: string;
  name: string;
  role: "admin" | "profesional";
}) {
  const session = await auth();
  if (!session || session.user.role !== "owner") {
    return { error: "No autorizado" };
  }

  const { businessId, email, password, name, role } = data;

  if (!email || !password || !name) {
    return { error: "Todos los campos son obligatorios" };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }
  if (!["admin", "profesional"].includes(role)) {
    return { error: "Role inválido" };
  }

  const client = await pool.connect();
  try {
    const existing = await client.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    if (existing.rows.length > 0) {
      return { error: "Ya existe un usuario con ese email" };
    }

    // ── Validación de límite de plan ──────────────────────────
    const limits = await client.query(
      `SELECT max_professionals, max_admins FROM businesses WHERE id = $1`,
      [businessId]
    );
    const { max_professionals, max_admins } = limits.rows[0];

    if (role === "profesional") {
      const count = await client.query(
        `SELECT COUNT(*) FROM professionals WHERE business_id = $1 AND active = true`,
        [businessId]
      );
      if (parseInt(count.rows[0].count) >= max_professionals) {
        return {
          error: `Tu plan permite hasta ${max_professionals} profesionales. Contacta a soporte para ampliar tu plan.`,
        };
      }
    }

    if (role === "admin") {
      const count = await client.query(
        `SELECT COUNT(*) FROM users WHERE business_id = $1 AND role = 'admin' AND active = true`,
        [businessId]
      );
      if (parseInt(count.rows[0].count) >= max_admins) {
        return {
          error: `Tu plan permite hasta ${max_admins} administrador${max_admins !== 1 ? "es" : ""}. Contacta a soporte para ampliar tu plan.`,
        };
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query("BEGIN");

    let professionalId: number | null = null;

    if (role === "profesional") {
      const profResult = await client.query(
        `INSERT INTO professionals (business_id, name, active)
         VALUES ($1, $2, true)
         RETURNING id`,
        [businessId, name.trim()]
      );
      professionalId = profResult.rows[0].id;
    }

    await client.query(
      `INSERT INTO users (email, password_hash, name, business_id, role, professional_id, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [email.toLowerCase().trim(), passwordHash, name.trim(), businessId, role, professionalId]
    );

    await client.query("COMMIT");
    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("[createMiembroEquipo]", e);
    return { error: "Error creando el usuario" };
  } finally {
    client.release();
  }
}

export async function toggleMiembroActivo(userId: number, businessId: number, active: boolean) {
  const session = await auth();
  if (!session || session.user.role !== "owner") {
    return { error: "No autorizado" };
  }

  try {
    await pool.query(
      `UPDATE users SET active = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3`,
      [active, userId, businessId]
    );
    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (e) {
    console.error("[toggleMiembroActivo]", e);
    return { error: "Error actualizando el usuario" };
  }
}

export async function updateMiembroRole(
  userId: number,
  businessId: number,
  role: "admin" | "profesional"
) {
  const session = await auth();
  if (!session || session.user.role !== "owner") {
    return { error: "No autorizado" };
  }
  if (!["admin", "profesional"].includes(role)) {
    return { error: "Role inválido" };
  }

  try {
    await pool.query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3`,
      [role, userId, businessId]
    );
    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (e) {
    console.error("[updateMiembroRole]", e);
    return { error: "Error actualizando el role" };
  }
}

export async function updateMiembroCredenciales(data: {
  userId: number;
  businessId: number;
  name: string;
  email: string;
  password?: string;
}) {
  const session = await auth();
  if (!session || session.user.role !== "owner") {
    return { error: "No autorizado" };
  }

  const { userId, businessId, name, email, password } = data;

  if (!name?.trim() || !email?.trim()) {
    return { error: "Nombre y email son obligatorios" };
  }
  if (password && password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  try {
    const existing = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2`,
      [email, userId]
    );
    if (existing.rows.length > 0) {
      return { error: "Ese email ya está en uso por otro usuario" };
    }

    const target = await pool.query(
      `SELECT role, professional_id FROM users WHERE id = $1 AND business_id = $2`,
      [userId, businessId]
    );
    if (target.rows.length === 0) {
      return { error: "Usuario no encontrado" };
    }
    if (target.rows[0].role === "owner") {
      return { error: "No se puede editar al dueño desde aquí" };
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.query(
        `UPDATE users SET name = $1, email = $2, password_hash = $3, updated_at = NOW()
         WHERE id = $4 AND business_id = $5`,
        [name.trim(), email.toLowerCase().trim(), passwordHash, userId, businessId]
      );
    } else {
      await pool.query(
        `UPDATE users SET name = $1, email = $2, updated_at = NOW()
         WHERE id = $3 AND business_id = $4`,
        [name.trim(), email.toLowerCase().trim(), userId, businessId]
      );
    }

    const professionalId = target.rows[0].professional_id;
    if (professionalId) {
      await pool.query(
        `UPDATE professionals SET name = $1, updated_at = NOW() WHERE id = $2`,
        [name.trim(), professionalId]
      );
    }

    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (e) {
    console.error("[updateMiembroCredenciales]", e);
    return { error: "Error actualizando el usuario" };
  }
}

export async function getClienteHistorial(
  businessId: number,
  clienteId: number
): Promise<{
  cliente: Omit<Cliente, "ultimo_servicio"> | null;
  historial: ClienteHistorialItem[];
  error: string | null;
}> {
  try {
    const { rows: clienteRows } = await pool.query(
      `SELECT id, numero, nombre, total_visitas,
              ultima_visita::text, primera_visita::text
       FROM customers
       WHERE id = $1 AND business_id = $2
       LIMIT 1`,
      [clienteId, businessId]
    );

    if (clienteRows.length === 0) {
      return { cliente: null, historial: [], error: "Cliente no encontrado" };
    }

    const { rows: historialRows } = await pool.query<ClienteHistorialItem>(
      `SELECT id, fecha::text, hora::text, servicio, estado
       FROM appointments
       WHERE business_id = $1
         AND numero = $2
       ORDER BY fecha DESC, hora DESC
       LIMIT 50`,
      [businessId, clienteRows[0].numero]
    );

    return {
      cliente: clienteRows[0],
      historial: historialRows,
      error: null,
    };
  } catch (e) {
    console.error("[getClienteHistorial]", e);
    return { cliente: null, historial: [], error: "Error cargando historial" };
  }
}
