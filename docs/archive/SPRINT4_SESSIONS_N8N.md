# SPRINT 4 — Cancelación/Reagendamiento con sessions
## Cambios en n8n — WhatsApp Bot Genérico

**PREREQUISITO:** La migración SQL del documento anterior debe estar ejecutada antes de hacer cualquier cambio aquí.

**REGLA:** Los cambios son en el workflow `WhatsApp Bot - Genérico` en n8n. No toques `Peluqueria Beta` todavía.

---

## CONTEXTO

El problema actual: cuando el bot muestra la lista de citas y el cliente responde "2", 
el siguiente turno del workflow no sabe qué ID corresponde a la opción 2.

La solución: guardar las citas en `sessions` después de mostrarlas, 
y leerlas al inicio de cada turno para inyectarlas en el system prompt.

---

## CAMBIO 1 — Nodo "Procesar Mensaje"

Este nodo ya existe. Agrégale la lectura de sesiones activas al final del código.

Abre el nodo → reemplaza todo el código con este:

```javascript
// ── FILTRO fromMe ──────────────────────────────────────────
if ($('Webhook').item.json.body.data.key.fromMe === true) {
  return [];
}

// ── DATOS DEL NEGOCIO desde Lookup ─────────────────────────
const negocio = $('Lookup Negocio').item.json;
const businessId        = negocio.id;
const whatsappInstance  = negocio.whatsapp_instance;
const ownerNumber       = negocio.owner_number;
const promptName        = negocio.prompt_name || negocio.name;
const servicesText      = negocio.services_text || '';
const timezone          = negocio.timezone || 'America/Bogota';

let scheduleText;
try {
  scheduleText = JSON.parse(negocio.schedule_text || '{}');
} catch(e) {
  scheduleText = {};
}

// ── RATE LIMIT ─────────────────────────────────────────────
const numero = $('Webhook').item.json.body.data.key.remoteJid;
const ahora = Date.now();
const ventana = 60 * 60 * 1000;
const limite = 50;

const historialRaw = $getWorkflowStaticData('global');
if (!historialRaw.rateLimits) historialRaw.rateLimits = {};
const rateLimitKey = `${businessId}_${numero}`;
const historial = historialRaw.rateLimits[rateLimitKey] || [];
const recientes = historial.filter(t => ahora - t < ventana);

if (recientes.length >= limite) return [];

recientes.push(ahora);
historialRaw.rateLimits[rateLimitKey] = recientes;

// ── FECHA HOY ───────────────────────────────────────────────
const ahoraTZ = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
const dia  = String(ahoraTZ.getDate()).padStart(2, '0');
const mes  = String(ahoraTZ.getMonth() + 1).padStart(2, '0');
const anio = ahoraTZ.getFullYear();
const fechaHoy = `${dia}/${mes}/${anio}`;

// ── CALENDARIO PRÓXIMOS 7 DÍAS ──────────────────────────────
const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const manana = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
manana.setDate(manana.getDate() + 1);
let calendario = `Mañana: ${String(manana.getDate()).padStart(2,'0')}/${String(manana.getMonth()+1).padStart(2,'0')}/${manana.getFullYear()}\n`;
for (let i = 1; i <= 7; i++) {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
  d.setDate(d.getDate() + i);
  calendario += `${diasSemana[d.getDay()]}: ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}\n`;
}

// ── HORARIO TEXTO PARA PROMPT ───────────────────────────────
const toAmPm = h => h < 12 ? `${h === 0 ? 12 : h}:00 AM` : `${h === 12 ? 12 : h-12}:00 PM`;
let horarioTextoPrompt = '';
for (let d = 0; d <= 6; d++) {
  const key = String(d);
  if (scheduleText[key]) {
    const { open, close } = scheduleText[key];
    horarioTextoPrompt += `${diasSemana[d]}: ${toAmPm(open)} - ${toAmPm(close)}\n`;
  } else {
    horarioTextoPrompt += `${diasSemana[d]}: Cerrado\n`;
  }
}

// ── EXTRAER MENSAJE ─────────────────────────────────────────
const mensaje = $('Webhook').item.json.body.data.message?.conversation ||
                $('Webhook').item.json.body.data.message?.extendedTextMessage?.text || '';

// ── VALIDACIÓN DE HORARIO ───────────────────────────────────
function detectarFueraDeHorario(texto, schedule, tzName) {
  const t = (texto || '').toLowerCase()
    .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
    .replace(/[íìï]/g,'i').replace(/[óòö]/g,'o')
    .replace(/[úùü]/g,'u');

  const nombresDiasNorm = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
  let diaIndex = null;
  for (let i = 0; i < nombresDiasNorm.length; i++) {
    if (t.includes(nombresDiasNorm[i])) { diaIndex = i; break; }
  }
  if (diaIndex === null) {
    const mf = t.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (mf) {
      const dFecha = new Date(parseInt(mf[3]), parseInt(mf[2])-1, parseInt(mf[1]));
      diaIndex = dFecha.getDay();
    }
  }
  if (diaIndex === null) {
    const hoyTZ = new Date(new Date().toLocaleString('en-US', { timeZone: tzName }));
    diaIndex = hoyTZ.getDay();
  }

  const config = schedule[String(diaIndex)];
  if (!config) return { fueraDeHorario: true, mensajeHorario: `Lo sentimos, ese día no atendemos. ¿Te puedo agendar en otro día? 😊` };

  const abreH = config.open;
  const cierraH = config.close;
  let hora = null;

  const mHHMM = t.match(/\b(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?/);
  if (mHHMM) {
    let h = parseInt(mHHMM[1]);
    const m = parseInt(mHHMM[2]);
    const suf = (mHHMM[3] || '').replace(/\./g, '');
    if (suf.startsWith('p') && h < 12) h += 12;
    if (suf.startsWith('a') && h === 12) h = 0;
    hora = h + m / 60;
  }
  if (hora === null) { const mPm = t.match(/\b(\d{1,2})\s*p\.?m\.?\b/); if (mPm) { let h = parseInt(mPm[1]); if (h < 12) h += 12; hora = h; } }
  if (hora === null) { const mAm = t.match(/\b(\d{1,2})\s*a\.?m\.?\b/); if (mAm) { let h = parseInt(mAm[1]); if (h === 12) h = 0; hora = h; } }
  if (hora === null) { const mT = t.match(/(?:a las|las)\s+(\d{1,2})(?:\s+de la|\s+en la)?\s+(?:tarde|noche)/); if (mT) { let h = parseInt(mT[1]); if (h < 12) h += 12; hora = h; } }
  if (hora === null) { const mM = t.match(/(?:a las|las)\s+(\d{1,2})(?:\s+de la)?\s+manana/); if (mM) { let h = parseInt(mM[1]); if (h === 12) h = 0; hora = h; } }

  if (hora === null) return { fueraDeHorario: false };
  if (hora >= abreH && hora < cierraH) return { fueraDeHorario: false };

  return {
    fueraDeHorario: true,
    mensajeHorario: `Lo sentimos, esa hora está fuera de nuestro horario. Atendemos de ${toAmPm(abreH)} a ${toAmPm(cierraH)}. ¿Te puedo agendar en otro horario? 😊`
  };
}

const validacion = detectarFueraDeHorario(mensaje, scheduleText, timezone);

if (!mensaje.trim()) return [];

// ── NÚMERO LIMPIO ───────────────────────────────────────────
const numeroLimpio = numero.replace('@s.whatsapp.net', '').replace(/\D/g, '');

return [{
  json: {
    textoOriginal:    mensaje,
    numero:           numero,
    numeroLimpio:     numeroLimpio,
    timestamp:        $('Webhook').item.json.body.data.messageTimestamp,
    procesado:        true,
    fechaHoy:         fechaHoy,
    calendario:       calendario,
    fueraDeHorario:   validacion.fueraDeHorario,
    mensajeHorario:   validacion.mensajeHorario || null,
    businessId:       businessId,
    whatsappInstance: whatsappInstance,
    ownerNumber:      ownerNumber,
    promptName:       promptName,
    servicesText:     servicesText,
    horarioTexto:     horarioTextoPrompt
  }
}];
```

---

## CAMBIO 2 — Nuevo nodo "Leer Sesión Activa"

Agregar DESPUÉS de "Procesar Mensaje" y ANTES de "Leer Slots Disponibles".

**Tipo:** Postgres  
**Nombre:** Leer Sesión Activa  
**Operation:** Execute Query

```sql
SELECT id, accion, citas
FROM sessions
WHERE business_id = {{ $json.businessId }}
  AND numero = '{{ $json.numeroLimpio }}'
  AND expires_at > NOW()
ORDER BY created_at DESC
LIMIT 1
```

Conectar: `Procesar Mensaje` → `Leer Sesión Activa` → `Leer Slots Disponibles`

---

## CAMBIO 3 — Nodo "Formatear Disponibilidad"

Agregar la sesión activa al objeto que pasa al AI Agent.
Reemplaza todo el código con este:

```javascript
const slots = $input.all();
const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const porFecha = {};
for (const item of slots) {
  const fecha = item.json.fecha;
  const slot  = item.json.slot;
  if (!porFecha[fecha]) porFecha[fecha] = [];
  porFecha[fecha].push(slot);
}

let disponibilidad = '';
for (const [fecha, horas] of Object.entries(porFecha)) {
  const d = new Date(fecha + 'T00:00:00');
  const nombreDia = diasSemana[d.getUTCDay()];
  const dia = d.getUTCDate();
  const mes = meses[d.getUTCMonth()];
  disponibilidad += `${nombreDia} ${dia} de ${mes}: ${horas.join(', ')}\n`;
}

// Leer sesión activa si existe
let sesionContexto = '';
try {
  const sesion = $('Leer Sesión Activa').item.json;
  if (sesion && sesion.id) {
    const citas = typeof sesion.citas === 'string' ? JSON.parse(sesion.citas) : sesion.citas;
    if (citas && citas.length > 0) {
      sesionContexto = `\nSESIÓN ACTIVA — El cliente está en proceso de ${sesion.accion} una cita.\nCITAS DISPONIBLES PARA SELECCIÓN:\n`;
      citas.forEach((c, i) => {
        sesionContexto += `Opción ${i+1}: ID_CITA=${c.id} | ${c.servicio} | ${c.fecha} | ${c.hora}\n`;
      });
      sesionContexto += `\nCuando el cliente diga un número (1, 2, etc.), usa el ID_CITA correspondiente para emitir el código de acción.\n`;
    }
  }
} catch(e) {
  sesionContexto = '';
}

const prev = $('Procesar Mensaje').item.json;
return [{
  json: {
    ...prev,
    disponibilidad: disponibilidad || 'Sin disponibilidad en los próximos 7 días',
    sesionContexto
  }
}];
```

---

## CAMBIO 4 — System Prompt del AI Agent

Agregar `{{ $('Formatear Disponibilidad').item.json.sesionContexto }}` al system prompt.

Abre el nodo AI Agent → System Message → añade esto justo ANTES del bloque "AGENDAMIENTO:":

```
{{ $('Formatear Disponibilidad').item.json.sesionContexto }}
```

---

## CAMBIO 5 — Nodo "Formatear Citas" (guardar sesión)

Reemplaza todo el código con este — ahora guarda en `sessions`:

```javascript
const citas = $input.all();
const accion = $('AI Agent').item.json.output.split('|')[1]?.trim();
const numero = $('Procesar Mensaje').item.json.numeroLimpio;
const whatsappInstance = $('Procesar Mensaje').item.json.whatsappInstance;
const businessId = $('Procesar Mensaje').item.json.businessId;

if (citas.length === 0) {
  return [{ json: {
    numero,
    whatsappInstance,
    businessId,
    accion,
    tieneCitas: false,
    mensaje: 'No encontramos citas próximas agendadas a tu número. ¿Puedo ayudarte con algo más? 😊',
    citasIds: []
  }}];
}

const diasSemana = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

let listaCitas = '';
const citasParaSession = [];

citas.forEach((item, i) => {
  const c = item.json;
  const d = new Date(c.fecha + 'T00:00:00');
  const fechaNatural = `${diasSemana[d.getUTCDay()]} ${d.getUTCDate()} de ${meses[d.getUTCMonth()]}`;
  const hora = c.hora.substring(0,5);
  listaCitas += `${i+1}. ${c.servicio} — ${fechaNatural} a las ${hora}\n`;
  citasParaSession.push({ id: c.id, servicio: c.servicio, fecha: c.fecha, hora: hora });
});

const verbo = accion === 'cancelar' ? 'cancelar' : 'reagendar';
const mensaje = citas.length === 1
  ? `Encontré esta cita:\n\n${listaCitas}\n¿Confirmas que deseas ${verbo}? Responde *sí* para confirmar. 😊`
  : `Encontré estas citas próximas:\n\n${listaCitas}\n¿Cuál deseas ${verbo}? Responde con el número (1, 2, etc.) 😊`;

return [{ json: {
  numero,
  whatsappInstance,
  businessId,
  accion,
  tieneCitas: true,
  mensaje,
  citasIds: citasParaSession,
  citasJSON: JSON.stringify(citasParaSession)
}}];
```

---

## CAMBIO 6 — Nuevo nodo "Guardar Sesión"

Agregar DESPUÉS de "Formatear Citas" y ANTES de "Enviar Lista de citas".

**Tipo:** Postgres  
**Nombre:** Guardar Sesión  
**Operation:** Execute Query

```sql
-- Borrar sesión anterior si existe y crear nueva
DELETE FROM sessions
WHERE business_id = {{ $json.businessId }}
  AND numero = '{{ $json.numero }}';

INSERT INTO sessions (business_id, numero, accion, citas)
VALUES (
  {{ $json.businessId }},
  '{{ $json.numero }}',
  '{{ $json.accion }}',
  '{{ $json.citasJSON }}'::jsonb
);
```

Conectar: `Formatear Citas` → `Guardar Sesión` → `Enviar Lista de citas`

---

## CAMBIO 7 — Nuevo nodo "Limpiar Sesión" tras cancelación

Agregar DESPUÉS de "Confirmar Cancelación".

**Tipo:** Postgres  
**Nombre:** Limpiar Sesión Cancelación  
**Operation:** Execute Query

```sql
DELETE FROM sessions
WHERE business_id = {{ $('Procesar Mensaje').item.json.businessId }}
  AND numero = '{{ $('Procesar Mensaje').item.json.numeroLimpio }}';
```

---

## CAMBIO 8 — Nuevo nodo "Limpiar Sesión" tras reagendamiento

Agregar DESPUÉS de "Confirmar Reagendamiento".

**Tipo:** Postgres  
**Nombre:** Limpiar Sesión Reagendamiento  
**Operation:** Execute Query

```sql
DELETE FROM sessions
WHERE business_id = {{ $('Procesar Mensaje').item.json.businessId }}
  AND numero = '{{ $('Procesar Mensaje').item.json.numeroLimpio }}';
```

---

## FLUJO FINAL

```
Webhook → Filtro → Lookup Negocio → ¿Negocio Existe?
  → Procesar Mensaje → Leer Sesión Activa → Leer Slots Disponibles
  → Formatear Disponibilidad → AI Agent → Wait → Switch
      ├── Confirmar Cita → Leer Disponibilidad → Verificar Slot → ¿Disponible?
      │     ├── true → Insertar Cita → Construir Mensajes → Notificar Dueño → Confirmar Cliente
      │     └── false → Aviso Slot Ocupado
      ├── Gestionar Cita → Leer Citas Cliente → Formatear Citas → Guardar Sesión → Enviar Lista
      ├── Cancelar Cita → Ejecutar Cancelación → Confirmar Cancelación → Limpiar Sesión
      ├── Reagendar Cita → Ejecutar Reagendamiento → Confirmar Reagendamiento → Limpiar Sesión
      └── Fallback → ¿Confirmar o Responder? → Respuesta Normal
```

---

## VERIFICACIÓN

Después de hacer todos los cambios, prueba este flujo completo:

1. Manda `quiero cancelar mi cita`
2. El bot muestra lista de citas
3. Verifica en PostgreSQL que se guardó la sesión:
```sql
SELECT * FROM sessions;
```
4. Responde `2`
5. Verifica que el bot emitió `CANCELAR_CITA|ID` y ejecutó el UPDATE
6. Verifica que la sesión se borró:
```sql
SELECT * FROM sessions;
-- Debe estar vacía
```
