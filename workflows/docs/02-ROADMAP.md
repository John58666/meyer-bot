# 02-ROADMAP.md — Plan de Fases

> **Para:** planificar qué hacer ahora, siguiente, después. Ver dependencias entre fases.

## 📊 4 Fases

```
FASE 1 (HOY)          FASE 2 (Semanas 2-3)    FASE 3 (Mes 2)        FASE 4 (A futuro)
Seguridad + Quick wins B18 + Validación        State Machine +       BSP + Microservicio
                        Pipeline               Function Calling      + Rate Limiting
    │                      │                       │                      │
    ▼                      ▼                       ▼                      ▼
  UMBRAL 1              UMBRAL 2               UMBRAL 3              UMBRAL 4
  Pilotaje (3 neg.)     Venta limitada (5)     Venta general (10+)   Crecimiento (50+)
```

## 📋 Fase 1 — Supervivencia (1 día)

| # | Acción | Esfuerzo | Riesgo |
|---|--------|----------|--------|
| 1 | CONNECTION_UPDATE webhook (alerta desconexión WhatsApp) | 30 min | Bajo |
| 2 | `pg_cron` limpieza sessions + conversation_history | 1h | Bajo |
| 3 | Backups DB (pg_dump diario) | 2h | Bajo |
| 4 | Rotar Evolution API key (leak en git) | 30 min | Bajo |
| 5 | Firewall Evolution API (puerto 8080) | 30 min | Bajo |
| 6 | Escapar `'` en interpolar SQL (~80 ocurrencias) | 2h | Bajo |
| 7 | Preparar webhook normalizer (Evolution API + BSP) | 20 min | Bajo |
| 8 | Agregar columna `phone_number_id` en businesses | 15 min | Bajo |

## 📋 Fase 2 — Confiabilidad (2-3 semanas)

| # | Acción | Resuelve |
|---|--------|----------|
| 1 | B18: Mover MOSTRAR_SLOTS del prompt al código JS | B18 |
| 2 | Pipeline validación post-LLM unificado | B3, B4, B11, B17 |
| 3 | `UNIQUE INDEX` en appointments (anti double-booking) | 7.1 |
| 4 | Dashboard sync: idempotencia + retry | 2.1 |
| 5 | Corregir colisiones dashboard=bot | KEY_LEARNINGS |
| 6 | B1 post-deploy: profesional sin editor horario | B1 |

## 📋 Fase 3 — Arquitectura (Mes 2) 🟡 3/7

| # | Acción | Estado |
|---|--------|--------|
| 1 | State machine para sessions (columna step + Guardar Sesion) | ✅ |
| 2 | Function calling en Cerebras/Groq (JSON schema) | 🔴 |
| 3 | Extraer AI Agent a microservicio (`packages/bot-core`) | 🟡 estructura creada |
| 4 | Validation failures logging (table + Guardar Historial) | ✅ |
| 5 | Git Source Control nativo de n8n | 🟡 manual UI |
| 6 | Dataset evals + shadow mode | 🔴 |
| 7 | HMAC por tenant | 🔴 |

## 📋 Fase 4 — Escala (a futuro)

| # | Acción | Gatillo |
|---|--------|---------|
| 1 | Migrar a BSP oficial (360dialog Partner Platform) | Cuando riesgo ban > costo |
| 2 | Modo queue de n8n + Redis | >200 ejecuciones/día |
| 3 | Rate limiting por tenant | >10-15 negocios |
| 4 | DLQ + reconciliación dashboard↔DB | >10 negocios |
| 5 | Staging separado de n8n | >15-20 negocios |
| 6 | Health checks sintéticos | Después de validación pipeline |

## 🔗 Dependencias entre fases

```
Fase 1 → Independiente (quick wins, no toca prompt)
Fase 2 → Independiente de Fase 1, depende de que el bot funcione hoy
Fase 3 → Depende de Fase 2 (pipeline validación debe existir antes de function calling)
Fase 4 → Depende de Fase 3 + volumen de negocios
```

## ✅ Checklist de Venta

### Umbral 1 — Pilotaje (3 negocios)

- [ ] CONNECTION_UPDATE webhook
- [ ] Rotar Evolution API key
- [ ] Backups DB
- [ ] Bot responde agendar/cancelar/reagendar sin errores

### Umbral 2 — Venta limitada (5 negocios)

- [ ] Umbral 1 completo
- [ ] B18 arreglado (fechas >7d)
- [ ] Pipeline validación post-LLM
- [ ] Dashboard sync confiable (idempotencia + retry)
- [ ] 48h sin errores en producción

### Umbral 3 — Venta general (10+ negocios)

- [ ] Umbral 2 completo
- [ ] Function calling implementado
- [ ] State machine para sesiones
- [ ] Git versioning activo
- [ ] 1 semana sin errores de cliente

### Umbral 4 — Crecimiento (50+ negocios)

- [ ] Umbral 3 completo
- [ ] BSP oficial activo
- [ ] Monitoreo y health checks
- [ ] Rate limiting por tenant

## 📱 Demo Script para Vendedores

```
FLUJO 1 — AGENDAR (mostrar esto primero)
"Hola" → "Quiero agendar un corte" → elegir número → elegir profesional
→ "mañana" → elegir hora → "sí" → ✅ confirmación

FLUJO 2 — CANCELAR
"Cancelar mi cita" → elegir número → "sí"

REGLAS PARA EL VENDEDOR:
✓ Esperar respuesta del bot antes de siguiente mensaje
✓ Solo usar "mañana" o "pasado mañana" (evitar fechas >7 días)
✗ No mandar mensajes rápido sin esperar
✗ No usar fechas lejanas ("9 de agosto", "30 de agosto")
```
