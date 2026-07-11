import { pool } from "@/lib/db";
import { headers } from "next/headers";
import type { AuditAccion, AuditEntidad, AuditLogEntry } from "./audit-types";

export { ACCIONES_LABELS } from "./audit-types";
export type { AuditLogEntry } from "./audit-types";

export async function auditar(
  businessId: number,
  userId: number | null,
  accion: AuditAccion,
  entidad: AuditEntidad,
  entidadId: number | null,
  detalle: Record<string, unknown> | null,
) {
  let ipAddress: string | null = null;
  try {
    const h = await headers();
    ipAddress = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null;
    if (ipAddress) ipAddress = ipAddress.split(",")[0].trim();
  } catch {
    // headers() puede fallar en algunos contextos
  }

  try {
    await pool.query(
      `INSERT INTO audit_log (business_id, user_id, accion, entidad, entidad_id, detalle, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [businessId, userId, accion, entidad, entidadId, detalle ? JSON.stringify(detalle) : null, ipAddress],
    );
  } catch (e) {
    console.error("[auditar] error:", e);
  }
}

const ITEMS_PER_PAGE = 20;

export async function getAuditLogs(
  businessId: number,
  filters: { accion?: string; userId?: number; desde?: string; hasta?: string; page: number },
): Promise<{ entries: AuditLogEntry[]; total: number; pages: number }> {
  const conditions: string[] = ["a.business_id = $1"];
  const params: (string | number)[] = [businessId];
  let paramIndex = 2;

  if (filters.accion) {
    conditions.push(`a.accion = $${paramIndex++}`);
    params.push(filters.accion);
  }
  if (filters.userId) {
    conditions.push(`a.user_id = $${paramIndex++}`);
    params.push(filters.userId);
  }
  if (filters.desde) {
    conditions.push(`a.created_at >= $${paramIndex++}::timestamptz`);
    params.push(filters.desde);
  }
  if (filters.hasta) {
    conditions.push(`a.created_at <= $${paramIndex++}::timestamptz`);
    params.push(filters.hasta);
  }

  const where = conditions.join(" AND ");

  const countResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM audit_log a WHERE ${where}`,
    params,
  );
  const total = countResult.rows[0].total;
  const pages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const offset = (filters.page - 1) * ITEMS_PER_PAGE;
  params.push(ITEMS_PER_PAGE, offset);

  const { rows } = await pool.query<AuditLogEntry>(
    `SELECT a.id, a.business_id, a.user_id, a.accion, a.entidad, a.entidad_id,
            a.detalle, a.ip_address, a.created_at,
            u.name AS user_name
     FROM audit_log a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE ${where}
     ORDER BY a.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    params,
  );

  return { entries: rows, total, pages };
}
