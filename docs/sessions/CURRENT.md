# Sesión Actual — Lazy Loading Slots 90 días

## Fecha
Jul 30–31, 2026 — sesión: `bot-lazy-loading-slots` (diagnóstico actualizado 31 jul 16:00)

## Objetivo
Implementar lazy loading de slots por día en el bot de WhatsApp. Ventana amplia de 90 días visible al LLM (vista compacta) + detalle hora por hora de 7 días + carga bajo demanda para días lejanos via `MOSTRAR_SLOTS|DD/MM/YYYY`.

## Causa raíz
Query `Leer Slots Disponibles` usaba `generate_series(0, 7)` → solo hoy+7 días. Fechas lejanas (ej. 9 de agosto) quedaban fuera de ventana → el LLM decía "no tengo disponibilidad". Verificado: el 9 de agosto SÍ tiene slots en DB real.

## Diseño aprobado
1. **Vista compacta 90 días** (5.4KB/87 líneas reales): agrupa profesionales por rango idéntico, `N profesionales` si >3, separador " · "
2. **Detalle 7 días** (7.1KB): horas exactas por profesional, formato vertical 🟢
3. **Días > 7d**: LLM responde SOLO `MOSTRAR_SLOTS|DD/MM/YYYY`, un nodo Postgres consulta slots de esa fecha y los envía por WhatsApp
4. **Historial**: el texto real de slots mostrados reemplaza el código MOSTRAR_SLOTS en DB (para que el siguiente turno el LLM tenga contexto)

## Progreso

### Completado ✅
- Extracción completa del workflow en `workflow-full.json` (nodos+conexiones reales)
- Query ampliada a 90 días: `generate_series(0, 89)` en `slots-query.sql`
- Formateador nuevo `fmt-code-new.js` probado con DB real (rangos contiguos, agrupa profesionales)
- Prompt AI Agent `ai-code.js` editado: vista compacta 90d, detalle 7d, regla MOSTRAR_SLOTS en prompt + normalizador (5 ocurrencias)
- Query por fecha `slots-fecha-query.sql` (TO_DATE de output del AI Agent)
- Formateador de fecha `fmt-fecha-code.js` (2 salidas: texto + historyJSON)
- 4 nodos nuevos diseñados: Leer Slots Fecha, Formatear Slots Fecha, Enviar Slots Fecha, Guardar Historial Fecha
- Switch modificado: regla 5 MOSTRAR_SLOTS, Respuesta Normal movida a main[5]
- `workflow-nuevo.json` completo (45 nodos, 32 conexiones, sintaxis validada)

### Aplicado (Jul 31) ✅
- PATCH a la API n8n exitoso → versionId `96f38869-528a-421b-b57e-8e1128b30d90` (45 nodos, 32 conexiones)
- POST /activate exitoso → `active: true`
- `restored.json` sincronizado a `workflows/WhatsApp Bot - Genérico restored.json`
- Verificado en n8n: Switch tiene 5 reglas (Rule 4 = MOSTRAR_SLOTS), AI Agent contiene MOSTRAR_SLOTS en jsCode, nodos Leer Slots Fecha y Formatear Slots Fecha existen

### Diagnóstico E2E (Jul 31, actualizado)

**✅ Lookup Negocio: FUNCIONA.** Encontró business_id=1 (`whatsapp_instance='peluqueria-beta'`) en 36ms. La query SÍ retorna filas — el diagnóstico anterior (CURRENT.md desactualizado) decía lo contrario.

**✅ Leer Slots Disponibles:** retorna 10,412 items en ventana de 90 días (104ms).

**✅ Formatear Disponibilidad:** incluye "Domingo 9 de agosto" en la vista compacta. El pipeline de datos funciona correctamente.

**✅ Switch, 4 nodos nuevos, conexiones:** todo cableado correctamente.

**🔴 Causa raíz real: El AI Agent NO emite `MOSTRAR_SLOTS|09/08/2026`.** Responde con saludo normal. Dos factores:

1. **Colisión de reglas en el prompt:** `saludoInicial` (posición 2 del prompt) dice "siempre saluda en primer mensaje" sin excepción para mensajes que ya traen fecha. `MOSTRAR_SLOTS` está en posición 9-10. No hay regla de precedencia explícita.
   - Ejemplo real: User "Hola, quiero agendar para el 9 de agosto" → Bot "¡Hola! Bienvenido a Peluquería Meyer" (ignora la fecha).

2. **OpenRouter descartado como causa:** La key existe en `/root/.env` pero NO está pasada al contenedor n8n (`env_file: .env` de `/root/n8n/.env`). Los 3 proveedores OpenRouter son saltados por `if (!p.key) continue`. Cadena real: Gemini → Cerebras → Groq.

### Fix aplicado (Jul 31, tarde) ✅
- **Pre-processor de fechas** agregado al jsCode del AI Agent (línea ~390, antes de `systemPrompt`)
- Detecta fechas en español via regex → agrega `INSTRUCCIÓN DE PRECEDENCIA` al TOP del system prompt
- Resultado: el bot YA NO solo saluda cuando el mensaje trae fecha — ahora procesa
- **Pero** todavía no emite `MOSTRAR_SLOTS|DD/MM/YYYY` para días >7 — responde con flujo de agendamiento normal
- versionId activo: `2e1b896a-a22c-4109-8c65-be032ebb18e7`
- SaludoInicial modificado con "REGLA DE PRECEDENCIA — CRÍTICO" (también aplicado)

### Pendiente 🔴 (requiere investigación broader)
1. **El LLM no emite MOSTRAR_SLOTS para días >7** — responde con agendamiento normal aunque la fecha esté lejos. Investigar por qué el LLM ignora esta regla específica.
2. **Prompt de 560 líneas es frágil** — múltiples bugs históricos (B2-B18) son por colisión de reglas. Investigar arquitectura alternativa (state machines, validación determinística, function calling).
3. **Research para Perplexity** — ver sección abajo.

## Archivos clave (en /var/folders/.../T/opencode/)
- `workflow-nuevo.json` — workflow completo a aplicar (45 nodos)
- `workflow-full.json` — workflow original ( backup de referencia)
- `slots-query.sql` — query 90 días
- `fmt-code-new.js` — formateador nuevo
- `ai-code.js` — jsCode AI Agent editado
- `slots-fecha-query.sql` — query por fecha específica
- `fmt-fecha-code.js` — formateador de día específico
- `builder.cjs` — script constructor (ya ejecutado)

## Estructura del prompt AI Agent (552 líneas, 8 layers/22 secciones)
- L9: `const d = $('Formatear Disponibilidad').first().json;`
- L18-32: RESET/RETOMAR POR INACTIVIDAD
- L44: SHORT-CIRCUIT FUERA DE HORARIO
- L65: SYSTEM PROMPT modular (8 layers)
- L70: LAYER 1 IDENTITY
- L107: horariosDisponibles (vista compacta 90d + detalle 7d + regla MOSTRAR_SLOTS)
- L117: LAYER 2 PRIORITY RULES
- L203: reglaDisponibilidad (días lejanos → código, prohibido inventar)
- L212: LAYER 4 APPOINTMENT FLOW (agendamiento paso 4 → MOSTRAR_SLOTS)
- L338: LAYER 5 CANCEL FLOW
- L353: LAYER 8 TONE & EDGE CASES
- L386: ASSEMBLE
- L530: normalizador (patrones regex, MOSTRAR_SLOTS añadido al inicio)
- L545: historial (prior + user + assistant)

## Switch (5 reglas + fallback)
- main[0] CITA_CONFIRMADA → Leer Disponibilidad
- main[1] GESTIONAR_CITA → Leer Citas Cliente
- main[2] CANCELAR_CITA → Ejecutar Cancelación
- main[3] REAGENDAR_CITA → Ejecutar Reagendamiento
- main[4] MOSTRAR_SLOTS → Leer Slots Fecha (**NUEVO**)
- main[5] Respuesta Normal (fallback extra, **movida de [4]**)

## Flujo MOSTRAR_SLOTS (nuevo)
```
Switch → Leer Slots Fecha (postgres) → Formatear Slots Fecha (code, 2 salidas)
  → out[0] → Enviar Slots Fecha (httpRequest → Evolution API)
  → out[1] → Guardar Historial Fecha (postgres upsert, sobrescribe código con texto real)
```

## Research para Perplexity (próximo paso)

### Documentos a subir
1. **`workflows/WhatsApp Bot - Genérico restored.json`** — workflow completo (248KB)
2. **`docs/BUG_BACKLOG.md`** — todos los bugs documentados
3. **`docs/ARCHITECTURE.md`** — schema DB, arquitectura, principios

### Preguntas clave para Perplexity

**1. Arquitectura de prompts para bots WhatsApp + LLMs**
> "¿Cómo resuelven empresas como Landbot, Treble, Wati, respond.io la colisión de reglas en prompts largos de LLMs? ¿Usan state machines, validación determinística post-LLM, function calling con schema estricto, o prompt-based routing? ¿Cuál es la mejor práctica para evitar que un LLM ignore reglas del prompt?"

**2. Lazy loading de datos en chatbots**
> "¿Cómo implementan los chatbots con LLMs el lazy loading de datos (como mostrar slots de disponibilidad solo bajo demanda)? ¿Patrones para dividir información en ventanas (7 días detallado + 90 días compacto) y carga bajo demanda via códigos como MOSTRAR_SLOTS|DD/MM/YYYY?"

**3. Fallback chains con detección de calidad**
> "¿Cómo diseñar fallback chains de LLMs que detecten degradación de calidad (no solo disponibilidad)? Si un modelo responde 200 con contenido no-vacío pero ignora reglas del prompt, ¿cómo se activa el fallback al siguiente modelo?"

**4. Multi-tenant WhatsApp bots con n8n**
> "¿Cómo escalar un bot de WhatsApp multi-tenant con n8n a 10-50-100 negocios? Rate limiting, colas, concurrencia, separación de datos. ¿Evolution API vs WhatsApp oficial (BSP)?

**5. Prompt engineering para instrucciones con precedencia**
> "¿Cómo manejar reglas con precedencia en prompts de LLMs? Cuando dos reglas compiten (saludo vs procesamiento de fecha), ¿cuál es la mejor práctica: XML tags, secciones numeradas, role-based priority (developer vs user), o pre-procesamiento JavaScript antes del LLM?"
