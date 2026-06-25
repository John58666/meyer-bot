// scripts/verify-llm-orquestador.mjs
// Verifica: (1) los 3 proveedores responden 200 con el modelo configurado,
// (2) cuáles devuelven `reasoning`, (3) la tabla conversation_history existe.
// Correr en el VPS:  node scripts/verify-llm-orquestador.mjs
import pg from 'pg';

const providers = [
  { name: 'gemini',   url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', key: process.env.GEMINI_API_KEY,   model: 'gemini-2.5-flash-lite' },
  { name: 'cerebras', url: 'https://api.cerebras.ai/v1/chat/completions',                                key: process.env.CEREBRAS_API_KEY, model: 'gpt-oss-120b' },
  { name: 'groq',     url: 'https://api.groq.com/openai/v1/chat/completions',                            key: process.env.GROQ_API_KEY,     model: 'openai/gpt-oss-120b' }
];

const ping = [{ role: 'user', content: 'Responde solo con la palabra: OK' }];

console.log('── Proveedores ─────────────────────────────');
for (const p of providers) {
  if (!p.key) { console.log(`❌ ${p.name}: falta API key en env`); continue; }
  const t0 = Date.now();
  try {
    const r = await fetch(p.url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${p.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: p.model, messages: ping, max_tokens: 32 }),
      signal: AbortSignal.timeout(10000)
    });
    const ms = Date.now() - t0;
    const body = await r.json();
    const choice = body?.choices?.[0];
    const content = choice?.message?.content?.trim();
    const hasReasoning = choice?.message?.reasoning != null;
    console.log(`${r.status === 200 && content ? '✅' : '❌'} ${p.name}: status=${r.status} ${ms}ms content="${(content||'').slice(0,40)}" reasoning=${hasReasoning}`);
  } catch (e) {
    console.log(`❌ ${p.name}: ${e.message}`);
  }
}

console.log('\n── conversation_history ────────────────────');
const client = new pg.Client({
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: +(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'meyer_db',
  user: process.env.POSTGRES_USER || 'meyer_user',
  password: process.env.POSTGRES_PASSWORD
});
try {
  await client.connect();
  const t = await client.query(`SELECT to_regclass('public.conversation_history') AS tbl`);
  console.log(t.rows[0].tbl ? '✅ tabla existe' : '❌ tabla NO existe — corre la migración 004');
  const rows = await client.query(
    `SELECT business_id, numero, jsonb_array_length(messages) AS turnos, updated_at, expires_at
     FROM conversation_history ORDER BY updated_at DESC LIMIT 5`
  );
  console.log(`Filas recientes (${rows.rowCount}):`);
  for (const r of rows.rows) {
    console.log(`  biz=${r.business_id} num=${r.numero} msgs=${r.turnos} exp=${r.expires_at.toISOString()}`);
  }
} catch (e) {
  console.log(`❌ PG: ${e.message}`);
} finally {
  await client.end().catch(() => {});
}
