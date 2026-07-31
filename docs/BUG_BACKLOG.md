# BUG_BACKLOG.md — meyer-bot

> Backlog priorizado de bugs detectados en producción.  
> **Estado:** Pendiente de revisión y corrección uno por uno.  
> **Regla:** No mergear a main sin aprobación explícita. Cada bug se corrige, prueba y despliega individualmente.

---

## PROTOCOLO PARA CUALQUIER AGENTE QUE LEA ESTE ARCHIVO

Leer `CLAUDE.md` `´CONTEXT.UPDATE 'en la raíz del proyecto para el protocolo completo. Resumen:

1. **Un bug a la vez** — no trabajar en múltiples bugs simultáneamente
2. **Preguntar antes de actuar** — presentar diagnóstico + solución, esperar aprobación
3. **No comprometer producción** — no desplegar ni modificar DB sin aprobación
4. **Investigación completa** — docs + bot (n8n) + dashboard + multi-tenant + causa raíz
5. **Sincronización** — todo cambio debe considerar bot + dashboard + DB + todos los negocios
6. **Documentar al finalizar** — actualizar este backlog + KEY_LEARNINGS.md
7. **GitHub solo cuando se indique** — no hacer commit ni push sin instrucción

---

## Prioridad CRÍTICA — Bot & Sistema

### B1 — Agendas de profesionales no independientes

**Síntoma:** Los profesionales comparten el mismo horario base (`schedule_text` del negocio). Si un profesional tiene un horario distinto a otro, no hay dónde almacenarlo. Además el bot (n8n) consulta disponibilidad sin filtrar por `professional_id`, mezclando citas de todos los profesionales. Esto también causa que se muestren slots que YA están ocupados por otro profesional como disponibles.

**Causa raíz:**
- `schedule_text` es columna de `businesses` — un solo horario para todo el negocio
- No existe `professional_schedule` por profesional
- Las queries del bot en n8n (`Leer Disponibilidad`) NO filtran por `professional_id`
- El INSERT del bot en n8n no asigna `professional_id` al crear citas
- El bot no consulta `schedule_exceptions` (bloqueos) al mostrar disponibilidad

**Archivos involucrados:**
- `database/n8n-queries.sql` — slot check + INSERT no usan professional_id
- `workflows/WhatsApp Bot - Genérico.json` — nodo "Leer Disponibilidad" (PostgreSQL), nodo "Insertar Cita" (PostgreSQL)
- `dashboard/lib/actions.ts` — `getAvailableSlots()` usa schedule_text global

**Estado:** Fase 1 completa ✅ — Documentada en `docs/fixes/B1-agendas-independientes-fase1.md`

**Fase 1 (n8n — listo para aplicar en n8n UI):**
- [x] `Leer Slots Disponibles`: query ahora cruza cada profesional contra slots, filtra citas por profesional
- [x] `Formatear Disponibilidad`: agrupa por fecha → profesional, formato compacto con header
- [x] `Leer Disponibilidad`: colisión ahora filtra por profesional específico

**Fase 2 (completada — 2026-07-22):**
- [x] Migración DB `017_professional_schedule.sql` creada
- [x] Dashboard: editor de horario por profesional en Configuración
- [x] `getAvailableSlots()` usa COALESCE(ps.schedule_text, b.schedule_text)
- [x] `HorarioClient` acepta `onSave` prop para reutilización
- [x] Queries n8n actualizadas con COALESCE per-profesional

**⚠️ BUG POST-DEPLOY (2026-07-22):** Profesional ve solo título "Mi horario" sin editor. Causa probable: middleware redirect en `auth.config.ts` bloqueaba el acceso. Se eliminó (commit `f4b4fb3`) pero bug persiste. Pendiente debuggear si el redirect era la causa real o hay otro problema en el componente.

---

### B2 — Servicios con nombres parecidos (ambigüedad del LLM)

**Síntoma:** Cuando hay servicios con nombres similares ("Corte niño", "Corte caballero", "Corte dama") y el cliente dice "quiero un corte", el bot a veces elige uno arbitrario, a veces lista solo algunos. Nunca dice "hay 3 tipos de corte: ¿cuál prefieres?" con la lista completa.

**Causa raíz:**
- El mapeo de sinónimos en el prompt dice `"corte", "cort", "crt" = Corte caballero` — prioriza un servicio sobre otros sin desambiguar
- No hay instrucción explícita de "si hay múltiples servicios que coinciden, LISTALOS TODOS con sus precios y pregunta cuál"
- El LLM no tiene un paso de desambiguación obligatorio

**Archivos involucrados:**
- `workflows/WhatsApp Bot - Genérico.json` — nodo AI Agent (system prompt)

**Estado:** ✅ Aplicado en n8n UI y en JSON local (2026-07-20)

**Cambios:**
- [x] Nuevo paso de desambiguación en AGENDAMIENTO: "si coincide con múltiples servicios, LISTA TODOS numerados"
- [x] Mapeo "corte" cambiado de "= Corte caballero" a "= coincide con cualquier servicio que contenga Corte. DESAMBIGUA"
- [x] Aplicar en n8n UI (nodo AI Agent → jsCode)

---

### B3 — No hay confirmación antes de agendar

**Síntoma:** El bot agenda sin mostrar resumen ni pedir confirmación. Ocurre más seguido cuando la conversación tiene historial (ej: ya se agendó una cita antes el mismo día). También aplica a cancelaciones: no pide confirmación antes de cancelar.

**Causa raíz:**
- El prompt tiene instrucción de confirmación pero el LLM no la sigue cuando hay historial largo
- No hay validación del lado del workflow (n8n) — el INSERT se ejecuta aunque el LLM emita `CITA_CONFIRMADA` sin resumen previo
- El flujo de cancelación también carece de confirmación

**Archivos involucrados:**
- `workflows/WhatsApp Bot - Genérico.json` — nodo AI Agent (prompt), nodos downstream
- `database/n8n-queries.sql` — INSERT sin validación previa

**Estado:** ✅ Completado (2026-07-22)

**Cambios:**
- [x] Nueva regla ABSOLUTA: "NUNCA emitas CITA_CONFIRMADA sin haber mostrado resumen"
- [x] Explicita que aplica incluso en 2da/3ra cita en misma conversación
- [x] Confirmación agregada a CANCELAR: ahora pide "¿Confirmas que deseas cancelar?" antes de emitir código
- [x] Aplicar en n8n UI (nodo AI Agent → jsCode)

**Fix adicional (2026-07-22):** Se agregó PASO 4 de confirmación obligatoria en reagendamiento (antes emitía REAGENDAR_CITA sin resumen ni pregunta). Ahora muestra resumen completo y pide confirmación exactamente como en agendamiento.

---

### B4 — Hora incorrecta en agendamiento

**Síntoma:** Cliente pide 6pm y el bot agenda a las 11:00. Ocurre porque el LLM parsea mal la hora y no hay validación aguas abajo.

**Causa raíz:**
- El LLM genera `CITA_CONFIRMADA` con hora incorrecta
- El extractor de n8n toma la hora sin validar contra lo que el cliente dijo
- No hay comparación entre hora solicitada y hora final

**Archivos involucrados:**
- `workflows/WhatsApp Bot - Genérico.json` — nodo AI Agent (prompt), nodo Verificar Slot

**Estado:** ✅ Completado (2026-07-22)

**Cambios:**
- [x] Regla de validación de hora al emitir CITA_CONFIRMADA: "la hora debe ser IDÉNTICA a la del resumen"
- [x] Validación extra en Verificar Slot: normaliza hora AM/PM a 24h
- [x] Aplicar en n8n UI (AI Agent → jsCode)
- [x] Aplicar en JSON local (Verificar Slot — normalización de hora)

**Fix adicional (2026-07-22):** El prompt tenía `"Si dice solo un número, es la posición en el listado"` en reagendar PASO 3, causando que "3" se interpretara como índice (posición 3 = 10:00 AM) en vez de 3 PM. Corregido a: números del 1 al 12 = HORA, no posición. También se agregó PASO 4 de confirmación obligatoria en reagendamiento (antes emitía REAGENDAR_CITA sin preguntar).

---

### B5 — Bot no entiende contexto de conversación

**Síntoma:**
- Cliente: "El mismo barbero" (refiriéndose a Juliana, que fue la última profesional usada)
- Bot: "¿Te refieres a Julian?" (adivina mal)
- Cliente pregunta "Qué hora hay disponible" y el bot responde "¿Para qué hora?" en vez de mostrar los horarios
- Bot agenda citas en fechas pasadas (cliente pone fecha mal y el bot no valida)

**Causa raíz:**
- El prompt no instruye al LLM a usar el contexto de la conversación para resolver referencias ("el mismo", "el de antes")
- El prompt no instruye al LLM a mostrar disponibilidad cuando el cliente explícitamente la pide
- No hay validación de fecha/hora contra el presente

**Archivos involucrados:**
- `workflows/WhatsApp Bot - Genérico.json` — nodo AI Agent (system prompt)

**Estado:** ✅ Aplicado en n8n UI y en JSON local (2026-07-20)

**Cambios:**
- [x] Paso 7 en AGENDAMIENTO: resolución de referencias contextuales ("el mismo", "el de antes", etc.)
- [x] Paso 8 en AGENDAMIENTO: preguntas genéricas de disponibilidad
- [x] Paso 9 en AGENDAMIENTO: validación de fecha — NUNCA EN EL PASADO

---

### B6 — Bot delira y regresa errores viejos (prompt frágil)

**Síntoma:** Se corrige un error y al desplegar vuelven errores que ya se habían resuelto. El prompt es monolítico y cualquier cambio tiene efectos colaterales.

**Causa raíz:**
- System prompt monolítico (~4,000 chars) — frágil ante cambios
- n8n no tiene staging — se deploya directo a producción
- No hay tests automatizados post-deploy
- La inyección de variables puede eliminar secciones del prompt

**Archivos involucrados:**
- `workflows/WhatsApp Bot - Genérico.json` — nodo AI Agent

**Estado:** Completo ✅ — Modularizado en `workflows/WhatsApp Bot - Genérico.json` (2026-07-20)

**Cambios aplicados:**
- [x] Modularizar el prompt en 22 variables agrupadas en 8 capas lógicas
- [x] Backup del prompt original en `docs/fixes/B6-backup-pre-modularizacion.md`
- [x] Documentar cada sección en `docs/prompt-changelog.md`
- [x] Agregar smoke test conversacional post-deploy — implementado como pre-push hook

**Detalle de la modularización:**
| Capa | Secciones | Propósito |
|------|-----------|-----------|
| 1 | role, saludoInicial, instruccionPrincipal | Identidad del bot |
| 2 | reglaSesionInterna, precedenciaGestion, seleccionCita, cancelarAccion, reagendarAccion, desambiguacion, cambioIntencion, reglaDisponibilidad | Reglas de prioridad |
| 3 | servicios, profesionales, horariosAtencion, fechaHoy, validacionHorario, sesionActiva, horariosDisponibles | Datos dinámicos del negocio |
| 4 | agendamiento | Flujo de agendamiento (6 pasos) |
| 5 | cancelaciones | Detección y emisión de código de cancelación |
| 8 | tolerancia, tono | Tolerancia ortográfica y tono |

**Archivos:**
- `docs/fixes/B6-backup-pre-modularizacion.md` — prompt original antes del cambio
- `docs/prompt-changelog.md` — changelog con capas documentadas
- `workflows/WhatsApp Bot - Genérico.json` — jsCode del nodo AI Agent actualizado

---

### B7 — Formato de horarios muy extenso y sin estructura

**Síntoma:** El bot muestra 20+ líneas de horarios disponibles sin agrupar ni compactar.

**Estado:** ✅ Aplicado en JSON (2026-07-21)

**Cambios:**
- [x] Header de fecha, agrupado por profesional, límite 8 slots, "y X más" en `Formatear Disponibilidad`
- [x] a.m./p.m. → AM/PM (eliminado `.replace(/AM/g, 'a.m.').replace(/PM/g, 'p.m.')`)
- [x] `disponibilidadCompleta` (todos los slots sin truncar) en output del nodo
- [x] Regla "MÁS HORARIOS" en prompt: si cliente pide "más horarios", "ver más", etc., usar HORARIOS COMPLETOS

---

### B8 — Mostrar profesionales como lista numerada

**Síntoma:** Los profesionales se muestran como texto plano "Camila, Cristian, John, Julian y Juliana".

**Estado:** ✅ Cubierto por B11 PASO 2.3 (aplicado en JSON 2026-07-21)

**Qué se hizo:**
- [x] Regla en agendamiento paso 2: "Si el cliente dice que no sabe qué profesional elegir, MUÉSTRALE la lista numerada: 1. Camila\n2. Cristian..."

---

### B9 — Acento argentino en el bot

**Síntoma:** El bot responde con modismos argentinos en vez de español colombiano neutro.

**Estado:** ✅ Aplicado en JSON (2026-07-21)

**Cambios:**
- [x] Instrucción explícita: "español colombiano neutro (usa 'tú' no 'vos')"
- [x] "recomendás" → "recomiendas", "¿Querés?" → "¿Quieres?"
- [x] Lista de expresiones colombianas naturales: "listo", "claro", "con gusto", "¿en qué más puedo ayudarte?", "seguimos", "ya mismo", "ahí te va", "dime"
- [x] Advertencia: "Evita modismos argentinos como 'che', 'vos', 'sabés', 'tenés', 'querés', 'podés'"

---

### B12 — Recordatorios 24h: whatsapp_instance eliminado por Code node

**Síntoma:** El workflow de recordatorios 24h no envía WhatsApp porque el HTTP Request queda con `{{ $json.whatsapp_instance }}` = `undefined`.

**Causa raíz:** El nodo Code `Filtrar Mañana1` recibe `whatsapp_instance` desde PostgreSQL pero no lo incluye en su output (`{ numero, nombre, mensaje, hora, servicio }`). El HTTP node downstream referencia `$json.whatsapp_instance` que nunca existe.

**Estado:** ✅ Completado (2026-07-22)

**Cambios:**
- [x] Agregado `whatsapp_instance: row['whatsapp_instance']` al output del Code node

---

### B13 — rotar-evolution-api-key: IP hardcodeada

**Síntoma:** Workflow temporal de rotación de API key tenía `http://178.104.27.180:8080` hardcodeado en 3 URLs.

**Causa raíz:** Escrito manualmente sin usar variable de entorno.

**Estado:** ✅ Completado (2026-07-22)

**Cambios:**
- [x] Reemplazadas 3 URLs hardcodeadas por `$env.EVOLUTION_API_URL` via template literal

---

### B14 — Múltiples errores de conversación: servicios sin formato, AM/PM innecesario, multi-servicio, timeout

**Síntomas:**
1. Lista de servicios en formato plano (coma separado)
2. Bot pregunta "4 AM o 4 PM" cuando 4 AM no existe en horarios
3. Cliente pide 8 servicios → bot se bloquea y da "problemita técnico"
4. "Problemática técnico" por timeout de LLM con contexto grande

**Causa raíz:**
1. `servicesText` se inyecta al prompt raw (coma separado) sin formatear
2. Regla de AM/PM tenía "pregunta siempre" ANTES de "verifica si existe" — LLM preguntaba sin verificar
3. No había instrucción para cuando el cliente pide múltiples servicios
4. Historial de 20 mensajes + timeout 10s → contexto grande → 3 proveedores fallan

**Estado:** ✅ Completado (2026-07-22)

**Cambios (WhatsApp Bot - Genérico.json):**
- [x] **Procesar Mensaje**: nuevo campo `servicesTextFormateado` — lista numerada con formato `1. Nombre - $precio`
- [x] **AI Agent prompt**: `servicios` y error "no disponible" ahora usan `servicesTextFormateado`
- [x] **AI Agent prompt**: regla AM/PM reordenada — primero verifica existencia, solo pregunta si ambos existen
- [x] **AI Agent prompt**: nueva regla multi-servicio — agenda uno a uno empezando por el primero
- [x] **AI Agent**: historial reducido de 20→14 mensajes, timeout aumentado de 10s→15s

---

## Prioridad CRÍTICA — Nuevos hallazgos (Sprint 19)

### B11 — Post-LLM validation gap (causa raíz de disponibilidad errónea)

**Síntoma:** El bot ofrece días bloqueados, horarios ocupados, y horarios especiales fuera de rango. También agenda en días sin operación.

**Causa raíz:** El flujo del bot tiene DOS verificaciones de disponibilidad, pero la segunda (post-LLM) NO valida contra schedule_exceptions ni schedule_text:

```
Antes del LLM:  Leer Slots Disponibles → ✅ chequea schedule_exceptions + colisiones
Después del LLM: Leer Disponibilidad → ❌ SOLO chequea colisiones de appointments
                                         ❌ NO chequea schedule_exceptions  
                                         ❌ NO chequea schedule_text
```

Si el LLM inventa un día/hora que no estaba en `disponibilidad`, la verificación post-LLM no lo ataja.

**Archivos involucrados:**
- `workflows/WhatsApp Bot - Genérico.json` — nodo "Leer Disponibilidad" (PostgreSQL query)
- `workflows/WhatsApp Bot - Genérico.json` — nodo AI Agent (prompt)

**Qué hay que hacer (PASO 1 — query, PASO 2 — prompt):**
- [x] **PASO 1**: Modificar query de `Leer Disponibilidad` para que también valide:
  - `schedule_exceptions` (cerrado y horario_especial)
  - `schedule_text` (día sin horario de atención)
  - Hora contra horario del negocio
  - Fecha/hora contra el presente
- [x] **PASO 2**: Agregar reglas en prompt:
  - "SOLO puedes ofrecer días y horas que aparezcan EXACTAMENTE en HORARIOS DISPONIBLES"
  - "Si todos los horarios disponibles están en PM, NO preguntes AM/PM — asume PM"
  - "Si el cliente no sabe qué profesional elegir, MUÉSTRALE la lista numerada"

**Aplicado en JSON local (2026-07-21). Documentado en `docs/superpowers/specs/2026-07-21-b11-post-llm-validation-gap.md`.**

---

### B15 — Evolution API key sin rotar (leak en git history)

**Síntoma:** La Evolution API key actual en VPS (`8CB6F53ED141-4636-BC58-CB6D38C755BD`) es la misma que aparece en 2 leaks del git history (commits `a573d9c`, `c827b95`). Cualquiera con acceso al repo histórico puede enviar mensajes WhatsApp desde los números configurados.

**Causa raíz:** La key nunca se rotó después de que gitleaks detectara los leaks en la auditoría de seguridad (6 julio 2026).

**Estado:** Pendiente — requiere acceso al VPS

**Pasos:**
- [ ] Generar nueva API key desde Evolution API manager (http://178.104.27.180:8080/manager)
- [ ] Actualizar `EVOLUTION_API_KEY` en `.env` del VPS
- [ ] Reiniciar containers n8n: `docker compose down && docker compose up -d`
- [ ] Verificar webhooks funcionando (enviar mensaje de prueba)

---

### B16 — Express `==` en bodyParameter de HTTP Request (Respuesta Normal)

**Síntoma:** El nodo "Respuesta Normal" (HTTP Request) tenía `"value": "=={{ $('Webhook').item.json... }}"` en el bodyParameter `number`. Esto puede causar que Evolution API reciba un número malformado y no entregue el mensaje.

**Causa raíz:** El `==` es sintaxis de IF node condition (expresión con string compare), NO de parámetros HTTP Request. En bodyParameters debe ser `={{ }}` (un solo `=`).

**Estado:** ✅ Aplicado en JSON local (2026-07-25) — Pendiente importar en n8n UI

**Cambios:**
- [x] Fix en `WhatsApp Bot - Genérico.json` (91KB)
- [x] Fix en `WhatsApp Bot - Genérico IMPORTABLE.json` (107KB)

---

### B17 — Bot repite "Entendido, dime cómo puedo ayudarte" siempre (historial envenenado)

**Síntoma:** El bot responde "Entendido, dime cómo puedo ayudarte. 😊 ¿Quieres agendar una cita?" a CUALQUIER mensaje ("Hola", "si", etc.), incluso después de aplicar el fix del neutralizador. Afectó a múltiples números.

**Causa raíz:** Bucle de envenenamiento del historial en `conversation_history`:
1. Sin sesión activa, el LLM alucina cancelación → el neutralizador post-LLM reemplazaba el output con la frase
2. El nodo guardaba `result.content` (YA reemplazado por la frase) como turno assistant en el historial
3. El LLM veía TODOS sus turns anteriores diciendo la frase → la imitaba
4. La frase imitada no matchea la regex del neutralizador (no contiene "cancelad/anulad") → pasa directo → se guarda → se refuerza el bucle

**Diagnóstico:** El `historyJSON` de la ejecución mostraba todos los turns assistant con la frase exacta. El workflow activo (`tzFJ9m2pJX1AheI0`) YA tenía el fix de regex — el problema no era el código actual.

**Estado:** ✅ Resuelto (2026-07-30)

**Cambios:**
- [x] DB: `DELETE FROM conversation_history` para números envenenados (573142556322, 573226541957). Detección: `SELECT numero FROM conversation_history WHERE messages::text LIKE '%Entendido, dime cómo puedo ayudarte%'`
- [x] Código: el neutralizador guarda `result.rawOriginal` (lo que el LLM dijo) en el historial en vez de la frase neutralizada
- [x] Aplicado en workflow activo vía API PATCH (versionId `f757a680-b9c1-424d-b817-c05ecf0814bb`) y en `WhatsApp Bot - Genérico restored.json`
- [x] Regla permanente agregada en `docs/harness/RULES.md` + lección en `docs/KEY_LEARNINGS.md`

**Validación:** Historial nuevo de 573142556322 muestra respuesta correcta ("Hola" → saludo, "agendar" → lista de servicios).

---

## Prioridad MEDIA

### B10 — Información de tratamiento de datos

**Síntoma:** Si el cliente pide info sobre datos personales, el bot no sabe responder.

**Estado:** ✅ Aplicado en JSON (2026-07-21)

**Cambios:**
- [x] Sección "DATOS PERSONALES (Ley 1581)" en prompt del AI Agent
- [x] Respuesta estándar: "Tus datos personales están protegidos conforme a la Ley 1581 de Protección de Datos en Colombia..."
- [x] Enlace dinámico: `${d.politicaPrivacidadUrl || '[enlace a política de privacidad]'}`
- [x] Detecta: "uso de sus datos", "privacidad", "protección de datos", "para qué van a usar mi información", "dónde guardan mis datos"
- [x] Cumple Ley 1581 de 2012 (Colombia)

---

### B18 — Lazy Loading Slots 90 días (MOSTRAR_SLOTS|DD/MM/YYYY)

**Síntoma:** Fechas lejanas (ej. 9 de agosto) no muestran disponibilidad. El bot dice "no tengo disponibilidad" aunque la DB SÍ tiene slots para esa fecha.

**Causa raíz:** Query `Leer Slots Disponibles` usaba `generate_series(0, 7)` → solo ventana de hoy+7 días. Fechas fuera de esa ventana quedaban fuera de la lista de disponibilidad.

**Solución diseñada:**
1. Vista compacta 90 días (`generate_series(0, 89)`)
2. Detalle hora por hora de 7 días
3. Días > 7: LLM responde SOLO `MOSTRAR_SLOTS|DD/MM/YYYY` → nodo Postgres consulta slots de esa fecha → envía por WhatsApp
4. Historial: el texto real de slots mostrados reemplaza el código MOSTRAR_SLOTS en DB

**Cambios en workflow (45 nodos, 32 conexiones):**
- `Leer Slots Disponibles`: query ampliada a 90 días (`generate_series(0, 89)`)
- `Formatear Disponibilidad`: nuevo formateador con rangos por profesional
- `AI Agent`: jsCode con regla MOSTRAR_SLOTS en 5 secciones del prompt
- `Switch`: regla 5 `MOSTRAR_SLOTS` → main[4], Respuesta Normal movida a main[5]
- **4 nodos nuevos:** Leer Slots Fecha, Formatear Slots Fecha, Enviar Slots Fecha, Guardar Historial Fecha

**Diagnóstico E2E (Jul 31, corregido):**

El diagnóstico anterior decía "Lookup Negocio devuelve vacío" — **eso es FALSO**. Verificación real:

| Componente | Estado | Detalle |
|------------|--------|---------|
| Lookup Negocio | ✅ FUNCIONA | Encontró business_id=1 (`peluqueria-beta`) en 36ms |
| Leer Slots Disponibles | ✅ FUNCIONA | 10,412 items en ventana de 90 días (104ms) |
| Formatear Disponibilidad | ✅ FUNCIONA | Incluye "Domingo 9 de agosto" en vista compacta |
| Switch + 4 nodos nuevos | ✅ FUNCIONA | Conectados correctamente |
| AI Agent → MOSTRAR_SLOTS | 🔴 FALLA | No emite el código para días >7 |

**Causa raíz real:** El AI Agent NO emite `MOSTRAR_SLOTS|09/08/2026` por colisión de reglas en el prompt:
1. `saludoInicial` (posición 2 del prompt) dice "siempre saluda en primer mensaje" sin excepción
2. `MOSTRAR_SLOTS` está en posición 9-10 del prompt
3. No hay regla de precedencia explícita que resuelva el conflicto

**Fix parcial aplicado (Jul 31):**
- [x] Pre-processor de fechas: detecta fecha en español via regex → agrega `INSTRUCCIÓN DE PRECEDENCIA` al TOP del system prompt
- [x] Resultado: el bot YA NO solo saluda — ahora procesa el mensaje cuando trae fecha
- [x] Pero todavía no emite `MOSTRAR_SLOTS|DD/MM/YYYY` — responde con flujo de agendamiento normal
- versionId activo: `2e1b896a-a22c-4109-8c65-be032ebb18e7`

**Pendiente 🔴 (requiere investigación):**
1. El LLM ignora la regla MOSTRAR_SLOTS para días >7 — responde con agendamiento normal
2. Prompt de 560 líneas con múltiples bugs históricos de colisión de reglas
3. Investigar: state machines vs prompt-based routing, function calling, validación determinística

---

## Notas de Investigación (pre-fix)

### Queries del bot que ignoran professional_id

En `database/n8n-queries.sql`:
```sql
-- Slot check (Leer Disponibilidad) — NO filtra por professional_id
SELECT fecha, hora, estado FROM appointments
WHERE business_id = 1
  AND fecha = TO_DATE(...)
  AND hora = ...::time
  AND estado != 'Cancelada';

-- INSERT (Append row in sheet) — NO asigna professional_id
INSERT INTO appointments (business_id, fecha, hora, nombre, servicio, numero, estado)
VALUES (1, ..., ..., ..., ..., ..., 'Pendiente');
```

### Mapeo actual de servicios en prompt (post-B2)
```javascript
"corte", "cort", "crt" = coincide con CUALQUIER servicio que contenga "Corte". APLICA DESAMBIGUACIÓN.
```

### Regresiones conocidas (B6)
| Error | Se corrigió en | Regresó en | Motivo |
|-------|---------------|------------|--------|
| Code node sin jsCode | Sprint 17 | — | No ha regresado |
| quoted messages | Sprint 17 | — | No ha regresado |
| Confirmación saltada | Sprint 12? | Varias veces | Prompt monolítico (B6 resuelve la fragilidad) |
