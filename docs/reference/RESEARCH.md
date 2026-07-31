# RESEARCH.md — Decisiones de investigación (para modelos)

> **Propósito:** Único archivo de referencia para que los modelos conozcan conclusiones de investigaciones pasadas sin re-investigar. <150 líneas.
> **NO leer a menos que:** estés trabajando en arquitectura, pagos, frontend, auth, o escalabilidad.

---

## Stripe / Pagos
- **Implementar:** Stripe Checkout + Billing + Customer Portal
- **Webhooks = fuente de verdad**, tabla local sync (no al revés)
- **Idempotencia** en cada webhook (header `Idempotency-Key`)
- Smart retries: 38-70% de recuperación con backoff exponencial
- Tablas necesarias: `plans`, `subscriptions`, `invoices` (ver ARCHITECTURE.md)

## Auth / OWASP
- **Argon2id** para hash de passwords (no bcrypt si se puede)
- **Rate limiting** en login endpoint (5 intentos/minuto)
- JWT corto (15 min) + refresh token con rotation
- HttpOnly + Secure + SameSite en cookies de sesión
- **No localStorage** para tokens
- MFA para admins (cuando haya +5 usuarios)
- Session regeneration después de login

## Google Calendar API
- **Gratis al nivel actual** (~4,000 req/día contra límite 1M/día)
- Nuevos cargos anunciados con 90 días de aviso — no urgen
- Service Account funciona, pero migrar a OAuth por usuario cuando haya multi-cliente

## DB Schema — Hallazgos
- **Índices compuestos faltantes:** appointments(business_id, date, professional_id)
- **Tabla services** pendiente (duracción, precio) — hoy en `services_text` texto plano
- **Tabla plans/subscriptions** necesarias para Stripe
- Fillfactor 90 en tablas update-heavy (conversation_history, sessions)

## Competidores
| Producto | Precio | AI? | WhatsApp nativo? |
|----------|--------|-----|-----------------|
| Engrana | €89/mes | ❌ | ✅ |
| SimplyBook | $9.9 + addon | ❌ | Addon $10 |
| Booksolut | ~$30/mes | ❌ | ✅ |
| Happilee | ~$50/mes | ❌ | ✅ |
| **meyer-bot** | **~$30-50/mes** | **✅** | **✅** |

Ventaja real: AI conversacional + recordatorios/cancel/reagend por chat. Competidores tienen UI de booking, no bots.

## Anti-halucinación (bot)
- Structured output (JSON mode) para extraer datos del cliente
- Post-LLM validation: verificar disponibilidad contra DB real DESPUÉS de generar respuesta
- Two-call pattern: LLM #1 razona, LLM #2 formatea (si hay presupuesto)
- Short-circuit fuera de horario antes de llamar al LLM
- No confiar en que el LLM ejecute reglas de validación — ponerlas en código

## Prompt Engineering
- Prompts en YAML versionado → evaluaciones → staging → prod
- PromptOps: 5-10x más rápido que hardcodear prompts en n8n
- Evaluación con test set de 20-30 escenarios antes de cambiar prompts en producción

## Frontend — Mejores prácticas
- **App shell:** sidebar + topbar + breadcrumbs + theme toggle + responsive
- **Estados obligatorios:** loading, empty, error, success en CADA vista
- Skeleton screens > spinners (en contenido principal)
- WCAG 2.2: contraste 4.5:1, touch targets 44px, tooltips en íconos
- i18n cuando haya clientes no hispanos (no urgente ahora)

## CI/CD (para 20+ clientes)
- GitHub Actions: 4 etapas (lint → test → build → deploy)
- Tests rápidos en PR (<5 min), lentos en merge
- Auto-deploy en merge a main
- Staging cuando haya QA (mismo VPS, subdominio diferente)

## Backup/DR (ver spec completo)
- **Ahora:** pg_dump diario + rclone a Backblaze B2 (~$1-2/mes)
- **A 10+ clientes:** pg_basebackup + WAL archiving (RPO minutos)
- **A 50GB+:** pgBackRest incremental
- Regla: backup no verificado = no existe. Restaurar trimestralmente.

## Compliance Colombia (Ley 1581)
- Aviso de privacidad + consentimiento en primera interacción del bot
- Derecho al olvido: comando "elimina mis datos"
- Política de tratamiento: plantilla SIC
- Registro SIC solo cuando haya +10k registros (hoy no aplica)

---

## Escalabilidad 20-50 clientes — Validación Julio 2026

### Infraestructura
- **Hetzner AX102:** precio actualizado a ~€157/mes (AX102-1-LTD). Ajuste de precios Junio 2026. Benchmarks: 25,951 tps pgbench, 10,318 IOPS fsync — 50x superior a NVMe consumo. Los NVMe empresariales con PLP justifican el costo para PostgreSQL+Redis.
- **Alternativas más baratas:** AX41-LTD (€57/mes, sin NVMe empresarial) para stateless, no para DB.

### n8n Queue Mode + Workers
- **Validation stall CONFIRMADO** (Issue #32250): ~48s stall para 185 nodos en queue mode. n8n re-valida el workflow completo en cada ejecución sin caché por versionId. La regla <20 nodos es correcta.
- **Silent data loss en sub-workflows** (Issue #27725, abierto): sub-workflows pueden perder items al retornar datos sin error. Mitigación: validar conteo post sub-workflow.
- **Overhead de sub-workflow:** ~50-500ms, manejable. El problema real es #32250 + #27725.
- **Redis `noeviction` obligatorio** para BullMQ. Confirmado por docs oficiales.

### PostgreSQL + PgBouncer
- **PgBouncer transaction pooling INCOMPATIBLE** con n8n v2.x queue mode: ~50% fallos de workers. Usar **session pooling**.
- **Índices multi-tenant:** business_id primero en compuestos. Shared schema funciona hasta ~5,000 tenants.
- Para 20-50 clientes: shared schema + business_id + session pooling es óptimo.

### WhatsApp
- **Evolution API memory leak:** CORREGIDO en v2.3.7 (Dic 2025). Ya no es riesgo activo con ≥ v2.3.7.
- **Consumo RAM Evolution:** ~150-250 MB base + ~150-300 MB por instancia.
- **Evolution → Meta NO es migración directa** si usan Baileys (protocolo no oficial). Requiere número nuevo.
- **Meta BSP pricing actualizado:** cambió de por-conversación a por-mensaje (Julio 2025). Colombia: Marketing $0.011/msg, Utility $0.002/msg, Service gratis.
- **1,000 conversaciones servicio gratis/mes** desde Nov 2024.
- **BSPs recomendados:** 360dialog (0% markup, €49/mes), Twilio (0 cuota, ~20% markup), SendSeven (€9/canal, 0% markup).

### Monitoreo
- **Netdata:** sigue gratis para 1 VPS, ~200MB RAM, <5% CPU. Monitores nativos para PostgreSQL, Redis, Docker.
- Alternativa: Prometheus+Grafana (más pesado ~1-2GB) solo si ya hay infraestructura.

## Scheduling / Booking UX — Patrones de diseño
- **Calendar-centric:** calendario mensual/semanal como fuente de verdad del estado de disponibilidad. Cada día muestra color: 🔴 cerrado, 🟡 parcial, ✅ disponible. Click → drawer con detalle completo del día (horas, citas, bloqueos, acciones).
- **Service-level duration:** la duración del servicio CONDUCE la disponibilidad. Sistema calcula slots = duración del servicio + horario laboral + disponibilidad profesional + excepciones. No separar conceptos.
- **Single source of truth for blocks:** todas las acciones de bloqueo/cierre/edición viven en el drawer del día, no dispersas en múltiples componentes/botones.
- **Progressive disclosure:** calendario vista general → click → drawer detalle. No mostrar lista de bloqueos separada del calendario.
- **Referencias:** Interlinked (booking exceptions), Calendly, Acuity, Square Appointments.
- **Documentación completa del rediseño propuesto:** `docs/ux/mi-horario-ux-redesign-research.md`

---

## Multi-industria 2026 — Módulo Caja, Productos, Comisiones

### Decisión
Arquitectura multi-industria desde el inicio. Todo es aditivo, nada modifica el flujo actual de citas/bot WhatsApp. Diseñado para peluquerías, clínicas, talleres, gimnasios.

### Schema acordado

**products** — catálogo con inventario:
```
id, business_id, sku (nullable), name, category (TEXT), product_type ('retail'|'supply'),
cost_price NUMERIC(12,2) NOT NULL, sale_price NUMERIC(12,2) (nullable — 'supply' no se vende),
current_stock INT DEFAULT 0, min_stock_alert INT DEFAULT 5,
iva_included BOOLEAN DEFAULT true, iva_percentage NUMERIC(5,2) DEFAULT 0,
active, created_at, updated_at
```

**transactions** — caja al completar una cita:
```
id, business_id, appointment_id, subtotal NUMERIC(12,2), iva_monto NUMERIC(12,2),
total NUMERIC(12,2), propina NUMERIC(12,2), tipo_documento ('boleta'|'factura'|'recibo'),
detalle_fiscal JSONB, created_at
```
- Cálculo: `net = round(total / (1 + iva/100))`, `tax = total - net`
- Propina: separada, sin IVA, sin comisión

**transaction_items** — items que componen la transacción:
```
id, transaction_id, item_type ('service'|'product'), item_id, name,
quantity, unit_price, iva_percentage, commission_amount (precalculado)
```

**payment_methods** — métodos configurados por negocio:
```
id, business_id, name, tipo ('cash'|'card'|'transfer'|'digital'), instructions JSONB,
is_active BOOLEAN
```
- No activar método digital si `instructions` está vacío (error 400)

**professionals** (modificar — aditivo):
```
ADD comision_servicio_pct INTEGER DEFAULT NULL
ADD comision_producto_pct INTEGER DEFAULT NULL
```

**services** (modificar — aditivo):
```
ADD precio_incluye_impuesto BOOLEAN DEFAULT true
ADD porcentaje_impuesto NUMERIC(5,2) DEFAULT 0
```

### Reglas de negocio
- Comisión dual: si `item_type = 'service'` usa `comision_servicio_pct`, si es `'product'` usa `comision_producto_pct`
- Método de pago digital no activable sin `instructions` relleno
- Stock se descuenta al crear `transaction_items` con `item_type = 'product'`
- Todo es migración aditiva — tocar solo tablas nuevas + columnas nullable en existentes
- Sin UI aún — solo schema + backend. Se habilita en producción cuando esté listo.

### Referencia
- Investigación y diseño UX: otra IA (frontend)
- Validación técnica y schema: this session
- Pendiente de implementar: migraciones + server actions + UI
