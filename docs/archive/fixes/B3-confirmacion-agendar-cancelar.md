# B3 — Confirmación obligatoria antes de agendar y cancelar

> Arregla: el bot agenda o cancela sin mostrar resumen ni pedir confirmación.
> Aplica en: n8n workflow `WhatsApp Bot - Genérico`, nodo `AI Agent` → `jsCode`.
> **Estado: ✅ Aplicado en n8n UI y JSON local (2026-07-20)**

---

## Diagnóstico

**Causa raíz:** El LLM se salta el paso de confirmación cuando:
- La conversación ya tiene historial (ej: ya agendó una cita antes en el mismo chat)
- El LLM "asume" que los datos están correctos porque ya los pidió antes
- El flujo de cancelación tampoco pide confirmación: con solo decir "1" ya cancela

**Ejemplo del bug:**
```
Cliente: Quiero un peinado mañana a las 3pm
Bot: CITA_CONFIRMADA|Peinado|21/07/2026|15:00|Juliana
# Saltó el resumen y la pregunta "¿Confirmamos?"
```

---

## Cambio único: nodo `AI Agent` → `jsCode`

### Sección a modificar: PASOS 5 y 6 de AGENDAMIENTO

**Texto actual en el jsCode:**
```
5. CONFIRMAR — Solo cuando tengas servicio + profesional + fecha + hora:
   → Muestra resumen y pide confirmación:
"Perfecto, te confirmo los datos:
✂️ Servicio: [servicio]
👤 Profesional: [nombre]
📅 Fecha: [fecha en lenguaje natural]
⏰ Hora: [hora AM/PM]
¿Confirmamos la cita? 😊
CRÍTICO — HORA EXACTA: "en la tarde", "en la mañana", "más tarde" NO son horas válidas. Muestra el listado y pide que elija una hora exacta.
NUNCA confirmes una hora sin saber si es AM o PM.

Cuando el cliente diga una hora sin AM/PM (ej: '3', '6', '9', '1:30', '2:00', '10:15'):
- Pregunta siempre: '¿Las [hora] AM o [hora] PM? 😊'
- Ejemplo: si dice "1:30" → preguntas "¿La 1:30 AM o la 1:30 PM? 😊"
- Si solo existe en uno de los dos → confírmala directamente.
NUNCA asumas AM o PM por el contexto del día.

6. CUANDO EL CLIENTE CONFIRMA — Solo cuando el cliente responda "sí", "si", "ok", "dale", "confirmo", "confirma", "listo", "dale", "si, confirma" o similar a la pregunta de confirmación del paso 5:
   → Identifica servicio exacto, fecha DD/MM/YYYY y hora (con AM/PM)
   → Responde ÚNICAMENTE con el código exacto: CITA_CONFIRMADA|[servicio]|[DD/MM/YYYY]|[HH:MM AM/PM]|[nombre profesional]
   → SIN texto adicional. SIN emojis. SIN decoración. SIN saludo.
   → Ejemplo exacto: CITA_CONFIRMADA|Corte caballero|14/07/2026|10:00 AM|Cristian
   → Si el negocio tiene profesionales, incluye SIEMPRE el nombre del profesional como 5to campo
   → El pipeline downstream se encarga del resto (notificar, guardar, etc.)
```

**Texto nuevo (reemplazar TODO el bloque anterior):**
```
5. CONFIRMAR — OBLIGATORIO. NUNCA LO SALTES.
   Antes de emitir CITA_CONFIRMADA, SIEMPRE debes:
   a) Mostrar resumen COMPLETO con servicio + profesional + fecha en lenguaje natural + hora AM/PM
   b) PREGUNTAR explícitamente "¿Confirmamos la cita?"
   
   Esto aplica SIEMPRE, incluso si el cliente ya agendó otra cita antes en la misma conversación.
   CADA cita necesita su PROPIA confirmación. No importa que ya hayan agendado una antes.

   Formato EXACTO del resumen:
"Perfecto, te confirmo los datos:
✂️ Servicio: [servicio]
👤 Profesional: [nombre]
📅 Fecha: [fecha en lenguaje natural]
⏰ Hora: [hora AM/PM]
¿Confirmamos la cita? 😊"

   CRÍTICO — HORA EXACTA: "en la tarde", "en la mañana", "más tarde" NO son horas válidas. Muestra el listado y pide que elija una hora exacta.
   NUNCA confirmes una hora sin saber si es AM o PM.

   Cuando el cliente diga una hora sin AM/PM (ej: '3', '6', '9', '1:30', '2:00', '10:15'):
   - Pregunta siempre: '¿Las [hora] AM o [hora] PM? 😊'
   - Ejemplo: si dice "1:30" → preguntas "¿La 1:30 AM o la 1:30 PM? 😊"
   - Si solo existe en uno de los dos → confírmala directamente.
   NUNCA asumas AM o PM por el contexto del día.

6. CUANDO EL CLIENTE CONFIRMA — Solo cuando el cliente responda "sí", "si", "ok", "dale", "confirmo", "confirma", "listo", "dale", "si, confirma" o similar a la pregunta de confirmación del paso 5:
   → Identifica servicio exacto, fecha DD/MM/YYYY y hora (con AM/PM)
   → Responde ÚNICAMENTE con el código exacto: CITA_CONFIRMADA|[servicio]|[DD/MM/YYYY]|[HH:MM AM/PM]|[nombre profesional]
   → SIN texto adicional. SIN emojis. SIN decoración. SIN saludo.
   → Ejemplo exacto: CITA_CONFIRMADA|Corte caballero|14/07/2026|10:00 AM|Cristian
   → Si el negocio tiene profesionales, incluye SIEMPRE el nombre del profesional como 5to campo
   → El pipeline downstream se encarga del resto (notificar, guardar, etc.)

⚠️ REGLA ABSOLUTA — NUNCA EMITAS CITA_CONFIRMADA sin haber mostrado el resumen del paso 5 y recibido confirmación explícita del cliente. Si el cliente responde con datos que completan la cita pero sin que hayas mostrado el resumen, PRIMERO muestra el resumen y pregunta, aunque el cliente ya haya dado todos los datos. NO IMPORTA si el cliente dijo "sí" o "confirmo" antes del resumen — el resumen debe ir PRIMERO.
```

### Sección a modificar 2: CANCELACIÓN — agregar confirmación

**Texto actual en el jsCode (sección CANCELAR):**
```
═══ SI LA ACCIÓN ES CANCELAR ═══
→ Responde ÚNICAMENTE: CANCELAR_CITA|ID_CITA (el ID de la opción elegida)
→ SIN texto adicional. SIN preguntar nada más. SIN ofrecer reagendar.
→ El número es suficiente confirmación. NUNCA pidas confirmación extra.

TAMBIÉN cuando hay una sola cita en la sesión y el cliente dice "sí", "si", "1", "ok", "dale", "listo", "claro", "obvio", "confirmo", "de una", "hagale", "va", "le doy":
→ CANCELAR_CITA|ID_CITA
```

**Texto nuevo:**
```
═══ SI LA ACCIÓN ES CANCELAR ═══
PRIMERO — Cuando el cliente elige una cita (dice un número, o "sí" si es una sola):
   → Muestra resumen de la cancelación con los datos de la cita:
"¿Confirmas que deseas cancelar esta cita?
📅 Fecha: [fecha en lenguaje natural]
⏰ Hora: [hora AM/PM]
✂️ Servicio: [servicio]
👤 Profesional: [nombre del profesional, si aplica]
Responde 'sí' para confirmar la cancelación o 'no' para mantenerla."

SOLO después — Cuando el cliente responde "sí", "si", "ok", "confirmo", "dale", "listo" o similar:
→ Responde ÚNICAMENTE: CANCELAR_CITA|ID_CITA
→ SIN texto adicional.

Si el cliente dice "no" o cualquier negación → no canceles. Responde: "Entendido, no se cancela. ¿Necesitas algo más? 😊"
```

---

## Cómo aplicar en n8n UI

1. Ir a n8n → Workflow `WhatsApp Bot - Genérico`
2. Editar nodo **AI Agent**
3. En el campo `jsCode`, buscar y reemplazar las dos secciones:
   - Sección 1: Los pasos 5 y 6 de AGENDAMIENTO (desde `5. CONFIRMAR` hasta `→ El pipeline downstream...`)
   - Sección 2: La sección de CANCELAR (desde `═══ SI LA ACCIÓN ES CANCELAR ═══` hasta el final de esa subsección)
4. Guardar workflow
5. Probar dos escenarios:
   - Agendar cita normal: debe mostrar resumen y esperar confirmación
   - Agendar segunda cita en mismo chat: también debe mostrar resumen
   - Cancelar: debe pedir confirmación extra antes de cancelar

---

## Cómo revertir

Volver al texto original de las dos secciones (documentado arriba).
