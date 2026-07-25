# Auditoría meyer-bot — Preparación para visita del ingeniero

> **Propósito:** Documento completo de hallazgos, gaps y hoja de ruta para revisión con el ingeniero.
> **Fecha:** 24 julio 2026
> **Clientes activos:** Meyer (producción) + Brayan Study (prueba)
> **Stack:** Next.js 16 + PostgreSQL 16 + n8n + Evolution API + Gemini/Cerebras/Groq/OpenRouter

---

## 1. Resumen ejecutivo

meyer-bot es funcional con 2 clientes reales (Meyer, Brayan Study). El negocio es viable: competidores cobran €30-89/mes por funcionalidad inferior (sin AI conversacional, sin multi-profesional, sin dashboard multi-tenant). La ventaja real es **AI conversacional + todo-en-uno** a precio competitivo (~$30-50/mes).

**Lo que NO está listo para vender a 20+ clientes:**
- Sin CI/CD, sin staging, sin backups automáticos
- Sin testing (0 tests)
- Sin monitoreo de errores (n8n ni dashboard)
- Sin sistema de pagos/suscripciones
- Sin multi-tenancy probada a escala
- Sin WCAG, sin i18n, sin loading/empty/error states en frontend
- Sin rate limiting en auth, sin compliance Ley 1581 Colombia
- n8n corre en modo default (SQLite single-process)
- Bot alucina con agenda, no refleja cambios del panel, pregunta repetido

---

## 2. Arquitectura actual

```
WhatsApp ──→ Evolution API ──→ n8n (workflow 50 nodos) ──→ PostgreSQL
                     ↑                              │
                     │                              └──→ LLM (Gemini/Cerebras/Groq)
                     │
Dashboard (Next.js 16, PM2) ──→ PostgreSQL
                     │
nginx (proxy inverso) ←── Internet
```

**VPS Hetzner:** 2 vCPU, 3.7GB RAM, 38GB disco (~$10/mes)
**Componentes:** PostgreSQL 16 Alpine (Docker), n8n 2.10.3 (Docker), Evolution API 2.3.7 (Docker), Dashboard Next.js 16 (PM2 host)

---

## 3. Gaps críticos (debe resolver)

### 🔴 Backend & Arquitectura

| Gap | Impacto | Prioridad |
|-----|---------|-----------|
| **Sin tests** — 0 unit, 0 integration, 0 e2e | Cada deploy es manual y riesgoso | CRÍTICA |
| **Sin CI/CD** — no hay pipeline de build/test/deploy | Errores llegan a producción | CRÍTICA |
| **Sin staging** — todo cambio va directo a prod | Clientes reales afectados por bugs | CRÍTICA |
| **Sin backups automáticos** de PostgreSQL | Pérdida de datos de clientes reales | CRÍTICA |
| **n8n sin queue mode** — SQLite default, no Redis | Sin concurrencia real, cuello de botella a 20+ clientes | ALTA |
| **Sin manejo de errores global** en dashboard (try/catch, error boundaries) | Errores 500 no capturados | ALTA |
| **Sin logging estructurado** — n8n logs en UI, dashboard sin logging | Imposible debuggear en producción | ALTA |
| **Sin rate limiting** en API/auth endpoints | Vulnerable a brute force | ALTA |
| **DB sin índices compuestos** en appointments (business_id, date, professional_id) | Queries lentas con +10k citas | MEDIA |
| **Sin tabla de servicios normalizada** (services con duración, precio) | Lógica de precios/duración en LLM | MEDIA |
| **Sin tabla de planes/suscripciones** | No hay base para cobrar | MEDIA |
| **GOOGLE_PRIVATE_KEY aún en .env del VPS** (key revocada pero presente) | Limpieza pendiente | BAJA |

### 🔴 Frontend & UX

| Gap | Impacto | Prioridad |
|-----|---------|-----------|
| **Sin loading states** en ninguna vista | Usuario no sabe si algo carga o falló | ALTA |
| **Sin empty states** (sin citas, sin clientes, etc.) | Pantallas en blanco confunden | ALTA |
| **Sin error states** (error al cargar, timeout, 500) | Errores 500 sin feedback | ALTA |
| **Sin diseño responsive probado** en mobile | Dueños revisan desde el celular | ALTA |
| **Sin design system** (colores, tipografía, spacing consistente) | Inconsistencias visuales | MEDIA |
| **Sin skeleton screens** (solo spinner genérico) | UX pobre en carga lenta | MEDIA |
| **Sin WCAG 2.2 accesibilidad** | Excluye usuarios con discapacidad | MEDIA |
| **Sin dark mode** | Preferencia común | BAJA |
| **Sin i18n** (inglés/español) | Necesario si hay clientes no hispanos | BAJA |

### 🔴 UX del Bot WhatsApp

| Gap | Impacto | Prioridad |
|-----|---------|-----------|
| **Alucinaciones con agenda** — bot inventa disponibilidad o dice "no hay citas" cuando sí hay | Cliente se frustra, pérdida de negocio | CRÍTICA |
| **No refleja cambios del panel web** — si dueño cancela desde dashboard, bot sigue ofreciendo ese horario | Desync entre bot y realidad | CRÍTICA |
| **Preguntas repetidas** — bot vuelve a preguntar información ya dada | Experiencia frustrante, abandono | ALTA |
| **Error genérico "intenta de nuevo"** sin contexto | Cliente no sabe qué pasó | ALTA |
| **Sin confirmación visual** de que el cliente sigue ahí (timeout de inactividad) | Conversaciones abandonadas abiertas | ALTA |

### 🔴 DevOps & Infra

| Gap | Impacto | Prioridad |
|-----|---------|-----------|
| **Sin backups automáticos** de PostgreSQL | Riesgo de pérdida total de datos | CRÍTICA |
| **Sin monitoreo de errores** (Sentry/OpenTelemetry) | Bugs silenciosos en producción | ALTA |
| **Sin alertas de salud** (caída de servicios) | Cliente reporta antes que el equipo | ALTA |
| **Sin feature flags** | Cada deploy mueve todo junto | MEDIA |
| **Sin migration strategy** automatizada | Migraciones manuales = riesgo | MEDIA |
| **Sin secret management** — secrets en .env en texto plano en VPS | Mejorable con Doppler/Bitwarden | MEDIA |
| **Dashboard build en VPS** consume 2GB RAM | Build compite con PostgreSQL y n8n | MEDIA |
| **pm2 restart con downtime** 30-60s | Caída del dashboard en cada deploy | MEDIA |

### 🔴 Seguridad

| Gap | Impacto | Prioridad |
|-----|---------|-----------|
| **Sin rate limiting en login** | Brute force attack posible | ALTA |
| **Sin audit log** de acciones de usuarios | Sin trazabilidad | ALTA |
| **Sin aviso de datos personales (Ley 1581 Colombia)** | Ilegal para clientes colombianos | ALTA |
| **Sin security headers** (CSP, HSTS, X-Frame-Options) en nginx | Vulnerabilidades XSS/clickjacking | MEDIA |
| **Sin MFA para admins** | Acceso admin sin 2FA | MEDIA |
| **JWT sin refresh rotation implementada** | Sesiones largas sin renovación segura | MEDIA |
| **Evolution API docker-compose con API_KEY hardcodeada** | Secret en texto plano en VPS | MEDIA |

### 🔴 Pagos & Negocio

| Gap | Impacto | Prioridad |
|-----|---------|-----------|
| **Sin sistema de suscripciones** | No se puede cobrar | BLOQUEANTE |
| **Sin tabla plans/subscriptions** en DB | No hay base de datos para cobro | BLOQUEANTE |
| **Sin onboarding flow** para nuevos negocios | Cada cliente requiere soporte manual | ALTA |
| **Sin límites por plan** (max professionals, max clients) | Un cliente puede usar recursos ilimitados | ALTA |
| **Sin analytics/uso** (citas/día, mensajes/día, conversiones) | No se puede medir valor del producto | MEDIA |
| **Sin documentación para clientes** | Cada cliente necesita explicación | MEDIA |

---

## 4. Competitor comparison

| Feature | Engrana | SimplyBook | Booksolut | Happilee | meyer-bot |
|---------|---------|-----------|-----------|----------|-----------|
| Precio base | €89/mes | $9.9/mes | ~$30/mes | ~$50/mes | **~$30-50/mes** |
| WhatsApp nativo | ✅ | Addon $10/mes | ✅ | ✅ | **✅ (Evolution API)** |
| AI conversacional | ❌ | ❌ | ❌ | ❌ | **✅ (LLM)** |
| Multi-profesional | ✅ | ✅ | ✅ | ✅ | **✅** |
| Dashboard web | ✅ | ✅ | ✅ | ✅ | **✅** |
| Multi-tenant | ✅ | ✅ | ✅ | ✅ | **✅** |
| Calendario Google | ✅ | ✅ | ✅ | ✅ | **❌ (pendiente)** |
| Pagos online | ✅ | ✅ | ✅ | ❌ | **❌** |
| Recordatorios WhatsApp | ❌ | ❌ | ❌ | ❌ | **✅** |
| Cancelación por chat | ❌ | ❌ | ❌ | ❌ | **✅** |
| Reagendamiento por chat | ❌ | ❌ | ❌ | ❌ | **✅** |
| Self-onboarding | ✅ | ✅ | ❌ | ❌ | **❌** |

**Ventaja real de meyer-bot:** AI conversacional que entiende lenguaje natural + recordatorios/cancelaciones/reagendamiento por chat. Competidores tienen UI de booking, no bots conversacionales.

**Desventaja:** Competidores tienen años de pulido en UX, pagos, onboarding, y estabilidad. meyer-bot compite en funcionalidad core (AI) pero pierde en madurez de producto.

---

## 5. Roadmap priorizado

### Fase 0 — HOY (lo que el ingeniero debe saber)
- Proyecto funcional con 2 clientes reales
- Stack moderno (Next.js 16, PostgreSQL 16, n8n)
- Security audit completado (git history limpio, firewall, passwords rotadas)
- Monitoreo básico instalado (Beszel + Uptime Kuma)
- Sin tests, sin CI/CD, sin staging

### Fase 1 — Semana 1-2 (Fundación)
- [ ] Tests: unit tests para lógica core + integration tests para API endpoints
- [ ] CI/CD: GitHub Actions (lint → test → build → deploy)
- [ ] Backups automáticos de PostgreSQL (pg_dump diario + WAL)
- [ ] Error monitoring (Sentry para dashboard + n8n)
- [ ] Staging environment (VPS segundo o subpath)

### Fase 2 — Semana 3-4 (Estabilidad)
- [ ] Fix alucinaciones del bot: structured output + validación post-LLM + two-call pattern
- [ ] Rate limiting en todas las API routes (+ auth)
- [ ] Loading/empty/error states en todas las vistas del dashboard
- [ ] n8n queue mode (Redis + workers)
- [ ] Migración DB: índices compuestos, tabla services, tabla plans

### Fase 3 — Semana 5-6 (Pagos & Multi-tenant)
- [ ] Stripe Checkout + Billing + Customer Portal
- [ ] Sistema de planes (free/trial/pro) con límites
- [ ] Onboarding flow para nuevos negocios
- [ ] Feature flags para despliegues graduales
- [ ] Audit log de acciones

### Fase 4 — Semana 7-8 (Polaco)
- [ ] WCAG 2.2 accesibilidad
- [ ] Dark mode
- [ ] Skeleton screens
- [ ] Design system (colores, tipografía, componentes)
- [ ] i18n español/inglés
- [ ] Documentación para clientes

---

## 6. Preguntas clave para el ingeniero

### Arquitectura
1. ¿Recomiendas mantener n8n o migrar a Node.js+BullMQ+Redis directo? ¿En qué threshold?
2. ¿La estrategia multi-tenant (un workflow n8n compartido + business_id) escala o necesitamos algo más?
3. ¿Recomiendas separar en 2 VPSs ahora o esperar a 10+ clientes?

### Backend
4. ¿Qué priorizas primero: tests o CI/CD? (ambos necesarios pero uno alimenta al otro)
5. ¿Cómo recomiendas estructurar los tests? (jest/vitest + supertest para API + Playwright para e2e)
6. ¿Sentry es suficiente para errores en producción o necesitamos OpenTelemetry?

### Frontend
7. ¿Next.js Server Actions vs API routes para el dashboard? ¿Cuál recomiendas a futuro?
8. ¿Cómo recomiendas implementar loading/empty/error states? ¿Una librería o custom?
9. ¿Design system custom o usamos shadcn/ui + Tailwind que ya tenemos?

### DevOps
10. ¿Staging en el mismo VPS (subpath/subdominio) o VPS separado?
11. ¿Recomiendas Dockerizar el dashboard o mantener PM2 en host?
12. ¿Estrategia de migrations: Prisma Migrate, node-pg-migrate, o manual?

### Pagos
13. Stripe Checkout vs Stripe Billing portal? ¿O ambos?
14. ¿Cómo manejas el upgrade/downgrade/cancel de planes con Stripe?
15. ¿Webhooks de Stripe como fuente de verdad o tabla local sync?

---

## 7. Lo que SÍ está bien

No todo son gaps. Destaca esto con el ingeniero:

- ✅ **DB schema sólido** — multi-tenant, UUIDs, constraints lógicas, soft-delete, JSONB para flexibilidad
- ✅ **Git history limpio** — 0 secrets después de git-filter-repo
- ✅ **Firewall VPS** — puerto Evolution API cerrado al público, iptables persistente
- ✅ **Passwords rotadas** — SSH, PostgreSQL, Evolution API (pendiente última)
- ✅ **Monitoreo instalado** — Beszel + Uptime Kuma
- ✅ **Multi-LLM fallback chain** — Gemini → Cerebras → Groq → OpenRouter
- ✅ **Structured output en LLM** — JSON mode para extraer datos del cliente
- ✅ **Modularización de prompts** — B6-B11 implementados (tono colombiano, Ley 1581, post-LLM validation)
- ✅ **Harness de desarrollo** — AGENTS.md, rules, templates, sensors
- ✅ **Stack moderno** — Next.js 16, PostgreSQL 16, n8n 2.10, Docker

---

## 8. Costos mensuales actuales

| Concepto | Costo |
|----------|-------|
| VPS Hetzner (2 vCPU, 3.7GB RAM, 38GB) | ~$10 |
| n8n (self-hosted) | $0 |
| Evolution API (self-hosted) | $0 |
| OpenRouter (sin créditos, 50 req/día) | $0 |
| Gemini API (gratuito hasta 60 req/min) | $0 |
| Cerebras (gratuito) | $0 |
| Groq (gratuito) | $0 |
| PostgreSQL (self-hosted) | $0 |
| **Total** | **~$10/mes** |

Con $10 de crédito OpenRouter → 1,000 req/día + fallback a Gemini/Cerebras/Groq sin costo.

---

## 9. Estimación de carga del ingeniero

| Área | Tiempo estimado |
|------|----------------|
| Revisar arquitectura y dar feedback | 1-2h |
| Configurar CI/CD (GitHub Actions básico) | 2-3h |
| Configurar backups PostgreSQL | 1h |
| Implementar rate limiting | 2-3h |
| Configurar Sentry | 1h |
| Setup staging | 1-2h |
| Dockerizar dashboard | 1-2h |
| **Total sesión** | **~8-14h (1-2 días)** |

---

*Documento generado como preparación para la visita del ingeniero. 
Propósito: identificar todas las gaps antes de escalar a 20+ clientes.*
