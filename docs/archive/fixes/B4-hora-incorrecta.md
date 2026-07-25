# B4 — Hora incorrecta en agendamiento

> Arregla: el bot agenda con hora distinta a la que pidió el cliente (ej: pidió 6pm, agendó 11:00).
> Aplica en: n8n workflow `WhatsApp Bot - Genérico`, nodo `AI Agent` → `jsCode`.
> **Estado: ✅ Prompt aplicado en n8n UI y JSON local. ⬜ Verificar Slot pendiente (2026-07-20)**

---

## Diagnóstico

**Causa raíz:** El LLM genera `CITA_CONFIRMADA|servicio|fecha|HH:MM AM/PM|profesional` con una hora que NO coincide con lo que el cliente pidió. Esto ocurre porque:

- El LLM a veces formatea mal la hora (ej: "6pm" → "6:00" sin AM/PM, y el parse downstream lo interpreta mal)
- El LLM puede generar una hora de la lista de disponibilidad en vez de la hora que el cliente dijo
- No había validación de que la hora en `CITA_CONFIRMADA` coincida con lo que el cliente pidió

**Nota:** B3 (confirmación) ya reduce este bug porque el cliente verá la hora en el resumen y podrá corregirla. Este fix es la segunda capa de defensa.

---

## Cambio único: nodo `AI Agent` → `jsCode`

### Sección a modificar: paso 6 (CUANDO EL CLIENTE CONFIRMA)

**Agregar AL FINAL del paso 6, después de `→ El pipeline downstream se encarga del resto:`:**

```
⚠️ VALIDACIÓN DE HORA — CRÍTICO:
Antes de emitir CITA_CONFIRMADA, verifica que la hora en el código sea EXACTAMENTE la misma
que aparece en el resumen del paso 5. Si no coinciden, CORRIGE la hora en CITA_CONFIRMADA.

REGLAS DE FORMATEO DE HORA:
- "6pm" → "6:00 PM"
- "6:00pm" → "6:00 PM"
- "6 p.m." → "6:00 PM"
- "18:00" → "6:00 PM"
- "6:00" (sin AM/PM pero cliente dijo "6pm") → "6:00 PM"
- "11:00" (si el cliente dijo 6pm) → INCORRECTO. Debe ser "6:00 PM"

NUNCA pongas una hora diferente a la que el cliente aceptó en el resumen.
La hora en CITA_CONFIRMADA debe ser IDÉNTICA a la hora del resumen.
```

---

## Cambio en n8n (validación extra): nodo `Verificar Slot`

**Agregar** al final del Code node `Verificar Slot` (después de `professionalName`), una validación extra:

```javascript
// ── VALIDACIÓN DE HORA ──────────────────────────────────────
const horaRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
const horaMatch = (horaDeseada || '').match(horaRegex);
if (!horaMatch) {
  return []; // hora inválida → no procesar
}
let hora24 = parseInt(horaMatch[1], 10);
const minutos = horaMatch[2];
const ampm = horaMatch[3].toUpperCase();
if (ampm === 'PM' && hora24 !== 12) hora24 += 12;
if (ampm === 'AM' && hora24 === 12) hora24 = 0;
const horaNormalizada = `${String(hora24).padStart(2, '0')}:${minutos}`;
// ────────────────────────────────────────────────────────────
```

**Insertar** este bloque después de `const professionalName = (partes[4] || '').trim();` y AGREGAR `horaNormalizada` al output:

```javascript
return [{ json: {
  disponible:        total == 0,
  fechaDeseada:      partes[2]?.trim(),
  horaDeseada:       partes[3]?.split('\n')[0].trim(),
  horaNormalizada,  // ← NUEVO: hora en formato 24h HH:MM
  numero,
  businessId:        $('Procesar Mensaje').item.json.businessId,
  whatsappInstance:  $('Procesar Mensaje').item.json.whatsappInstance,
  professionalName,
  ownerNumber:       $('Procesar Mensaje').item.json.ownerNumber
} }];
```

Esto no cambia el comportamiento actual, pero permite que logs futuros puedan comparar la hora normalizada vs la hora solicitada.

---

## Cómo aplicar en n8n UI

1. Editar nodo **AI Agent** → en `jsCode`, agregar el bloque `VALIDACIÓN DE HORA` al final del paso 6

2. Editar nodo **Verificar Slot** → en `jsCode`, agregar la validación de hora y pasar `horaNormalizada` en el output

3. Guardar workflow

---

## Cómo revertir

Quitar el bloque agregado del paso 6 y revertir Verificar Slot a su código original.
