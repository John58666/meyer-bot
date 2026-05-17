# CONTEXT.md — meyer-bot

## Qué es este proyecto
Plataforma SaaS de agentes WhatsApp con IA para negocios locales.
Primer cliente: Peluquería Meyer — bot en producción beta.
Objetivo: escalar a más negocios locales y reemplazar el trabajo actual de Johnander.

## Stack
- **n8n** (n8n.zyvenshop.com) — orquestador de workflows
- **Evolution API** — conexión con WhatsApp (VPS Ubuntu)
- **Claude Haiku 4.5** — modelo de IA para conversación
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

## Cambios Recientes (Mayo 17, 2026)

### ✅ Infraestructura
- Credenciales movidas a .env (9 variables configuradas)
- docker-compose.yml simplificado (solo n8n local, 9 líneas)
- EVOLUTION_API_KEY agregada como variable de entorno
- N8N_BLOCK_ENV_ACCESS_IN_NODE=false configurado

### ✅ Workflow Principal
- **Verificación de disponibilidad en tiempo real** implementada
- Sistema anti-colisión de horarios: lee Google Sheet antes de confirmar
- Flujo completo funcionando end-to-end:
  1. Cliente solicita cita → Claude conversa
  2. Cliente confirma → Sistema verifica disponibilidad en Sheet
  3. Si disponible → Guarda en Sheet + notifica dueño + confirma cliente
  4. Si ocupado → Avisa al cliente y permite elegir otro horario

### ⚠️ Google Calendar
- Nodo temporalmente deshabilitado del flujo principal
- Código aún presente en "Code in JavaScript2" pero no se ejecuta
- Razón: limpieza de credenciales y migración a variables de entorno
- Private key de Google aún hardcodeada en el código (nodo inactivo)

### ⚠️ Pendientes de Seguridad
- 3 nodos HTTP Request tienen EVOLUTION_API_KEY hardcodeada (líneas 148, 535, 97)
- IP del servidor hardcodeada en múltiples nodos: 178.104.27.180
- Migrar a credentials nativas de n8n (ver docs/pendientes-seguridad.md)

## Lo que está funcionando
- ✅ Bot agenda citas por WhatsApp con Claude Haiku 4.5
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

## Arquitectura del Workflow Principal (19 nodos)

### Fase 1: Recepción y Filtrado
1. **Webhook** → recibe POST de Evolution API
2. **If** → filtra grupos (@g.us) y mensajes vacíos
3. **Code in JavaScript** → rate limit + extrae mensaje + calcula fechas (Bogotá timezone)

### Fase 2: Conversación IA
4. **AI Agent** → orquesta la conversación
5. **Anthropic Chat Model** → Claude Haiku 4.5
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
1. **Credenciales hardcodeadas**: Migrar EVOLUTION_API_KEY a credentials de n8n (3 nodos)
2. **Private key expuesta**: Limpiar Google private key del nodo "Code in JavaScript2"

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
- ⚠️ AÚN HAY API keys hardcodeadas en workflow (ver docs/pendientes-seguridad.md)
- NUNCA subir .env ni secrets/ a Git
- La private key del Service Account debe ir en credentials de n8n, no en código
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
