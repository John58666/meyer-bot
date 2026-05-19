# CONTEXT.md — meyer-bot

## Qué es este proyecto
Plataforma SaaS de agentes WhatsApp con IA para negocios locales.
Primer cliente: Peluquería Meyer — bot en producción beta.
Objetivo: escalar a más negocios locales y reemplazar el trabajo actual de Johnander.

## Stack
- **n8n** (n8n.zyvenshop.com) — orquestador de workflows
- **Evolution API** — conexión con WhatsApp (VPS Ubuntu)
- **Groq / llama-3.3-70b** — modelo de IA para conversación
- **Google Sheets** — base de datos de citas
- **Google Calendar** — gestión de eventos (temporalmente deshabilitado)
- **VPS Ubuntu** — servidor en 178.104.27.180 (no compartir esta IP)

## Repositorio
- GitHub: https://github.com/John58666/meyer-bot (privado)
- Local: ~/Documents/meyer-bot

## Estructura del proyecto
```
meyer-bot/
├── workflows/
│   ├── peluqueria-beta.json        # Flujo principal (19 nodos)
│   └── recordatorios-meyer.json    # Recordatorios automáticos
├── docs/
│   ├── proyecto.md                 # Documentación general
│   ├── workflow-arquitectura.md    # Diagrama y flujo detallado
│   └── pendientes-seguridad.md     # Issues de seguridad
├── prompts/
│   └── meyer-system-prompt.md      # System prompt del agente
├── clientes/meyer/
├── secrets/                        # Credenciales Google (ignorado en Git)
├── .env                           # Variables de entorno (ignorado en Git)
├── .env.example                   # Plantilla de variables
├── docker-compose.yml             # Configuración n8n local
├── CONTEXT.md                     # Este archivo
├── CLAUDE.md                      # Reglas para Claude
└── README.md                      # Documentación principal
```

## Sprint 0 — COMPLETADO ✅ (Mayo 18, 2026)

### ✅ Seguridad
- EVOLUTION_API_KEY migrada a .env — todos los nodos usan `$env.EVOLUTION_API_KEY`
- Google private key eliminada del workflow (nodo "Code in JavaScript2" desconectado)
- N8N_BLOCK_ENV_ACCESS_IN_NODE=false configurado en docker-compose.yml

### ✅ Bot End-to-End
- Flujo completo funcionando: recepción → conversación IA → validación → persistencia → notificaciones
- Verificación de disponibilidad en tiempo real antes de confirmar cita
- Sistema anti-colisión de horarios operativo

### ✅ Recordatorios 24h
- Workflow independiente con cron diario a las 3PM
- Filtra citas con estado "Pendiente" y envía recordatorio 24h antes
- Usa `$env.EVOLUTION_API_KEY` (sin keys hardcodeadas)

### 🔧 Google Calendar
- Nodo deshabilitado del flujo principal
- Código eliminado, sin private key expuesta
- Reactivación pendiente de migrar credenciales a n8n credentials nativas

## Lo que está funcionando
- ✅ Bot agenda citas por WhatsApp con Groq (llama-3.3-70b)
- ✅ Validación de horario de negocio (fuera de horario = mensaje automático)
- ✅ Verificación de disponibilidad en tiempo real antes de confirmar
- ✅ Sistema anti-colisión: no permite agendar horarios ya ocupados
- ✅ Google Sheets registra citas automáticamente (Fecha, Hora, Nombre, Servicio, Número, Estado)
- ✅ Recordatorios 24h antes de cada cita (workflow independiente, cron 3PM diario)
- ✅ Notificación al dueño cuando se agenda una cita nueva
- ✅ Confirmación al cliente con detalles de la cita
- ✅ Filtro de grupos (solo mensajes directos)
- ✅ Rate limit: 50 mensajes/hora por número
- ✅ Memoria de conversación: últimos 10 mensajes por usuario
- ✅ Cálculo automático de fechas (hoy, mañana, próximos 7 días en contexto)

## Sprint 1 — COMPLETADO ✅ (Mayo 18, 2026)

### ✅ PostgreSQL
- Container meyer_postgres corriendo en VPS (postgres:16-alpine)
- Schema multi-tenant: tablas businesses + appointments
- Meyer registrado como business_id=1
- 34 citas migradas desde Google Sheets

### ✅ Workflows migrados
- peluqueria-beta: nodos Sheets → PostgreSQL (Leer Disponibilidad, Insertar Cita)
- recordatorios-meyer: nodo Leer Citas → PostgreSQL
- IP hardcodeada → $env.EVOLUTION_API_URL
- Número dueño hardcodeado → $env.OWNER_NUMBER

## Arquitectura del Workflow Principal (19 nodos)

### Fase 1: Recepción y Filtrado
1. **Webhook** → recibe POST de Evolution API
2. **If** → filtra grupos (@g.us) y mensajes vacíos
3. **Code in JavaScript** → rate limit + extrae mensaje + calcula fechas (Bogotá timezone)

### Fase 2: Conversación IA
4. **AI Agent** → orquesta la conversación
5. **Groq Chat Model** → llama-3.3-70b
6. **Simple Memory** → historial de 10 mensajes por usuario
7. **Wait** → espera 3 segundos antes de continuar

### Fase 3: Decisión y Validación
8. **If1** → detecta "CITA_CONFIRMADA|servicio|fecha|hora" en respuesta
9. **Leer Disponibilidad** → consulta todas las citas en Google Sheet
10. **Verificar Slot** → compara fecha/hora solicitada vs. ocupadas
11. **¿Disponible?** → decide si el horario está libre

### Fase 4: Persistencia y Notificaciones
12. **Append row in sheet** → guarda cita (si disponible)
13. **Code in JavaScript1** → construye mensajes para dueño y cliente
14. **Code in JavaScript2** → (DESHABILITADO) código de Google Calendar
15. **HTTP Request1** → envía notificación al dueño (WhatsApp)
16. **HTTP Request2** → envía confirmación al cliente (WhatsApp)

### Rama alternativa (no confirmación)
17. **If2** → detecta si NO hay confirmación
18. **HTTP Request** → responde conversación normal
19. **Aviso Slot Ocupado** → informa si el horario está ocupado

Ver diagrama completo en `docs/workflow-arquitectura.md`

## Google Sheets
- Archivo: "CItas Peluqueria"
- Pestaña: "Datos clientes"
- Columnas: Fecha | Hora | Nombre | Servicio | Número | Estado | EventID

## Servicios y precios (Peluquería Meyer)
- Corte dama: $35.000
- Corte caballero: $25.000
- Tinte completo: $80.000
- Manicure + pedicure: $65.000
- Peinado especial: $50.000
- Horario: Lunes-Sábado 9AM-7PM | Domingos 10AM-5PM

## Bugs y Mejoras Pendientes

### 🔴 CRÍTICO
1. **IP del servidor hardcodeada** en múltiples nodos: 178.104.27.180 — migrar a variable de entorno o credentials de n8n

### 🟡 ALTA PRIORIDAD
1. **Disponibilidad proactiva**: Bot debe mostrar slots libres ANTES de que cliente elija
   - Leer Sheet, calcular ocupados, pasar disponibles a Claude en system prompt
   - Ejemplo: "Tengo disponible: 9AM, 11AM, 2PM, 4PM"

2. **Reagendamiento**: No existe lógica completa
   - Buscar cita existente por número en Sheet
   - Actualizar fecha/hora (o borrar y crear nueva)
   - Si Calendar está activo: borrar evento viejo usando EventID

3. **Cancelación automática**: Bot solo responde texto pero no ejecuta
   - Cambiar Estado a "Cancelada" en Sheet
   - Si Calendar está activo: borrar evento usando EventID

### 🟢 MEJORAS
1. **Métricas para el dueño**: Resumen periódico automático
   - Tipos de cortes más solicitados
   - Horarios con mayor demanda
   - Tasa de cancelación
   
2. **Reactivar Google Calendar**: Una vez migradas las credenciales
   - Eliminar código hardcoded
   - Usar credentials de n8n
   - Reconectar nodo al flujo principal

## Reglas de seguridad — CRÍTICO
- ✅ Variables sensibles en .env (ignorado por Git)
- ✅ Credenciales Google en secrets/ (ignorado por Git)
- ✅ EVOLUTION_API_KEY migrada a $env — sin keys hardcodeadas en workflow
- ✅ Google private key eliminada del workflow
- NUNCA subir .env ni secrets/ a Git
- Antes de cualquier commit verificar que .env y secrets/ no estén incluidos
- Verificar con: `git status` antes de cada commit

## Reglas de trabajo en equipo
- Pensar siempre en escala, no solo en Meyer
- Preguntar si hay dudas antes de asumir
- Decir "no sé" cuando aplique
- No dar la razón sin razonar primero
- Cada decisión debe considerar cómo funciona para el cliente 10 o 100
- Documentar TODO: cada cambio de arquitectura actualiza CONTEXT.md
- Commits descriptivos: `feat:`, `fix:`, `chore:`, `docs:`
