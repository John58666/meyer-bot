# B5 — Bot no entiende contexto de conversación

> Arregla: el bot no resuelve referencias contextuales ("el mismo barbero", "qué hora hay disponible"), ni valida fechas pasadas.
> Aplica en: n8n workflow `WhatsApp Bot - Genérico`, nodo `AI Agent` → `jsCode`.

---

## Diagnóstico

Tres sub-bugs, todos en el system prompt del AI Agent:

### 5.1 — "El mismo barbero" no resuelve contexto
El cliente usa referencias anafóricas ("el mismo", "el de antes", "el mismo barbero") que requieren mirar mensajes previos en la conversación. El LLM recibe el historial completo, pero el prompt no le indica explícitamente que lo use para resolver referencias.

### 5.2 — "Qué hora hay disponible" responde mal
Cliente: "Qué hora hay disponible" → Bot: "¿Para qué hora?" (piensa que el cliente está dando una hora, no pidiendo disponibilidad). El prompt instruye "SOLO muestra horarios cuando el cliente indique una fecha específica", pero no cubre el caso de preguntas genéricas de disponibilidad.

### 5.3 — No valida fechas pasadas
El prompt no tiene ninguna instrucción que impida agendar en el pasado. Si el cliente dice una fecha que ya pasó, el LLM la acepta y emite CITA_CONFIRMADA.

---

## Cambio único: nodo `AI Agent` → `jsCode`

### Sección a modificar: añadir estas reglas en el system prompt.

**Insertar después del bloque `AGENDAMIENTO — MÍNIMO DE PREGUNTAS` (después de línea ~183), como un nuevo bloque numerado:**

```
8. RESOLVER REFERENCIAS CONTEXTUALES:
   Si el cliente dice "el mismo", "el mismo barbero", "el mismo profesional", "el de antes",
   "el de siempre", "el que me atendió", "el mismo de la vez pasada" o similar:
   → Busca en el HISTORIAL de la conversación quién fue el último profesional mencionado
     (en una cita, agendamiento, o en el nombre del profesional)
   → USA ese profesional. NO preguntes "¿A cuál te refieres?" NI adivines otro nombre.
   → Si no hay historial previo, pregunta "¿Con qué profesional quieres agendar? 😊"

9. PREGUNTAS GENÉRICAS DE DISPONIBILIDAD:
   Si el cliente pregunta "qué hora hay disponible", "qué horarios tienen",
   "qué disponibilidad hay", "hay cupo", "hay espacio", "a qué hora se puede" o similar:
   → Responde: "¿Para qué día quieres agendar? 😊"
   → NUNCA respondas "¿Para qué hora?" — la pregunta del cliente es sobre disponibilidad general,
     no está dando una hora específica.
   → Confirma el día PRIMERO antes de mostrar horarios.

10. VALIDACIÓN DE FECHA — NUNCA EN EL PASADO:
    La fecha de hoy es ${d.fechaHoy}.
    Si el cliente da una fecha que ya pasó (anterior a hoy):
    → Responde: "Lo siento, no podemos agendar para una fecha que ya pasó 😊 ¿Quieres elegir otro día?"
    → Pídele que elija una fecha válida (hoy o en adelante).
    NUNCA emitas CITA_CONFIRMADA ni REAGENDAR_CITA con fecha anterior a hoy.
    Si la fecha está mal y no sabes cuál quiso decir, pregunta por la fecha correcta.
```

**Nota:** Como estos nuevos pasos (8, 9, 10) usan `d.fechaHoy`, y esa variable ya está disponible en el scope, funcionan sin cambios adicionales.

---

## Cómo aplicar en n8n UI

1. Editar nodo **AI Agent** → `jsCode`
2. Localizar el bloque `AGENDAMIENTO — MÍNIMO DE PREGUNTAS` (comienza con "Extrae TODO lo que el cliente ya dijo...")
3. Insertar los pasos 8, 9 y 10 DESPUÉS del paso 7 (que termina con `"— NUNCA asumas AM o PM por el contexto del día."`)
4. Guardar workflow

---

## Cómo revertir

Eliminar los pasos 8, 9 y 10 insertados.
