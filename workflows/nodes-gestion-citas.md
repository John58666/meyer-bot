# Nodos: Gestión de Citas (Cancelación y Reagendamiento)

Agregar estos nodos en n8n UI después del nodo `¿CITA_CONFIRMADA?`,
en la rama donde el output contenga `GESTIONAR_CITA`.

---

## Estructura de conexiones

```
AI Agent
  └─ ¿CITA_CONFIRMADA? (Switch/IF)
        ├─ contiene CITA_CONFIRMADA   → [flujo existente de guardar cita]
        ├─ contiene GESTIONAR_CITA    → [B2] Leer Citas del Cliente
        ├─ contiene CANCELAR_CITA     → [B6] Ejecutar Cancelación
        └─ contiene REAGENDAR_CITA    → [B7] Ejecutar Reagendamiento

[B2] Leer Citas del Cliente
  └─ [B3] Code — Formatear Citas
        └─ [B4] Enviar Lista de Citas
```

---

## B2 — Nodo Postgres: Leer Citas del Cliente

**Tipo:** Postgres  
**Operación:** Execute Query

```sql
SELECT id, fecha::text, hora::text, servicio, estado
FROM appointments
WHERE numero = '{{ $('Procesar Mensaje').item.json.numero.replace('@s.whatsapp.net','') }}'
  AND business_id = {{ $('Procesar Mensaje').item.json.businessId }}
  AND fecha >= (NOW() AT TIME ZONE 'America/Bogota')::date
  AND estado IN ('Pendiente', 'Confirmada')
ORDER BY fecha ASC, hora ASC
```

---

## B3 — Nodo Code: Formatear Citas para Respuesta

**Tipo:** Code (JavaScript)

```javascript
const citas = $input.all();
const accion = $('AI Agent').item.json.output.split('|')[1]?.trim();
const numero = ($('Procesar Mensaje').item.json.numero || '').replace('@s.whatsapp.net','').replace(/\D/g,'');
const whatsappInstance = $('Procesar Mensaje').item.json.whatsappInstance;

if (citas.length === 0) {
  return [{ json: {
    numero,
    whatsappInstance,
    accion,
    tieneCitas: false,
    mensaje: 'No encontramos citas próximas agendadas a tu número. ¿Puedo ayudarte con algo más? 😊',
    citasIds: []
  }}];
}

const diasSemana = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

let listaCitas = '';
citas.forEach((item, i) => {
  const c = item.json;
  const d = new Date(c.fecha + 'T00:00:00');
  const fechaNatural = `${diasSemana[d.getUTCDay()]} ${d.getUTCDate()} de ${meses[d.getUTCMonth()]}`;
  const hora = c.hora.substring(0,5);
  listaCitas += `${i+1}. ${c.servicio} — ${fechaNatural} a las ${hora}\n`;
});

const verbo = accion === 'cancelar' ? 'cancelar' : 'reagendar';
const mensaje = citas.length === 1
  ? `Encontré esta cita:\n\n${listaCitas}\n¿Confirmas que deseas ${verbo} esta cita? Responde *sí* para confirmar. 😊`
  : `Encontré estas citas próximas:\n\n${listaCitas}\n¿Cuál deseas ${verbo}? Responde con el número (1, 2, etc.) 😊`;

return [{ json: {
  numero,
  whatsappInstance,
  accion,
  tieneCitas: true,
  mensaje,
  citasIds: citas.map(c => ({ id: c.json.id, fecha: c.json.fecha, hora: c.json.hora, servicio: c.json.servicio }))
}}];
```

---

## B4 — Nodo HTTP Request: Enviar Lista de Citas

**Tipo:** HTTP Request  
**Método:** POST  
**URL:** `{{ $env.EVOLUTION_API_URL }}/message/sendText/{{ $json.whatsappInstance }}`

**Body (JSON):**
```json
{
  "number": "{{ $json.numero }}",
  "text": "{{ $json.mensaje }}"
}
```

**Headers:**
- `apikey`: `{{ $env.EVOLUTION_API_KEY }}`
- `Content-Type`: `application/json`

---

## B6 — Nodo Postgres: Ejecutar Cancelación

**Condición de entrada:** output del AI Agent contiene `CANCELAR_CITA`

```sql
UPDATE appointments
SET estado = 'Cancelada', updated_at = NOW()
WHERE id = {{ $('AI Agent').item.json.output.split('|')[1] }}
  AND business_id = {{ $('Procesar Mensaje').item.json.businessId }}
  AND estado IN ('Pendiente', 'Confirmada')
RETURNING id, fecha::text, hora::text, servicio, estado
```

**Después del UPDATE — HTTP Request de confirmación:**

```
"✅ Tu cita de {{ $json.servicio }} del {{ $json.fecha }} a las {{ $json.hora.substring(0,5) }} ha sido cancelada. ¡Cuando quieras volver a agendar, aquí estamos! 😊"
```

---

## B7 — Nodo Postgres: Ejecutar Reagendamiento

**Condición de entrada:** output del AI Agent contiene `REAGENDAR_CITA`

```sql
UPDATE appointments
SET fecha = TO_DATE('{{ $('AI Agent').item.json.output.split('|')[2] }}', 'DD/MM/YYYY'),
    hora  = '{{ $('AI Agent').item.json.output.split('|')[3].split('\n')[0].trim() }}'::time,
    estado = 'Pendiente',
    updated_at = NOW()
WHERE id = {{ $('AI Agent').item.json.output.split('|')[1] }}
  AND business_id = {{ $('Procesar Mensaje').item.json.businessId }}
  AND estado IN ('Pendiente', 'Confirmada')
RETURNING id, fecha::text, hora::text, servicio, estado
```

**Después del UPDATE — HTTP Request de confirmación:**

```
"✅ ¡Listo! Tu cita de {{ $json.servicio }} quedó reagendada para el {{ $json.fecha }} a las {{ $json.hora.substring(0,5) }}. ¡Te esperamos! 😊"
```

---

## Nota sobre Simple Memory

La selección del cliente ("quiero cancelar la 1") llega en el siguiente mensaje.
El Simple Memory ya guarda los últimos 10 mensajes — el AI Agent tiene contexto
de qué citas mostró y puede extraer el ID correcto. No se necesita nodo adicional.
