# Configuración — Peluquería Meyer

## Datos del negocio

| Campo | Valor |
|-------|-------|
| Nombre | Peluquería Meyer |
| Tipo | Peluquería / salón de belleza |
| WhatsApp | [COMPLETAR] |
| Dirección | [COMPLETAR] |
| Horario | [COMPLETAR] |

## Configuración n8n

| Parámetro | Valor |
|-----------|-------|
| n8n URL | https://n8n.zyvenshop.com |
| Workflow principal | peluqueria-beta |
| Workflow recordatorios | recordatorios-meyer |

## Configuración Evolution API

| Parámetro | Valor |
|-----------|-------|
| Instancia | [COMPLETAR] |
| Webhook | Configurado en n8n |

## Variables de entorno requeridas

```
ANTHROPIC_API_KEY=...
EVOLUTION_API_KEY=...
EVOLUTION_API_URL=...
```

> Las credenciales reales se gestionan directamente en n8n (Credentials) y no se versionan aquí.
