# CONTEXT.md — meyer-bot

## Qué es este proyecto
Plataforma SaaS de agentes WhatsApp con IA para negocios locales.
Primer cliente: Peluquería Meyer — bot en producción.
Objetivo: escalar a más negocios locales y reemplazar el trabajo actual de Johnander.

## Stack
- **n8n** (n8n.zyvenshop.com) — orquestador de workflows
- **Evolution API** — conexión con WhatsApp (VPS Ubuntu)
- **Claude Haiku** — modelo de IA para conversación
- **Google Sheets** — base de datos de citas
- **Google Calendar** — gestión de eventos
- **VPS Ubuntu** — servidor en 178.104.27.180 (no compartir esta IP)

## Repositorio
- GitHub: https://github.com/John58666/meyer-bot (privado)
- Local: ~/Documents/meyer-bot

## Estructura del proyecto

## Lo que está funcionando
- Bot agenda citas por WhatsApp
- Validación de horario y disponibilidad básica
- Google Sheets registra citas automáticamente
- Google Calendar crea eventos automáticamente
- Recordatorios 24h antes de cada cita
- Notificación al dueño cuando se agenda una cita
- Filtro de grupos y rate limit (50 mensajes/hora por número)
- Memoria de conversación (últimos 10 mensajes)

## Bugs pendientes — PRÓXIMA SESIÓN
1. **Disponibilidad**: el bot no muestra slots libres antes de que el cliente elija hora. Hay que leer el Sheet, calcular ocupados y pasarle los disponibles a Claude en el system prompt.
2. **Reagendamiento**: no existe lógica. Hay que buscar cita por número, borrar evento de Calendar usando EventID, crear uno nuevo.
3. **Cancelación automática**: el bot solo responde con texto pero no hace nada. Hay que borrar evento Calendar y cambiar Estado a "Cancelada" en Sheet.
4. **Métricas para el dueño**: resumen periódico de tipos de cortes y horarios más solicitados.

## Arquitectura del workflow principal
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

## Reglas de seguridad — CRÍTICO
- NUNCA hardcodear API keys, tokens o contraseñas en el código
- NUNCA subir .env ni secrets/ a Git
- Credenciales de Google van en carpeta secrets/ y en credentials de n8n
- La private key del Service Account va en credentials de n8n, no en código
- Antes de cualquier commit verificar que .env y secrets/ no estén incluidos

## Reglas de trabajo en equipo
- Pensar siempre en escala, no solo en Meyer
- Preguntar si hay dudas antes de asumir
- Decir "no sé" cuando aplique
- No dar la razón sin razonar primero
- Cada decisión debe considerar cómo funciona para el cliente 10 o 100
