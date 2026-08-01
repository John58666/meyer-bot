# 05-BUGS.md — Tabla Maestra de Bugs (42 bugs)

> **Quick reference.** Para detalle de B1-B18, ver `docs/BUG_BACKLOG.md`.
> **Bugs N1-N24** son hallazgos de la investigacion del 31 Jul 2026.
> **Regla:** todo bug nuevo va ACA (NO crear archivos nuevos).

## 📊 Todos los bugs

| B# | Seve | Area | Sintoma (1 linea) | Estado | Fase |
|----|------|------|-------------------|--------|------|
| B1 | 🟡 | Dash | Profesional ve solo titulo sin editor de horario | 🟡 PEND | 2 |
| B2 | 🟢 | Bot | Servicios ambiguos ("corte") no se desambiguan | ✅ FIX | - |
| B3 | 🟢 | Bot | No pide confirmacion antes de agendar/cancelar | ✅ FIX | - |
| B4 | 🟢 | Bot | Hora incorrecta en agendamiento (6pm → 11am) | ✅ FIX | - |
| B5 | 🟢 | Bot | No entiende referencias ("el mismo barbero") | ✅ FIX | - |
| B6 | 🟢 | Bot | Prompt fragil — cambios causan regresiones | ✅ FIX | - |
| B7 | 🟢 | Bot | Formato horarios muy extenso | ✅ FIX | - |
| B8 | 🟢 | Bot | Profesionales como texto plano, no lista numerada | ✅ FIX | - |
| B9 | 🟢 | Bot | Acento argentino en vez de colombiano | ✅ FIX | - |
| B10 | 🟢 | Bot | No sabe responder sobre datos personales (Ley 1581) | ✅ FIX | - |
| B11 | 🟢 | Bot | Ofrece dias bloqueados y horarios fuera de rango | ✅ FIX | - |
| B12 | 🟢 | Bot | Recordatorios 24h: whatsapp_instance undefined | ✅ FIX | - |
| B13 | 🟢 | Infra | IP hardcodeada en rotar-evolution-api-key | ✅ FIX | - |
| B14 | 🟢 | Bot | Servicios sin formato + AM/PM innecesario + timeout | ✅ FIX | - |
| B15 | 🔴 | Seg | Evolution API key leak en git history (2 commits) | 🔴 PEND | 1 |
| B16 | 🟡 | Bot | == en bodyParameter de HTTP Request | 🟡 PEND | 1 |
| B17 | 🟢 | Bot | Bucle "Entendido, dime como..." (historial envenenado) | ✅ FIX | - |
| B18 | 🟢 | Bot | Fechas >7d: deteccion en PM (extraerFechaLejana) + short-circuit en AI Agent (sin LLM). Respuesta amable redirigiendo a ventana 7d. | ✅ FIX | - |
| N1 | 🔴 | Bot | 3 LLMs fallan → workflow crashea (return []) | ✅ FIX | 1 |
| N2 | 🟡 | Dash | Sync New Dashboard reporta profesional equivocado | 🟡 PEND | 2 |
| N3 | 🟢 | Seg | WEBHOOK_SECRET compartido entre todos los negocios | 🟢 PEND | 3 |
| N4 | 🟡 | Bot | Race condition mensajes concurrentes → corrompe historial | 🟡 PEND | 3 |
| N5 | 🟡 | Bot | Buttons/list responses soportados en Procesar Mensaje | ✅ FIX | 1 |
| N6 | 🟢 | Bot | Reaction/protocol messages crashean el flujo | ✅ FIX | 1 |
| N7 | 🔴 | DB | Double-booking: sin UNIQUE index en appointments | ✅ FIX | 2 |
| N8 | 🔴 | DB | Apostrofes en pushName/servicio rompen INSERT SQL | ✅ FIX | 1 |
| N9 | 🟡 | Bot | gapMessage mejorado: LLM ahora revisa historial antes de perder contexto | ✅ FIX | 1 |
| N10 | 🟡 | Bot | Rate limit static data no es thread-safe | 🟡 PEND | 4 |
| N11 | 🟡 | Dash | Webhooks al dashboard fallan sin retry ni alerta | 🟡 PEND | 2 |
| N12 | 🔴 | DB | Guardar Sesion ahora usa UPSERT atomico | ✅ FIX | 1 |
| N13 | 🟡 | Bot | Timeout 15s + options en HTTP Request nodes | ✅ FIX | 1 |
| N14 | 🔴 | Seg | SQL injection via pushName/conversation sin escape | ✅ FIX | 1 |
| N15 | 🟡 | Bot | Captions de image/video + contact name soportados | ✅ FIX | 1 |
| N16 | 🟡 | Bot | Rate limit static data crece sin limite (memory leak) | 🟡 PEND | 2 |
| N17 | 🟡 | DB | UNIQUE constraint agregado a whatsapp_instance | ✅ FIX | 1 |
| N18 | 🟢 | DB | Sin cleanup automatico de sesiones expiradas | ✅ FIX | 1 |
| N19 | 🟢 | DB | 10 citas backfilled con hora_fin | ✅ FIX | 1 |
| N20 | 🟢 | DB | Sin CHECK constraint contra fechas pasadas en appointments | 🟡 PEND | 2 |
| N21 | 🟡 | WA | Evolution API desconexion sin monitoreo ni alerta | ✅ FIX | 1 |
| N22 | 🟢 | Bot | Notificacion Reagend implementada | ✅ FIX | 1 |
| N23 | 🟡 | Bot | Message ordering no garantizado (perdida de contexto) | 🟡 PEND | 4 |
| N24 | 🟢 | Dash | Webhook secret compartido, sync-new no valida appointment | 🟡 PEND | 2 |

## 📊 Resumen por severidad

| Severidad | Cantidad | Significado |
|-----------|----------|-------------|
| 🔴 CRIT | 10 | Perdida de datos, caida total, seguridad |
| 🟡 HIGH | 21 | Funcionalidad rota, riesgo de datos |
| 🟢 MED | 3 | Molestia, UX, cosmetico |
| ✅ FIX | 12 | Resueltos |

## 📊 Resumen por area

| Area | Cantidad | Mas comunes |
|------|----------|-------------|
| **Bot** | 25 | Prompt, LLM, flujo de mensajes |
| **DB** | 7 | Constraints, indices, SQL escaping |
| **Dash** | 4 | Sync webhooks, UI |
| **Seg** | 3 | API keys, webhook auth |
| **Infra** | 1 | IPs hardcodeadas |
| **WA** | 1 | Evolution API |

## 📝 Template — como agregar un bug nuevo

Copiar esta fila al final de la tabla y completar:

```
| N## | 🔴/🟡/🟢 | Bot/Dash/DB/Infra/Seg/WA | [1 linea que describa el sintoma] | 🔴 PEND | 1/2/3/4 |
```

**Categorias validas:** Bot, Dash, DB, Infra, Seguridad, WhatsApp
**Severidad:** 🔴 CRIT (perdida de datos/caida), 🟡 HIGH (funcionalidad rota), 🟢 MED (molestia)
**Fase:** 1 (supervivencia), 2 (confiabilidad), 3 (arquitectura), 4 (escala), - (ya resuelto)
