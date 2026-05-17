# Arquitectura del Workflow Principal — Peluquería Meyer

> **Archivo workflow**: `workflows/peluqueria-beta.json`  
> **Estado**: Activo en producción beta  
> **Última actualización**: Mayo 17, 2026

---

## Resumen Ejecutivo

El workflow principal orquesta toda la conversación de WhatsApp con IA para Peluquería Meyer. Consta de **19 nodos** organizados en 4 fases: recepción, conversación IA, validación de disponibilidad, y persistencia con notificaciones.

**Características clave:**
- ✅ Verificación de disponibilidad en tiempo real (anti-colisión)
- ✅ Rate limit: 50 mensajes/hora por usuario
- ✅ Memoria conversacional: 10 mensajes por usuario
- ✅ Validación de horario de negocio
- ✅ Notificaciones automáticas al dueño y cliente

---

## Diagrama de Flujo Completo

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FASE 1: RECEPCIÓN Y FILTRADO                     │
└──────────────────────────────────────────────────────────────────────────┘

    [Evolution API]
          │
          ▼
    ┌──────────┐
    │ Webhook  │  ← POST desde Evolution API
    └─────┬────┘
          │
          ▼
    ┌──────────┐
    │    If    │  ← Filtra grupos (@g.us) y mensajes vacíos
    └─────┬────┘
          │ (SI pasa filtro)
          ▼
    ┌─────────────────────┐
    │ Code in JavaScript  │  ← Rate limit (50 msg/hr) + extrae datos
    └─────────┬───────────┘      + calcula fechas (Bogotá timezone)
              │

┌──────────────────────────────────────────────────────────────────────────┐
│                      FASE 2: CONVERSACIÓN CON IA                         │
└──────────────────────────────────────────────────────────────────────────┘

              ▼
    ┌──────────────────┐
    │    AI Agent      │ ◄─── [Groq Chat Model] (llama-3.3-70b)
    └─────────┬────────┘      │
              │               └─── [Simple Memory] (10 msgs/usuario)
              │
              ▼
    ┌──────────────────┐
    │      Wait        │  ← Espera 3 segundos
    └─────────┬────────┘
              │

┌──────────────────────────────────────────────────────────────────────────┐
│               FASE 3: VALIDACIÓN Y VERIFICACIÓN DE SLOT                  │
└──────────────────────────────────────────────────────────────────────────┘

              ▼
    ┌──────────────────┐
    │       If1        │  ← ¿Output contiene "CITA_CONFIRMADA"?
    └─────┬────────┬───┘
          │        │
    (SI)  │        │ (NO)
          │        │
          │        └─────────────────┐
          │                          │
          ▼                          ▼
    ┌──────────────────┐      ┌──────────┐
    │ Leer              │      │   If2    │  ← Respuesta normal
    │ Disponibilidad    │      └─────┬────┘
    └─────────┬─────────┘            │
              │                      ▼
              ▼                ┌──────────────┐
    ┌──────────────────┐      │ HTTP Request │ → Envía respuesta
    │  Verificar Slot  │      └──────────────┘    al cliente
    └─────────┬────────┘
              │
              ▼
    ┌──────────────────┐
    │  ¿Disponible?    │  ← Compara fecha/hora vs. ocupadas
    └─────┬────────┬───┘
          │        │
    (SI)  │        │ (NO)
          │        │
          │        └───────────────────┐
          │                            │
          ▼                            ▼
                              ┌──────────────────┐
                              │ Aviso Slot       │ → Informa que horario
                              │ Ocupado          │   está reservado
                              └──────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│              FASE 4: PERSISTENCIA Y NOTIFICACIONES                       │
└──────────────────────────────────────────────────────────────────────────┘

          │
          ▼
    ┌──────────────────────┐
    │ Append row in sheet  │  ← Guarda cita en Google Sheets
    └─────────┬────────────┘
              │
              ▼
    ┌────────────────────────┐
    │ Code in JavaScript1    │  ← Construye mensajes para dueño y cliente
    └─────────┬──────────────┘
              │
              ▼
    ┌────────────────────────┐
    │ Code in JavaScript2    │  ⚠️ DESHABILITADO - Código Google Calendar
    └─────────┬──────────────┘     (hardcoded, no se ejecuta actualmente)
              │
              ▼
    ┌────────────────────────┐
    │   HTTP Request1        │  → Envía notificación al dueño (WhatsApp)
    └─────────┬──────────────┘
              │
              ▼
    ┌────────────────────────┐
    │   HTTP Request2        │  → Envía confirmación al cliente (WhatsApp)
    └────────────────────────┘
```

---

## Descripción Detallada de Nodos

### FASE 1: RECEPCIÓN Y FILTRADO

#### 1. Webhook
- **Tipo**: `n8n-nodes-base.webhook`
- **Función**: Recibe POST requests de Evolution API
- **Path**: `/whatsapp-meyer`
- **Método**: POST
- **Trigger**: Cada mensaje de WhatsApp recibido

#### 2. If (Filtro de entrada)
- **Tipo**: `n8n-nodes-base.if`
- **Función**: Filtra mensajes no válidos
- **Condiciones**:
  - `remoteJid` NO contiene `@g.us` (rechaza grupos)
  - Mensaje NO está vacío
- **Combinator**: AND (ambas condiciones deben cumplirse)

#### 3. Code in JavaScript (Preprocesamiento)
- **Tipo**: `n8n-nodes-base.code`
- **Funciones**:
  1. **Filtro fromMe**: Rechaza mensajes enviados por el bot mismo
  2. **Rate Limit**: Máximo 50 mensajes por número por hora
     - Usa `$getWorkflowStaticData('global')` para persistir contadores
     - Ventana deslizante de 60 minutos
  3. **Extracción de datos**:
     - Número del remitente
     - Texto del mensaje
     - Nombre del contacto
  4. **Cálculo de fechas** (timezone Bogotá):
     - Fecha de hoy: `DD/MM/YYYY`
     - Fecha de mañana: `DD/MM/YYYY`
     - Calendario próximos 7 días con día de semana
  5. **Validación de horario**:
     - Lunes-Sábado: 9AM-7PM
     - Domingos: 10AM-5PM
     - Fuera de horario: `fueraDeHorario = true`

**Output**: Objeto con `numero`, `textoOriginal`, `fechaHoy`, `mañanaStr`, `calendario`, `fueraDeHorario`, `mensajeHorario`

---

### FASE 2: CONVERSACIÓN CON IA

#### 4. AI Agent
- **Tipo**: `@n8n/n8n-nodes-langchain.agent`
- **Función**: Orquesta la conversación con Groq
- **Input**: `{{ $('Code in JavaScript').item.json.textoOriginal }}`
- **System Message**: Prompt completo de Peluquería Meyer (ver `prompts/meyer-system-prompt.md`)
- **Conexiones**:
  - Model: Groq Chat Model
  - Memory: Simple Memory (10 mensajes)

**Lógica del System Prompt:**
- Servicios y precios de Meyer
- Horarios de atención
- Validación de horario (usa variable `fueraDeHorario`)
- **Orden obligatorio para agendar**:
  1. Preguntar servicio (si no lo tiene)
  2. Preguntar fecha (si no la tiene)
  3. Preguntar hora EXACTA (si no la tiene)
  4. Mostrar resumen y pedir confirmación
  5. Al confirmar → responder: `CITA_CONFIRMADA|servicio|DD/MM/YYYY|HH:MM`

**Reglas críticas**:
- NUNCA inferir el servicio del contexto
- NUNCA aceptar "en la tarde" como hora válida (exigir hora exacta)
- NUNCA confirmar sin tener los 3 datos explícitos
- Si fuera de horario → responder ÚNICAMENTE con `mensajeHorario`

#### 5. Groq Chat Model
- **Tipo**: `@n8n/n8n-nodes-langchain.lmChatGroq`
- **Modelo**: `llama-3.3-70b-versatile`
- **Credential**: ID configurada en n8n

#### 6. Simple Memory
- **Tipo**: `@n8n/n8n-nodes-langchain.memoryBufferWindow`
- **Session Key**: `{{ $('Code in JavaScript').item.json.numero }}_v3`
- **Context Window**: 10 mensajes
- **Persistencia**: En memoria de n8n por usuario

#### 7. Wait
- **Tipo**: `n8n-nodes-base.wait`
- **Duración**: 3 segundos
- **Función**: Simula "typing" y evita respuestas instantáneas

---

### FASE 3: VALIDACIÓN Y VERIFICACIÓN DE SLOT

#### 8. If1 (Detector de confirmación)
- **Tipo**: `n8n-nodes-base.if`
- **Condición**: `{{ $('AI Agent').item.json.output }}` contiene `"CITA_CONFIRMADA"`
- **SI**: Procede a verificar disponibilidad
- **NO**: Va a If2 (respuesta conversacional normal)

#### 9. Leer Disponibilidad
- **Tipo**: `n8n-nodes-base.googleSheets`
- **Operación**: `getRows`
- **Sheet**: "CItas Peluqueria" / "Datos clientes"
- **Función**: Lee TODAS las citas existentes
- **Credential**: Google Service Account (ID `BMX8jHVHhVXSfDZ4`)
- **Output**: Array de todas las filas con: Fecha, Hora, Nombre, Servicio, Número, Estado, EventID

#### 10. Verificar Slot
- **Tipo**: `n8n-nodes-base.code`
- **Función**: Compara la cita solicitada con las existentes
- **Lógica**:
  1. Extrae `fechaDeseada` y `horaDeseada` del output de AI Agent
     - Formato: `CITA_CONFIRMADA|servicio|DD/MM/YYYY|HH:MM`
  2. Itera sobre todas las filas del Sheet
  3. Ignora filas con Estado "cancelada" o vacías
  4. Si encuentra coincidencia exacta de fecha+hora → `ocupado = true`
- **Output**: `{ disponible: boolean, fechaDeseada, horaDeseada, numero }`

#### 11. ¿Disponible? (Decisión final)
- **Tipo**: `n8n-nodes-base.if`
- **Condición**: `{{ $json.disponible }}` es `true`
- **SI**: Procede a guardar la cita (nodo 12)
- **NO**: Avisa que el horario está ocupado (nodo 19)

#### 19. Aviso Slot Ocupado
- **Tipo**: `n8n-nodes-base.httpRequest`
- **URL**: `http://178.104.27.180:8080/message/sendText/peluqueria-beta`
- **Mensaje**: "Lo sentimos, ese horario ya está reservado. ¿Te gustaría elegir otra hora? 😊"
- ⚠️ **API Key hardcodeada**: `988D01BD-F7B9-4B4E-9834-575D73A966A9`

---

### FASE 4: PERSISTENCIA Y NOTIFICACIONES

#### 12. Append row in sheet
- **Tipo**: `n8n-nodes-base.googleSheets`
- **Operación**: `append`
- **Sheet**: "CItas Peluqueria" / "Datos clientes"
- **Función**: Guarda la nueva cita
- **Mapping de columnas**:
  - `Fecha`: `{{ $('AI Agent').item.json.output.split('|')[2] }}`
  - `Hora`: `{{ $('AI Agent').item.json.output.split('|')[3] }}`
  - `Nombre`: `{{ $('Webhook').item.json.body.data.pushName }}`
  - `Servicio`: `{{ $('AI Agent').item.json.output.split('|')[1] }}`
  - `Número`: `{{ $('Code in JavaScript').item.json.numero }}`
  - `Estado`: `"Pendiente"`

#### 13. Code in JavaScript1 (Preparar mensajes)
- **Tipo**: `n8n-nodes-base.code`
- **Función**: Construye los mensajes de notificación
- **Output**:
  - `numeroDueno`: Número del dueño (desde variables)
  - `numeroCliente`: Número del cliente
  - `nombreCliente`: Nombre del cliente
  - `servicio`, `fecha`, `hora`: Datos de la cita
  - `textoDueno`: Mensaje formateado para el dueño
    ```
    🔔 *Nueva cita agendada*
    
    👤 *Cliente:* [nombre]
    📞 *Número:* [numero]
    ✂️ *Servicio:* [servicio]
    📅 *Fecha:* [fecha]
    ⏰ *Hora:* [hora]
    
    _Estado: Pendiente_ ✅
    ```
  - `textoCliente`: Confirmación para el cliente
    ```
    ✅ ¡Tu cita quedó confirmada!
    
    ✂️ *Servicio:* [servicio]
    📅 *Fecha:* [fecha]
    ⏰ *Hora:* [hora]
    
    ¡Te esperamos en Peluquería Meyer! 💇‍♂️
    Cualquier cambio, escríbenos aquí mismo 😊
    ```
  - `bodyDueno`, `bodyCliente`: JSON stringificado para HTTP requests

#### 14. Code in JavaScript2 (Google Calendar) ⚠️ DESHABILITADO
- **Tipo**: `n8n-nodes-base.code`
- **Estado**: Presente pero NO conectado al flujo
- **Función original**: Crear evento en Google Calendar
- **Problemas**:
  - ⚠️ Private key hardcodeada en el código
  - ⚠️ Calendar ID hardcodeado
  - ⚠️ Service Account email hardcodeado
- **Razón de deshabilitación**: Limpieza de credenciales antes de migrar a credentials de n8n
- **TODO**: Eliminar código o migrar a credentials nativas

#### 15. HTTP Request1 (Notificar dueño)
- **Tipo**: `n8n-nodes-base.httpRequest`
- **Método**: POST
- **URL**: `http://178.104.27.180:8080/message/sendText/peluqueria-beta`
- **Authentication**: HTTP Header Auth
- **Body**: `{{ $('Code in JavaScript1').item.json.bodyDueno }}`
- **Credential**: Header Auth (ID `7zNGL0U3zg4LEZZS`)

#### 16. HTTP Request2 (Confirmar cliente)
- **Tipo**: `n8n-nodes-base.httpRequest`
- **Método**: POST
- **URL**: `http://178.104.27.180:8080/message/sendText/peluqueria-beta`
- **Authentication**: HTTP Header Auth
- **Body**: `{{ $('Code in JavaScript1').item.json.bodyCliente }}`
- **Credential**: Header Auth (ID `eCohHiQfHWlNdh0P`)

---

### RAMA ALTERNATIVA (Conversación sin cita)

#### 17. If2 (Detector sin confirmación)
- **Tipo**: `n8n-nodes-base.if`
- **Función**: Alternativa a If1 (parece redundante)
- **Condición**: `{{ $('AI Agent').item.json.output }}` NO contiene `"CITA_CONFIRMADA"`

#### 18. HTTP Request (Respuesta normal)
- **Tipo**: `n8n-nodes-base.httpRequest`
- **URL**: `http://178.104.27.180:8080/message/sendText/peluqueria-beta`
- **Función**: Envía la respuesta conversacional del AI Agent al cliente
- **Body**:
  - `number`: `{{ $('Webhook').item.json.body.data.key.remoteJid.split('@')[0] }}`
  - `text`: Si contiene `CITA_CONFIRMADA` → "✅ ¡Cita registrada! En breve recibirás la confirmación."  
    Sino → Output completo del AI Agent
- ⚠️ **API Key hardcodeada**: `988D01BD-F7B9-4B4E-9834-575D73A966A9`

---

## Conexiones entre Nodos

```
Webhook → If → Code in JavaScript → AI Agent → Wait → If1
                                       ↑              ↓
                        [Groq] ←─┤         ┌────┴─────────┐
                        [Memory] ←────┘    (SI) │         (NO) │
                                                 ↓              ↓
                                    Leer Disponibilidad      If2 → HTTP Request
                                                 ↓
                                        Verificar Slot
                                                 ↓
                                          ¿Disponible?
                                         ┌───────┴──────┐
                                    (SI) │         (NO) │
                                         ↓              ↓
                                  Append row    Aviso Slot Ocupado
                                         ↓
                              Code in JavaScript1
                                         ↓
                              Code in JavaScript2 (deshabilitado)
                                         ↓
                                  HTTP Request1
                                         ↓
                                  HTTP Request2
```

---

## Variables de Entorno Requeridas

Estas variables deben estar configuradas en `.env` o en n8n:

| Variable | Uso | Nodo(s) |
|----------|-----|---------|
| `EVOLUTION_API_URL` | URL base de Evolution API | HTTP Request (x3) |
| `EVOLUTION_API_KEY` | Autenticación Evolution API | ⚠️ Hardcodeada en 3 nodos |
| `GOOGLE_SHEET_ID` | ID del Sheet de citas | Leer/Append Google Sheets |
| `GROQ_API_KEY` | Credential para Groq | Groq Chat Model |
| `MEYER_NUMERO_DUENO` | Número del dueño para notificaciones | Code in JavaScript1 |

---

## Credenciales en n8n

| Credential | Tipo | ID | Uso |
|------------|------|----|----|
| Groq account | API Key | Configurada en n8n | llama-3.3-70b |
| Google Sheets account 3 | Service Account | `BMX8jHVHhVXSfDZ4` | Leer/Escribir Sheet |
| Header Auth account | HTTP Header | `7zNGL0U3zg4LEZZS` | Evolution API (dueño) |
| Header Auth account 2 | HTTP Header | `eCohHiQfHWlNdh0P` | Evolution API (cliente) |

---

## Problemas Conocidos y Pendientes

### 🔴 Seguridad Crítica
1. **API Key hardcodeada** en 3 nodos HTTP Request:
   - Línea 148: HTTP Request (respuesta normal)
   - Línea 535: Aviso Slot Ocupado
   - Nodo HTTP Request (varios headers)
   
   **Solución**: Migrar a credentials nativas de n8n tipo "Header Auth"

2. **Private key de Google** hardcodeada en Code in JavaScript2 (línea 434+)
   
   **Solución**: Eliminar el nodo o migrar a Google Calendar node nativo de n8n

3. **IP del servidor** hardcodeada en 4 nodos: `178.104.27.180`
   
   **Solución**: Usar variable de entorno `EVOLUTION_API_URL`

### 🟡 Mejoras Funcionales
1. **Disponibilidad proactiva**: Bot no muestra horarios disponibles proactivamente
   - Debe calcular slots libres y sugerirlos
   
2. **Reagendamiento**: No implementado
   - Debe buscar cita existente y actualizarla
   
3. **Cancelación**: No ejecuta acción real
   - Debe cambiar Estado en Sheet y eliminar evento de Calendar

### 🟢 Optimizaciones
1. **If2 redundante**: Parece duplicar la lógica de If1
2. **Rate limit global**: Actualmente por número, considerar rate limit global
3. **Logging**: Sin tracking de errores o métricas de uso

---

## Flujo de Datos Típico

### Caso 1: Cliente agenda cita exitosamente

```
1. Cliente envía: "Hola, quiero un corte de caballero mañana a las 2pm"
   → Webhook recibe mensaje

2. If valida que no es grupo y tiene texto
   → Pasa

3. Code in JavaScript:
   - Rate limit OK (< 50 mensajes en última hora)
   - Extrae: numero="573123456789", texto="Hola, quiero..."
   - Calcula: fechaHoy="17/05/2026", mañana="18/05/2026", calendario="..."
   - fueraDeHorario=false (2pm está en horario)

4. AI Agent procesa con Groq (llama-3.3-70b):
   - System prompt recibe contexto de fechas
   - LLM identifica: servicio="Corte caballero", fecha="mañana", hora="2pm"
   - LLM responde: "Perfecto, te confirmo: Corte caballero, 18/05/2026, 14:00. ¿Confirmamos?"

5. Cliente responde: "Sí, confirmo"
   → AI Agent responde: "CITA_CONFIRMADA|Corte caballero|18/05/2026|14:00"

6. Wait 3 segundos

7. If1 detecta "CITA_CONFIRMADA" → rama SI

8. Leer Disponibilidad: consulta todas las citas del Sheet
   → Retorna array: [{Fecha:"18/05/2026", Hora:"09:00", Estado:"Pendiente"}, ...]

9. Verificar Slot: compara 18/05/2026 + 14:00 con las existentes
   → disponible=true (no hay coincidencia)

10. ¿Disponible? → rama SI

11. Append row in sheet: guarda nueva fila
    → Fecha: 18/05/2026, Hora: 14:00, Nombre: Juan, Servicio: Corte caballero, Número: 573123456789, Estado: Pendiente

12. Code in JavaScript1: construye mensajes
    → textoDueno="🔔 Nueva cita agendada..."
    → textoCliente="✅ ¡Tu cita quedó confirmada!..."

13. Code in JavaScript2: (deshabilitado, no ejecuta)

14. HTTP Request1: envía notificación al dueño

15. HTTP Request2: envía confirmación al cliente

✅ Flujo completo exitoso
```

### Caso 2: Horario ocupado

```
1-9. (Igual que Caso 1)

10. Verificar Slot: compara 18/05/2026 + 14:00 con las existentes
    → disponible=false (ya existe esa cita)

11. ¿Disponible? → rama NO

12. Aviso Slot Ocupado: envía mensaje
    → "Lo sentimos, ese horario ya está reservado. ¿Te gustaría elegir otra hora? 😊"

❌ Cita no registrada, cliente puede elegir otro horario
```

### Caso 3: Conversación sin agendar

```
1-4. (Igual que Caso 1)

5. Cliente pregunta: "¿Cuánto cuesta el tinte completo?"
   → AI Agent responde: "El tinte completo cuesta $80.000"
   (NO contiene "CITA_CONFIRMADA")

6. Wait 3 segundos

7. If1 detecta que NO contiene "CITA_CONFIRMADA" → rama NO

8. If2 → rama de conversación normal

9. HTTP Request: envía respuesta del AI Agent al cliente
   → "El tinte completo cuesta $80.000"

✅ Respuesta conversacional normal
```

---

## Métricas y Monitoreo

### Actualmente NO implementado
- Tasa de éxito de agendamiento
- Tasa de colisión de horarios
- Tasa de abandono en el flujo
- Tiempo promedio de conversación
- Rate limit alcanzado por usuario

### Recomendado implementar
- Logger node después de cada fase crítica
- Webhook de alertas para errores
- Dashboard de métricas en Google Sheets o servicio externo

---

## Testing y Validación

### Casos de prueba recomendados:

1. **Happy path**: Cliente agenda cita completa en una conversación
2. **Horario ocupado**: Intentar agendar horario ya reservado
3. **Fuera de horario**: Mensaje recibido fuera del horario de atención
4. **Rate limit**: Enviar > 50 mensajes en 1 hora desde un número
5. **Grupo**: Mensaje desde grupo (debe ignorarse)
6. **Mensaje vacío**: Webhook recibe mensaje sin texto
7. **Conversación larga**: Validar que memoria mantiene contexto (10 msgs)
8. **Reagendar**: (Pendiente de implementar)
9. **Cancelar**: (Pendiente de implementar)

---

## Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-05-17 | Agregado sistema de verificación de disponibilidad en tiempo real |
| 2026-05-17 | Deshabilitado nodo Google Calendar (migración de credenciales) |
| 2026-05-17 | Documentación completa de arquitectura creada |
| 2026-04-29 | Credenciales movidas a .env (parcial) |
| 2026-04-28 | Workflow beta inicial en producción |

---

**Próxima revisión**: Migración completa de credenciales hardcodeadas a credentials de n8n
