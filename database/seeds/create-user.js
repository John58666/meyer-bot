#!/usr/bin/env node
/**
 * Uso:
 *   node create-user.js --email="owner@negocio.com" --password="pass" --name="Nombre" --business_id=2 [--role=owner]
 *
 * Lee credenciales de DB desde ../../dashboard/.env.local o DATABASE_URL en el entorno.
 */

const path = require('path');
const fs   = require('fs');

// bcryptjs vive en dashboard/node_modules (donde está instalado)
const bcrypt = require(path.resolve(__dirname, '../../dashboard/node_modules/bcryptjs'));

// ── Cargar .env.local manualmente (sin dependencia dotenv) ──────────────────
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

// ── Parsear argumentos --key=value ──────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.+)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

// ── Validar argumentos requeridos ────────────────────────────────────────────
const required = ['email', 'password', 'name', 'business_id'];
const missing = required.filter(k => !args[k]);
if (missing.length > 0) {
  console.error(`ERROR: Faltan argumentos: ${missing.join(', ')}`);
  console.error('');
  console.error('Uso:');
  console.error('  node create-user.js --email="owner@negocio.com" --password="pass" --name="Nombre" --business_id=2 [--role=owner]');
  process.exit(1);
}

const { email, password, name, business_id, role = 'owner' } = args;
const businessId = parseInt(business_id, 10);

if (isNaN(businessId)) {
  console.error(`ERROR: business_id debe ser un número entero (recibido: "${business_id}")`);
  process.exit(1);
}

// ── Conectar a PostgreSQL ────────────────────────────────────────────────────
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.POSTGRES_HOST     || 'localhost',
  port:     parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB       || 'meyer_db',
  user:     process.env.POSTGRES_USER     || 'meyer_user',
  password: process.env.POSTGRES_PASSWORD || '',
});

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {

  // 1. Verificar que business_id existe
  const bizResult = await pool.query(
    'SELECT id, name FROM businesses WHERE id = $1',
    [businessId]
  );
  if (bizResult.rows.length === 0) {
    console.error(`ERROR: No existe un negocio con id=${businessId}`);
    process.exit(1);
  }
  const business = bizResult.rows[0];

  // 2. Verificar que el email no está duplicado
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  if (existingUser.rows.length > 0) {
    console.error(`ERROR: Ya existe un usuario con ese email`);
    process.exit(1);
  }

  // 3. Hashear contraseña
  const passwordHash = await bcrypt.hash(password, 12);

  // 4. Insertar usuario
  const insertResult = await pool.query(
    `INSERT INTO users (email, password_hash, name, business_id, role, active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id, email, name, business_id, role, active, created_at`,
    [email.toLowerCase(), passwordHash, name, businessId, role]
  );

  const user = insertResult.rows[0];
  console.log('');
  console.log('Usuario creado exitosamente:');
  console.log(`  id:          ${user.id}`);
  console.log(`  email:       ${user.email}`);
  console.log(`  name:        ${user.name}`);
  console.log(`  business_id: ${user.business_id} (${business.name})`);
  console.log(`  role:        ${user.role}`);
  console.log(`  active:      ${user.active}`);
  console.log(`  created_at:  ${user.created_at}`);
  console.log('');
}

main()
  .catch(err => {
    if (err.code === 'ECONNREFUSED') {
      console.error('ERROR: No se pudo conectar a PostgreSQL.');
      console.error('       Si usas túnel SSH: ssh -L 5432:localhost:5432 root@<VPS_IP>');
    } else {
      console.error('ERROR:', err.message);
    }
    process.exit(1);
  })
  .finally(() => pool.end());
