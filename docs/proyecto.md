# Proyecto Peluquería Meyer — Documentación Técnica

> **Estado**: Beta en producción  
> **Cliente**: Peluquería Meyer (Primer cliente del SaaS)  
> **Última actualización**: Mayo 17, 2026

---

## Descripción General

Automatización completa del canal WhatsApp Business de Peluquería Meyer mediante un agente de IA conversacional que gestiona:

- ✅ Atención al cliente 24/7 con lenguaje natural
- ✅ Reserva automática de citas con validación de disponibilidad
- ✅ Verificación en tiempo real de horarios ocupados (anti-colisión)
- ✅ Recordatorios automáticos 24h antes de cada cita
- ✅ Información de servicios, precios y horarios
- ✅ Notificaciones al dueño por cada nueva cita

**Objetivo del proyecto**: Validar el modelo de negocio SaaS de agentes WhatsApp con IA para negocios locales, con miras a escalar a múltiples clientes y generar ingresos recurrentes.

---

## Cliente

**Negocio**: Peluquería Meyer  
**Industria**: Peluquería / salón de belleza  
**Canal principal**: WhatsApp Business  
**Ubicación**: Colombia (zona horaria America/Bogota)  
**Horarios**:
- Lunes a Sábado: 9:00 AM - 7:00 PM
- Domingos: 10:00 AM - 5:00 PM

**Servicios ofrecidos**:
- Corte dama: $35.000
- Corte caballero: $25.000
- Tinte completo: $80.000
- Manicure + pedicure: $65.000
- Peinado especial: $50.000

---

## Arquitectura del Sistema

### Stack Tecnológico

```
┌─────────────────┐
│ Cliente         │  WhatsApp (móvil)
│ (WhatsApp)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Evolution API   │  Gateway WhatsApp Business
│ (Self-hosted)   │  VPS Ubuntu - Puerto 8080
└────────┬────────┘
         │ webhook POST
         ▼
┌─────────────────┐
│ n8n Workflow    │  Orquestador de lógica
│ (Self-hosted)   │  https://n8n.zyvenshop.com
└────────┬────────┘
         │
    ┌────┴────┬──────────────┬──────────────┐
    ▼         ▼              ▼              ▼
┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
│ Claude  │ │  Google  │ │ Google  │ │ Evolution│
│ Haiku   │ │  Sheets  │ │ Calendar│ │   API    │
│ 4.5 API │ │          │ │ (paused)│ │  (send)  │
└─────────┘ └──────────┘ └─────────┘ └──────────┘
   IA         Base de      Eventos      Respuestas
              datos citas                WhatsApp
```

### Componentes Principales

| Componente | Tipo | Ubicación | Función |
|------------|------|-----------|---------|
| **Evolution API** | Gateway WhatsApp | VPS Ubuntu (self-hosted) | Recibe/envía mensajes de WhatsApp |
| **n8n** | Workflow orchestrator | https://n8n.zyvenshop.com | Orquesta toda la lógica de negocio |
| **Groq (llama-3.3-70b)** | LLM conversacional | Groq API | Genera respuestas en lenguaje natural |
| **Google Sheets** | Base de datos | Google Cloud | Almacena citas (Fecha, Hora, Cliente, Servicio, Estado) |
| **Google Calendar** | Gestión de eventos | Google Cloud | (Temporalmente deshabilitado) |

---

## Workflows

El sistema consta de 2 workflows principales:

### 1. `peluqueria-beta.json` — Flujo Principal

**Trigger**: Webhook POST desde Evolution API (cada mensaje recibido)  
**Nodos**: 19 nodos organizados en 4 fases  
**Documento detallado**: Ver `docs/workflow-arquitectura.md`

**Funciones**:
- Filtra grupos y rate limit (50 msg/hora por usuario)
- Conversación con Groq (llama-3.3-70b) + memoria de 10 mensajes
- Valida horario de atención
- Agendamiento con orden estricto (servicio → fecha → hora)
- Verificación de disponibilidad en tiempo real
- Guardado en Google Sheets
- Notificaciones al dueño y confirmación al cliente

**Flujo simplificado**:
```
Mensaje WhatsApp 
  → Filtros (grupos, rate limit) 
  → Claude conversa 
  → ¿Confirmó cita? 
     → SI: Verifica disponibilidad en Sheet 
        → Disponible: Guarda + Notifica 
        → Ocupado: Avisa y permite elegir otro horario
     → NO: Responde conversación normal
```

### 2. `recordatorios-meyer.json` — Recordatorios Automáticos

**Trigger**: Cron schedule - Todos los días a las 3:00 PM (15:00 Bogotá)  
**Nodos**: 4 nodos  
**Función**: Envía recordatorios 24h antes de cada cita

**Flujo**:
```
Schedule Trigger (3PM diario)
  → Leer todas las citas del Sheet
  → Filtrar citas de mañana (Estado != "Cancelada")
  → Enviar mensaje de recordatorio a cada cliente
```

**Mensaje tipo**:
```
Hola [Nombre] 👋

Te recordamos que tienes una cita en *Peluquería Meyer* mañana 
*[día de semana] [día] de [mes]* a las *[hora]*.

✂️ Servicio: *[servicio]*

Si necesitas cancelar o reagendar, responde este mensaje 😊
```

---

## Base de Datos (Google Sheets)

**Archivo**: "CItas Peluqueria"  
**Pestaña**: "Datos clientes"  
**Estructura**:

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| Fecha | Texto | Formato DD/MM/YYYY | `18/05/2026` |
| Hora | Texto | Formato HH:MM | `14:00` |
| Nombre | Texto | Nombre del cliente | `Juan Pérez` |
| Servicio | Texto | Servicio solicitado | `Corte caballero` |
| Número | Texto | Número de WhatsApp | `573123456789` |
| Estado | Texto | Estado de la cita | `Pendiente`, `Cancelada`, `Completada` |
| EventID | Texto | ID del evento en Calendar | (vacío actualmente) |

**Operaciones**:
- **Lectura**: Workflow principal lee todas las filas para verificar disponibilidad
- **Escritura**: Append row cuando se confirma nueva cita
- **Filtrado**: Workflow de recordatorios filtra por fecha de mañana y Estado != "Cancelada"

---

## Estado Actual del Proyecto

### ✅ Funcionalidades Implementadas

- [x] Infraestructura VPS desplegada y funcionando
- [x] n8n instalado y configurado
- [x] Evolution API conectada con instancia activa
- [x] Workflow principal (19 nodos) activo en producción
- [x] Sistema de verificación de disponibilidad en tiempo real
- [x] Sistema anti-colisión de horarios
- [x] Recordatorios automáticos (cron diario 3PM)
- [x] Notificación al dueño por cada nueva cita
- [x] Confirmación al cliente con detalles de la cita
- [x] Filtro de grupos (solo mensajes directos)
- [x] Rate limit por usuario (50 msg/hora)
- [x] Memoria conversacional (10 mensajes por usuario)
- [x] Validación de horario de negocio (respuesta automática fuera de horario)
- [x] Manejo de fechas con timezone Bogotá
- [x] Calendario de próximos 7 días inyectado al prompt

### 🟡 En Progreso / Pendiente

#### Seguridad (CRÍTICO)
- [ ] Migrar API keys hardcodeadas a credentials de n8n (3 nodos)
- [ ] Eliminar private key de Google del código (nodo inactivo)
- [ ] Parametrizar IP del servidor (actualmente hardcoded)

#### Funcionalidades
- [ ] Integración con Google Calendar (temporalmente deshabilitado)
- [ ] Disponibilidad proactiva (mostrar horarios libres al cliente)
- [ ] Reagendamiento funcional (buscar y actualizar cita existente)
- [ ] Cancelación funcional (cambiar Estado en Sheet + eliminar de Calendar)
- [ ] Panel de métricas para el dueño
- [ ] Resumen periódico de tipos de cortes y horarios más solicitados

### ⚠️ Bugs Conocidos

Ver `docs/pendientes-seguridad.md` y `CONTEXT.md` sección "Bugs y Mejoras Pendientes"

---

## Métricas y KPIs (Propuestos)

### Métricas de Negocio
- Citas agendadas por día/semana/mes
- Tasa de conversión (mensajes → citas)
- Servicios más solicitados
- Horarios con mayor demanda
- Tasa de cancelación
- Tiempo de respuesta promedio del bot

### Métricas Técnicas
- Uptime del workflow
- Tasa de error en agendamiento
- Rate limit alcanzado por usuario
- Colisiones de horario detectadas
- Latencia de respuesta (desde mensaje hasta respuesta)

**Estado**: Sin sistema de tracking implementado aún

---

## Próximos Pasos

### Fase 1: Estabilización (1-2 semanas)
1. Migrar credenciales hardcodeadas a vault seguro
2. Implementar logging y alertas de errores
3. Reactivar Google Calendar con credenciales seguras
4. Testing exhaustivo de casos edge

### Fase 2: Mejoras Funcionales (2-4 semanas)
1. Disponibilidad proactiva (calcular y mostrar slots libres)
2. Reagendamiento completo
3. Cancelación con actualización de Sheet y Calendar
4. Panel de métricas básico para el dueño

### Fase 3: Escalabilidad (1-2 meses)
1. Multi-tenant: adaptar arquitectura para múltiples clientes
2. Plantillas de configuración por negocio
3. Dashboard de administración
4. Sistema de billing

---

## Documentación Relacionada

- `CONTEXT.md` — Contexto general del proyecto y reglas de trabajo
- `CLAUDE.md` — Reglas de seguridad para Claude
- `README.md` — Documentación principal y setup
- `docs/workflow-arquitectura.md` — Diagrama detallado del workflow principal
- `docs/pendientes-seguridad.md` — Issues de seguridad y credenciales
- `prompts/meyer-system-prompt.md` — Prompt completo de Claude con ejemplos

---

## Contacto y Mantenimiento

**Desarrollador**: Johnander  
**Repositorio**: https://github.com/John58666/meyer-bot (privado)  
**Cliente**: Peluquería Meyer  
**Estado**: Beta en producción  
**Última revisión**: Mayo 17, 2026
