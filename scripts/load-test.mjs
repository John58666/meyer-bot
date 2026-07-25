#!/usr/bin/env node
import { performance } from 'node:perf_hooks';

const WEBHOOK_URL = 'https://n8n.zyvenshop.com/webhook/whatsapp-bot';
const INSTANCE = 'peluqueria-beta';
const TEST_JID = '573152556322@s.whatsapp.net';
const TIMEOUT_MS = 60000;
const THINK_MIN = 5000;
const THINK_MAX = 15000;
const ABORT_ERROR_RATE = 0.10;
const ABORT_P99_MS = 60000;

const MESSAGES = [
  'Hola', 'Buenos días', 'Hola, cómo estás?',
  'Cuánto cuesta un corte de cabello para hombre?',
  'Qué servicios tienen disponibles?',
  'Tienen cita para mañana?',
  'Quiero agendar un corte para el sábado',
  'Cancelar mi cita por favor',
  'Necesito cambiar la hora de mi cita',
  'Dónde queda la peluquería?',
  'Aceptan tarjeta de crédito?',
  'Buenas tardes, quiero información',
  'Me puede ayudar con un agendamiento?',
  'Tienen disponible esta tarde?',
  'Quiero hacer una reserva para dos personas',
];

const PHASES = [
  { name: '🔍 Smoke',      users: 1,  duration: 120_000 },
  { name: '⚡ Load 3',      users: 3,  duration: 180_000 },
  { name: '⚡ Load 5',      users: 5,  duration: 180_000 },
  { name: '🔥 Stress 10',   users: 10, duration: 180_000 },
  { name: '🔥 Stress 20',   users: 20, duration: 180_000 },
];

let globalStats = { allTimes: [], allErrors: 0, allTotal: 0 };

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function pick(arr) { return arr[rand(0, arr.length - 1)]; }

function buildPayload(msg, idx) {
  const ts = Math.floor(Date.now() / 1000);
  return {
    body: {
      data: {
        key: {
          remoteJid: TEST_JID,
          fromMe: false,
          id: `loadtest_${Date.now()}_${idx}`,
        },
        message: { conversation: msg },
        pushName: 'TestUser',
        messageTimestamp: String(ts),
        instance: INSTANCE,
      },
    },
  };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const i = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, i)];
}

function reportPhase(name, times, errors, total, durationMs) {
  if (times.length === 0) {
    console.log(`  ─── 0 successful requests (all failed)`);
    return;
  }
  const sorted = [...times].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);
  const max = sorted[sorted.length - 1];
  const errRate = total > 0 ? (errors / total * 100) : 0;
  const rps = total > 0 ? (total / (durationMs / 1000)) : 0;

  console.log(`  ─── ${total} requests, ${errors} errors (${errRate.toFixed(1)}%)`);
  console.log(`  ─── Response times: p50=${p50}ms  p95=${p95}ms  p99=${p99}ms  max=${max}ms`);
  console.log(`  ─── Throughput: ${rps.toFixed(2)} req/s`);
  return { p50, p95, p99, errRate };
}

function printProgress(current, total, label) {
  const barLen = 20;
  const filled = Math.round((current / total) * barLen);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
  const pct = ((current / total) * 100).toFixed(0);
  process.stdout.write(`\r  ${label} ${bar} ${pct}% (${current}s / ${total}s)`);
}

async function sendMessage(msg, idx) {
  const body = buildPayload(msg, idx);
  const start = performance.now();
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const elapsed = performance.now() - start;
    if (!res.ok && res.status !== 202) {
      return { ok: false, time: elapsed, code: res.status };
    }
    return { ok: true, time: elapsed, code: res.status };
  } catch (err) {
    const elapsed = performance.now() - start;
    return { ok: false, time: elapsed, error: err.message };
  }
}

async function worker(id, phaseMs, stopFlag, metrics) {
  const startTime = performance.now();
  let msgIdx = 0;
  while (!stopFlag.done) {
    const elapsed = performance.now() - startTime;
    if (elapsed >= phaseMs) break;

    const msg = pick(MESSAGES);
    const result = await sendMessage(msg, msgIdx++);
    metrics.total++;
    if (result.ok) {
      metrics.times.push(result.time);
    } else {
      metrics.errors++;
      if (result.code) metrics.errorCodes[result.code] = (metrics.errorCodes[result.code] || 0) + 1;
    }

    const think = rand(THINK_MIN, THINK_MAX);
    await new Promise(r => setTimeout(r, think));
  }
}

async function runPhase(phase) {
  const { name, users, duration } = phase;
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  ${name} — ${users} usuario(s) simultáneo(s) — ${duration / 1000}s`);
  console.log(`═══════════════════════════════════════════`);

  const metrics = { times: [], errors: 0, total: 0, errorCodes: {} };
  const stopFlag = { done: false };

  const workers_arr = [];
  for (let i = 0; i < users; i++) {
    workers_arr.push(worker(i, duration, stopFlag, metrics));
  }

  // Progress bar
  const tickMs = 1000;
  const totalTicks = Math.floor(duration / tickMs);
  for (let t = 1; t <= totalTicks; t++) {
    await new Promise(r => setTimeout(r, tickMs));
    if (stopFlag.done) break;
    printProgress(t, totalTicks, name);
  }
  stopFlag.done = true;
  await Promise.all(workers_arr);
  process.stdout.write('\n');

  // Report
  const result = reportPhase(name, metrics.times, metrics.errors, metrics.total, duration);

  // Error code breakdown
  const codes = Object.entries(metrics.errorCodes);
  if (codes.length > 0) {
    console.log(`  ─── Error codes: ${codes.map(([c, n]) => `${c}=${n}`).join(', ')}`);
  }

  // Check abort thresholds
  if (result) {
    const errRate = metrics.total > 0 ? (metrics.errors / metrics.total) : 0;
    if (errRate >= ABORT_ERROR_RATE || result.p99 >= ABORT_P99_MS) {
      console.log(`\n  ⛔ ABORT: Error rate ${(errRate*100).toFixed(1)}% or p99 ${result.p99}ms exceeded threshold`);
      return { aborted: true, result };
    }
  } else {
    return { aborted: true, result: null };
  }

  return { aborted: false, result };
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════╗
║  LOAD TEST — WhatsApp Bot (Peluquería Meyer) ║
║  Target: ${WEBHOOK_URL}  ║
║  Instance: ${INSTANCE}                          ║
║  Test JID: ${TEST_JID}           ║
╚══════════════════════════════════════════════╝
`);

  let maxStableUsers = 0;
  let maxStableResult = null;

  for (const phase of PHASES) {
    const { aborted, result } = await runPhase(phase);
    if (!aborted) {
      maxStableUsers = phase.users;
      maxStableResult = result;
    }
    if (aborted) {
      console.log(`\n  Prueba detenida en fase ${phase.name}`);
      break;
    }
  }

  // Soak phase
  if (maxStableUsers > 0) {
    const soakUsers = Math.max(1, Math.round(maxStableUsers * 0.8));
    console.log(`\n═══════════════════════════════════════════`);
    console.log(`  💧 SOAK — ${soakUsers} usuarios (80% del máximo ${maxStableUsers}) — 30min`);
    console.log(`═══════════════════════════════════════════`);

    const metrics = { times: [], errors: 0, total: 0, errorCodes: {} };
    const stopFlag = { done: false };
    const duration = 1_800_000;

    const workers_arr = [];
    for (let i = 0; i < soakUsers; i++) {
      workers_arr.push(worker(i, duration, stopFlag, metrics));
    }

    const tickMs = 10000; // 10s ticks for 30min
    const totalTicks = Math.floor(duration / tickMs);
    for (let t = 1; t <= totalTicks; t++) {
      await new Promise(r => setTimeout(r, tickMs));
      if (stopFlag.done) break;
      printProgress(t * 10, Math.floor(duration / 1000), '💧 Soak');
    }
    stopFlag.done = true;
    await Promise.all(workers_arr);
    process.stdout.write('\n');

    reportPhase('💧 Soak', metrics.times, metrics.errors, metrics.total, duration);
  }

  // Summary
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  📊 RESUMEN FINAL`);
  console.log(`═══════════════════════════════════════════`);
  console.log(`  Máxima carga estable: ${maxStableUsers} usuarios simultáneos`);
  if (PHASES.every(p => p.users <= maxStableUsers)) {
    console.log(`  ✅ El sistema soportó todas las fases sin abortar`);
  } else {
    console.log(`  ⚠️  El sistema abortó antes de completar todas las fases`);
  }
  console.log(``);
}

main().catch(console.error);
