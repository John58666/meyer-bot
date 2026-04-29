# Proyecto Peluquería Meyer — Documentación

## Descripción

Automatización completa del canal WhatsApp de Peluquería Meyer mediante un agente de IA que gestiona:

- Atención al cliente 24/7
- Reserva y consulta de citas
- Recordatorios automáticos 24h antes de cada cita
- Información de servicios y precios

## Cliente

**Negocio**: Peluquería Meyer  
**Tipo**: Peluquería / salón de belleza  
**Canal**: WhatsApp Business

## Arquitectura

```
Cliente WhatsApp
      ↓
Evolution API  (recibe/envía mensajes)
      ↓
n8n Workflow   (orquesta la lógica)
      ↓
Claude Haiku   (genera respuestas IA)
```

## Workflows

### 1. peluqueria-beta (flujo principal)
Maneja toda la conversación entrante: saludo, consultas, y reservas.

### 2. recordatorios-meyer (recordatorios)
Se ejecuta cada día a las 9:00 AM, revisa las citas del día siguiente y envía recordatorio por WhatsApp.

## Estado del proyecto

- [x] Infraestructura VPS desplegada
- [x] n8n instalado y configurado
- [x] Evolution API conectada
- [x] Workflow beta funcionando
- [x] Recordatorios automáticos activos
- [ ] Integración con agenda/calendario
- [ ] Panel de métricas
