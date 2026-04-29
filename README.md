# Meyer Bot — Peluquería Meyer

Bot de WhatsApp con IA para gestión de citas, recordatorios y atención al cliente de Peluquería Meyer.

## Stack

- **WhatsApp**: Evolution API
- **Automatización**: n8n (self-hosted)
- **IA**: Claude Haiku (Anthropic)
- **Servidor**: VPS Ubuntu — 178.104.27.180

## Estructura

```
meyer-bot/
├── workflows/          # Workflows de n8n exportados
├── prompts/            # System prompts del agente IA
├── docs/               # Documentación del proyecto
└── clientes/meyer/     # Configuración específica del cliente
```

## Workflows

| Archivo | Descripción |
|---------|-------------|
| `peluqueria-beta.json` | Flujo principal de atención y reservas |
| `recordatorios-meyer.json` | Envío automático de recordatorios de citas |

## Despliegue

Los workflows se importan directamente en n8n desde la interfaz web:
`https://n8n.zyvenshop.com` → Workflows → Import from file
