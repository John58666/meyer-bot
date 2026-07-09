#!/usr/bin/env node
/**
 * migrate-from-sheets.js
 * One-shot migration: Google Sheets "CItas Peluqueria" → PostgreSQL appointments
 *
 * PRECONDICIONES:
 *   1. PostgreSQL corriendo con schema.sql ya aplicado
 *   2. secrets/google-credentials.json presente (Service Account con acceso al Sheet)
 *   3. npm install googleapis pg dotenv
 *
 * USO:
 *   node migrate-from-sheets.js [--dry-run]
 *
 * --dry-run: muestra lo que haría sin escribir en PostgreSQL
 */

require('dotenv').config();
const { google } = require('googleapis');
const { Pool }   = require('pg');
const path       = require('path');
const fs         = require('fs');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SPREADSHEET_ID  = '1gMfpG-7AN3TmqOOL2xTDgNE3Y_G8PNuwCsVsm-4JsW8';
const SHEET_NAME      = 'Datos clientes';
const BUSINESS_ID     = 1;  // Meyer en la tabla businesses
const DRY_RUN         = process.argv.includes('--dry-run');
const CREDENTIALS_PATH = path.join(__dirname, '../secrets/google-credentials.json');

if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error('❌ No se encontró secrets/google-credentials.json');
  process.exit(1);
}

// ── GOOGLE SHEETS CLIENT ──────────────────────────────────────────────────────
async function getSheetData() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:G`,
  });
  return res.data.values || [];
}

// ── PARSERS ───────────────────────────────────────────────────────────────────
/**
 * DD/MM/YYYY → YYYY-MM-DD (PostgreSQL DATE)
 * Retorna null si el formato es inválido
 */
function parseDate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const d = new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`);
  if (isNaN(d.getTime())) return null;
  return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
}

/**
 * "H:MM" | "HH:MM" → "HH:MM:00" (PostgreSQL TIME)
 * Retorna null si el formato es inválido
 */
function parseTime(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, hh, mm] = match;
  const h = parseInt(hh), m = parseInt(mm);
  if (h > 23 || m > 59) return null;
  return `${hh.padStart(2,'0')}:${mm}:00`;
}

/**
 * Normalizar número de WhatsApp: quitar @s.whatsapp.net y no-dígitos
 */
function parseNumber(raw) {
  if (!raw) return null;
  return raw.replace(/@s\.whatsapp\.net/g, '').replace(/\D/g, '');
}

/**
 * Normalizar estado: solo valores válidos del CHECK constraint
 */
function parseEstado(raw) {
  if (!raw) return 'Pendiente';
  const valid = ['Pendiente', 'Confirmada', 'Cancelada', 'Completada'];
  const found = valid.find(v => v.toLowerCase() === raw.trim().toLowerCase());
  return found || 'Pendiente';
}

// ── POSTGRESQL CLIENT ─────────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB       || 'meyer_db',
  user:     process.env.PG_USER     || 'meyer_user',
  password: process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD,
});

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function migrate() {
  console.log(`\n🚀 Migración Sheets → PostgreSQL ${DRY_RUN ? '[DRY RUN]' : ''}`);
  console.log('─'.repeat(60));

  // 1. Leer Sheets
  console.log('📊 Leyendo Google Sheets…');
  const rows = await getSheetData();

  if (rows.length < 2) {
    console.log('⚠️  Sheet vacío o sin datos. Nada que migrar.');
    return;
  }

  // 2. Parsear header (fila 0) y normalizar nombres de columna
  // Las columnas del Sheet tienen espacios extra: "Hora ", "Nombre ", etc.
  const header = rows[0].map(h => h.trim());
  console.log(`📋 Columnas detectadas: ${header.join(' | ')}`);

  const idxFecha    = header.findIndex(h => h === 'Fecha');
  const idxHora     = header.findIndex(h => h.startsWith('Hora'));
  const idxNombre   = header.findIndex(h => h.startsWith('Nombre'));
  const idxServicio = header.findIndex(h => h === 'Servicio');
  const idxNumero   = header.findIndex(h => h.startsWith('Número') || h.startsWith('Numero'));
  const idxEstado   = header.findIndex(h => h.startsWith('Estado'));
  const idxEventID  = header.findIndex(h => h.startsWith('Event') || h.startsWith('event'));

  if (idxFecha === -1 || idxHora === -1 || idxServicio === -1) {
    console.error('❌ No se encontraron columnas esperadas (Fecha, Hora, Servicio). Verificar header del Sheet.');
    process.exit(1);
  }

  // 3. Procesar filas
  const dataRows = rows.slice(1);
  let ok = 0, skipped = 0, errors = 0;
  const inserts = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // número de fila en Sheet (1-indexed + header)

    const rawFecha    = row[idxFecha]    || '';
    const rawHora     = row[idxHora]     || '';
    const rawNombre   = row[idxNombre]   || '';
    const rawServicio = row[idxServicio] || '';
    const rawNumero   = row[idxNumero]   || '';
    const rawEstado   = row[idxEstado]   || '';
    const rawEventID  = idxEventID >= 0 ? (row[idxEventID] || null) : null;

    // Validación mínima: fecha, hora, servicio, numero obligatorios
    const fecha    = parseDate(rawFecha);
    const hora     = parseTime(rawHora);
    const numero   = parseNumber(rawNumero);
    const servicio = rawServicio.trim();

    if (!fecha || !hora || !servicio || !numero) {
      console.warn(`⚠️  Fila ${rowNum} omitida: fecha=${rawFecha} hora=${rawHora} servicio=${servicio} numero=${rawNumero}`);
      skipped++;
      continue;
    }

    inserts.push({
      business_id:       BUSINESS_ID,
      fecha,
      hora,
      nombre:            rawNombre.trim() || null,
      servicio,
      numero,
      estado:            parseEstado(rawEstado),
      calendar_event_id: rawEventID ? rawEventID.trim() : null,
    });
  }

  console.log(`\n📝 Filas a migrar: ${inserts.length} | Omitidas: ${skipped}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Primeras 5 filas que se insertarían:');
    inserts.slice(0, 5).forEach((r, i) => console.log(`  ${i+1}.`, JSON.stringify(r)));
    console.log('\n✅ Dry run completo. Sin cambios en la BD.');
    return;
  }

  // 4. Insertar en PostgreSQL (con upsert para idempotencia)
  console.log('\n💾 Insertando en PostgreSQL…');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const r of inserts) {
      try {
        await client.query(`
          INSERT INTO appointments
            (business_id, fecha, hora, nombre, servicio, numero, estado, calendar_event_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT DO NOTHING
        `, [r.business_id, r.fecha, r.hora, r.nombre, r.servicio, r.numero, r.estado, r.calendar_event_id]);
        ok++;
      } catch (err) {
        console.error(`❌ Error en fila (${r.fecha} ${r.hora} ${r.numero}):`, err.message);
        errors++;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // 5. Reporte final
  console.log('\n' + '─'.repeat(60));
  console.log(`✅ Migración completa`);
  console.log(`   Insertadas: ${ok}`);
  console.log(`   Omitidas:   ${skipped}`);
  console.log(`   Errores:    ${errors}`);

  // Verificar conteo en PG
  const { rows: count } = await pool.query(
    'SELECT COUNT(*) FROM appointments WHERE business_id = $1', [BUSINESS_ID]
  );
  console.log(`   Total en PG: ${count[0].count} citas para business_id=${BUSINESS_ID}`);
}

migrate()
  .catch(err => {
    console.error('\n💥 Error fatal:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
