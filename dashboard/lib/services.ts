"use server";

import { pool } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { auditar } from "@/lib/audit";

export interface ServiceRow {
  id: number;
  business_id: number;
  name: string;
  price: number;
  duration_minutes: number;
  active: boolean;
}

export interface ServiceInput {
  name: string;
  price: number;
  duration_minutes: number;
}

export async function getServices(businessId: number): Promise<ServiceRow[]> {
  const { rows } = await pool.query<ServiceRow>(
    `SELECT id, business_id, name, price, duration_minutes, active
     FROM services
     WHERE business_id = $1 AND active = true
     ORDER BY name`,
    [businessId]
  );
  return rows;
}

export async function getAllServices(businessId: number): Promise<ServiceRow[]> {
  const { rows } = await pool.query<ServiceRow>(
    `SELECT id, business_id, name, price, duration_minutes, active
     FROM services
     WHERE business_id = $1
     ORDER BY active DESC, name`,
    [businessId]
  );
  return rows;
}

export async function getServiceById(serviceId: number): Promise<ServiceRow | null> {
  const { rows } = await pool.query<ServiceRow>(
    `SELECT id, business_id, name, price, duration_minutes, active
     FROM services WHERE id = $1`,
    [serviceId]
  );
  return rows[0] ?? null;
}

export async function getServiceByName(businessId: number, name: string): Promise<ServiceRow | null> {
  const { rows } = await pool.query<ServiceRow>(
    `SELECT id, business_id, name, price, duration_minutes, active
     FROM services
     WHERE business_id = $1
       AND (LOWER(name) = LOWER($2) OR LOWER($2) LIKE LOWER(name) || ' $%')
     ORDER BY LENGTH(name) DESC
     LIMIT 1`,
    [businessId, name]
  );
  return rows[0] ?? null;
}


export async function getServiceDuration(businessId: number, serviceName: string): Promise<number> {
  const svc = await getServiceByName(businessId, serviceName);
  return svc?.duration_minutes ?? 30;
}

export async function getServicePrice(businessId: number, serviceName: string): Promise<number> {
  const svc = await getServiceByName(businessId, serviceName);
  return svc?.price ?? 0;
}

export async function buildPriceMap(businessId: number): Promise<Map<string, number>> {
  const { rows } = await pool.query<{ name: string; price: number }>(
    `SELECT name, price FROM services WHERE business_id = $1 AND active = true`,
    [businessId]
  );
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.name, r.price);
    const formatted = `${r.name} $${r.price.toLocaleString('es-CO')}`;
    map.set(formatted, r.price);
  }
  return map;
}

export async function regenerateServicesText(businessId: number) {
  const { rows } = await pool.query<{ name: string; price: number }>(
    `SELECT name, price FROM services WHERE business_id = $1 AND active = true ORDER BY name`,
    [businessId]
  );
  const text = rows
    .map(r => `${r.name} $${r.price.toLocaleString('es-CO')}`)
    .join(', ');
  await pool.query(
    `UPDATE businesses SET services_text = $1 WHERE id = $2`,
    [text, businessId]
  );
}

export async function createService(data: ServiceInput) {
  const session = await auth();
  if (!session) return { error: "No autenticado" };
  if (session.user.role !== "owner" && session.user.role !== "admin")
    return { error: "No autorizado" };

  if (!data.name?.trim()) return { error: "El nombre del servicio es obligatorio" };
  if (!data.price || data.price <= 0) return { error: "El precio debe ser mayor a 0" };
  if (!data.duration_minutes || data.duration_minutes < 15)
    return { error: "La duración mínima es 15 minutos" };
  if (data.duration_minutes > 480)
    return { error: "La duración máxima es 480 minutos (8 horas)" };

  const existing = await getServiceByName(session.user.businessId, data.name.trim());
  if (existing) return { error: "Ya existe un servicio con ese nombre" };

  try {
    const { rows } = await pool.query(
      `INSERT INTO services (business_id, name, price, duration_minutes)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [session.user.businessId, data.name.trim(), data.price, data.duration_minutes]
    );

    auditar(session.user.businessId, parseInt(session.user.id), "update_services", "business", session.user.businessId, {
      accion: "crear",
      servicio: data.name.trim(),
      precio: data.price,
      duracion: data.duration_minutes,
    });

    await regenerateServicesText(session.user.businessId);
    revalidatePath("/dashboard/configuracion");
    return { ok: true, id: rows[0].id };
  } catch (e) {
    console.error("[createService]", e);
    return { error: "Error al crear el servicio" };
  }
}

export async function updateService(serviceId: number, data: ServiceInput) {
  const session = await auth();
  if (!session) return { error: "No autenticado" };
  if (session.user.role !== "owner" && session.user.role !== "admin")
    return { error: "No autorizado" };

  if (!data.name?.trim()) return { error: "El nombre del servicio es obligatorio" };
  if (!data.price || data.price <= 0) return { error: "El precio debe ser mayor a 0" };
  if (!data.duration_minutes || data.duration_minutes < 15)
    return { error: "La duración mínima es 15 minutos" };

  const svc = await pool.query(
    `SELECT id FROM services WHERE id = $1 AND business_id = $2`,
    [serviceId, session.user.businessId]
  );
  if (svc.rows.length === 0) return { error: "Servicio no encontrado" };

  const dup = await pool.query(
    `SELECT id FROM services
     WHERE business_id = $1 AND LOWER(name) = LOWER($2) AND id != $3`,
    [session.user.businessId, data.name.trim(), serviceId]
  );
  if (dup.rows.length > 0) return { error: "Ya existe otro servicio con ese nombre" };

  try {
    await pool.query(
      `UPDATE services SET name = $1, price = $2, duration_minutes = $3
       WHERE id = $4 AND business_id = $5`,
      [data.name.trim(), data.price, data.duration_minutes, serviceId, session.user.businessId]
    );

    auditar(session.user.businessId, parseInt(session.user.id), "update_services", "business", session.user.businessId, {
      accion: "editar",
      servicio_id: serviceId,
      nombre: data.name.trim(),
      precio: data.price,
      duracion: data.duration_minutes,
    });

    await regenerateServicesText(session.user.businessId);
    revalidatePath("/dashboard/configuracion");
    return { ok: true };
  } catch (e) {
    console.error("[updateService]", e);
    return { error: "Error al actualizar el servicio" };
  }
}

export async function toggleServiceActive(serviceId: number, active: boolean) {
  const session = await auth();
  if (!session) return { error: "No autenticado" };
  if (session.user.role !== "owner" && session.user.role !== "admin")
    return { error: "No autorizado" };

  try {
    await pool.query(
      `UPDATE services SET active = $1 WHERE id = $2 AND business_id = $3`,
      [active, serviceId, session.user.businessId]
    );

    await regenerateServicesText(session.user.businessId);
    revalidatePath("/dashboard/configuracion");
    return { ok: true };
  } catch (e) {
    console.error("[toggleServiceActive]", e);
    return { error: "Error al actualizar el servicio" };
  }
}

export async function deleteService(serviceId: number) {
  const session = await auth();
  if (!session) return { error: "No autenticado" };
  if (session.user.role !== "owner" && session.user.role !== "admin")
    return { error: "No autorizado" };

  try {
    await pool.query(
      `DELETE FROM services WHERE id = $1 AND business_id = $2`,
      [serviceId, session.user.businessId]
    );

    await regenerateServicesText(session.user.businessId);
    revalidatePath("/dashboard/configuracion");
    return { ok: true };
  } catch (e) {
    console.error("[deleteService]", e);
    return { error: "Error al eliminar el servicio" };
  }
}

export async function getProfessionalServices(
  businessId: number,
  professionalId: number
): Promise<number[]> {
  const { rows } = await pool.query<{ service_id: number }>(
    `SELECT ps.service_id
     FROM professional_services ps
     JOIN services s ON s.id = ps.service_id
     WHERE ps.professional_id = $1 AND s.business_id = $2 AND s.active = true
     ORDER BY s.name`,
    [professionalId, businessId]
  );
  return rows.map(r => r.service_id);
}

export async function setProfessionalServices(
  professionalId: number,
  serviceIds: number[]
) {
  const session = await auth();
  if (!session) return { error: "No autenticado" };
  const isOwnerAdmin = session.user.role === "owner" || session.user.role === "admin";
  const isOwnProfile = session.user.role === "profesional" && session.user.professionalId === professionalId;
  if (!isOwnerAdmin && !isOwnProfile)
    return { error: "No autorizado" };

  try {
    await pool.query("DELETE FROM professional_services WHERE professional_id = $1", [professionalId]);

    if (serviceIds.length > 0) {
      const values = serviceIds.map((_, i) => `($1, $${i + 2})`).join(", ");
      await pool.query(
        `INSERT INTO professional_services (professional_id, service_id) VALUES ${values}`,
        [professionalId, ...serviceIds]
      );
    }

    await regenerateServicesText(session.user.businessId);
    revalidatePath("/dashboard/configuracion");
    return { ok: true };
  } catch (e) {
    console.error("[setProfessionalServices]", e);
    return { error: "Error al actualizar servicios del profesional" };
  }
}

export async function canProfessionalProvideService(
  professionalId: number,
  serviceId: number
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM professional_services
     WHERE professional_id = $1 AND service_id = $2`,
    [professionalId, serviceId]
  );
  return rows.length > 0;
}
