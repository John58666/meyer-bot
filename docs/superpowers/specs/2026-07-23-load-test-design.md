# Load Test Design — WhatsApp Bot (Peluquería Meyer)

## Purpose
Find the maximum concurrent capacity of the n8n WhatsApp bot system, identify bottlenecks (n8n, LLM, PostgreSQL), and establish a safe operating envelope.

## System Under Test
- **Webhook URL:** `https://n8n.zyvenshop.com/webhook/whatsapp-bot` (POST)
- **n8n mode:** Default (single-threaded, no queue mode)
- **VPS:** 2 vCPU / 3.7GB RAM (Hetzner)
- **DB:** PostgreSQL 16 (Docker, meyer_postgres)
- **LLM chain:** Gemini Flash-Lite → Cerebras → Groq
- **Test number JID:** `573152556322@s.whatsapp.net`
- **Instance:** `peluqueria-beta`

## Methodology
Progressive ramp in distinct phases. Each phase answers a specific question.

### Phases

| Phase | Users | Duration | Goal |
|-------|-------|----------|------|
| 1. Smoke | 1 | 2 min | Verify payload, webhook, DB lookup all work |
| 2. Load | 1→3→5 (step ramp) | 3 min each | Establish baseline, find degradation onset |
| 3. Stress | 5→10→20 (step ramp) | 3 min each | Find breaking point |
| 4. Soak | 80% of max stable | 30 min | Detect memory leaks, gradual degradation |

### Message Corpus
Realistic mix simulating real user behavior:

| Type | Weight | Examples |
|------|--------|---------|
| Saludo simple | 30% | "Hola", "Buenos días", "Hola, cómo estás?" |
| Consultar servicios | 25% | "Cuánto cuesta un corte?", "Qué servicios tienen?" |
| Agendar cita | 20% | "Quiero agendar para mañana", "Tienen disponible el sábado?" |
| Cancelar | 10% | "Quiero cancelar mi cita" |
| Reagendar | 10% | "Necesito cambiar mi cita" |
| Varios | 5% | "Dónde quedan?", "Aceptan tarjeta?" |

Each virtual user sends a message, waits random 5-15s (think time), then sends another.

### Metrics
- **Response time:** p50, p95, p99 (never average)
- **Error rate:** 4xx/5xx / timeouts
- **Throughput:** messages processed / minute
- **N8N execution stats:** from execution history

### Safety
- Pre-agreed abort: error rate > 10% or p99 > 60s sustained
- Live VPS monitoring (CPU, RAM) during test
- Test number is NOT a real client (3152556322)
- Direct POST to n8n webhook (no WhatsApp involved)

### Tool
Node.js script using native `fetch` + concurrency control. No external dependencies needed.

### Deliverables
- Load test script (`scripts/load-test.mjs`)
- Results summary after each phase
- Recommendation (queue mode needed? VPS upgrade? LLM change?)
