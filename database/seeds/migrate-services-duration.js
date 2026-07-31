#!/usr/bin/env node
/**
 * Seed: Migrar services_text → tabla services + llenar hora_fin en citas existentes.
 *
 * Uso: node migrate-services-duration.js
 *
 * Lee credenciales de DB desde ../../dashboard/.env.local o DATABASE_URL en el entorno.
 */

const path = require('path');
const fs = require('fs');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

const envPath = path.resolve(__dirname, '../../dashboard/.env.local');
loadEnvFile(envPath);

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.POSTGRES_HOST     || 'localhost',
  port:     parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB       || 'meyer_db',
  user:     process.env.POSTGRES_USER     || 'meyer_user',
  password: process.env.POSTGRES_PASSWORD || '',
});

function parseServices(servicesText) {
  const result = [];
  if (!servicesText) return result;
  servicesText.split(',').forEach(entry => {
    const match = entry.match(/^(.+?)\s*\$([0-9.,]+)(?:\s*\((\d+)min\))?/);
    if (!match) return;
    const nombre = match[1].trim();
    const precioStr = match[2].replace(/\./g, '').replace(',', '.');
    const precio = parseFloat(precioStr);
    if (!isNaN(precio)) {
      const item = { nombre, precio };
      if (match[3]) item.duracion = parseInt(match[3], 10);
      result.push(item);
    }
  });
  return result;
}

async function main() {
  console.log('=== Migrar services_text → services table ===\n');

  // 1. Migrar servicios
  const { rows: businesses } = await pool.query(
    'SELECT id, name, services_text FROM businesses WHERE services_text IS NOT NULL AND services_text != \'\''
  );
  console.log(`Negocios con services_text: ${businesses.length}`);

  let totalServices = 0;
  for (const biz of businesses) {
    const servicios = parseServices(biz.services_text);
    if (servicios.length === 0) {
      console.log(`  [${biz.name}] Sin servicios parseables, skipping`);
      continue;
    }

    for (const svc of servicios) {
      const duracion = svc.duracion || 30;
      await pool.query(
        `INSERT INTO services (business_id, name, price, duration_minutes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (business_id, name)
         DO UPDATE SET price = EXCLUDED.price, duration_minutes = EXCLUDED.duration_minutes`,
        [biz.id, svc.nombre, svc.precio, duracion]
      );
      totalServices++;
    }
    console.log(`  [${biz.name}] ${servicios.length} servicios migrados`);
  }
  console.log(`\nTotal servicios migrados: ${totalServices}\n`);

  // 2. Asignar todos los servicios a todos los profesionales activos
  // (conservador: asumimos que cualquier profesional puede hacer cualquier servicio)
  const { rows: professionals } = await pool.query(
    'SELECT id, business_id, name FROM professionals WHERE active = true'
  );
  console.log(`Profesionales activos: ${professionals.length}`);

  let totalAssignments = 0;
  for (const prof of professionals) {
    const { rows: bizServices } = await pool.query(
      'SELECT id FROM services WHERE business_id = $1',
      [prof.business_id]
    );
    if (bizServices.length === 0) continue;

    for (const svc of bizServices) {
      await pool.query(
        `INSERT INTO professional_services (professional_id, service_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [prof.id, svc.id]
      );
      totalAssignments++;
    }
  }
  console.log(`Asignaciones profesional-servicio: ${totalAssignments}\n`);

  // 3. Llenar hora_fin para citas existentes (default: 30 min)
  const updateResult = await pool.query(
    `UPDATE appointments
     SET hora_fin = (hora + INTERVAL '30 minutes')::time
     WHERE hora_fin IS NULL`
  );
  console.log(`Citas actualizadas con hora_fin: ${updateResult.rowCount}\n`);

  console.log('=== Migración completada ===');
}

main()
  .catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
