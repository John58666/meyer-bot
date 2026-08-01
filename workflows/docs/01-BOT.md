# 01-BOT.md — El Bot de WhatsApp

> **Para:** arreglar bugs, modificar prompt, cambiar proveedores, debuggear el workflow.

## 🔄 Flujo de un mensaje (trace completo)

```
Webhook → Filtro Inicial → Lookup Negocio → ¿Negocio Existe?
  → Procesar Mensaje (wbKey check, rate limit 50msg/h, fecha, multimedia)
  → Leer Slots Disponibles (generate_series 90d, filtra exceptions)
  → Formatear Disponibilidad (agrupa por fecha/profesional)
  → Leer Historial → AI Agent (LLM) → Guardar Historial
  → Wait (3s) → Switch (6 reglas)
```

## 🤖 Proveedores LLM (cadena de fallback)

Orden actual: **Gemini → Cerebras → Groq → DeepSeek → OpenRouter (×3)**

| # | Proveedor | Modelo | API Key | Notas |
|---|-----------|-------|---------|-------|
| 1 | Gemini | gemini-2.5-flash-lite | `$env.GEMINI_API_KEY` | Free: 15 RPM, 1k RPD. Mejor español. |
| 2 | Cerebras | gpt-oss-120b | `$env.CEREBRAS_API_KEY` | Free: 30 RPM, 1M tokens/día |
| 3 | Groq | openai/gpt-oss-120b | `$env.GROQ_API_KEY` | Free: 30 RPM, 1k RPD, 8k tokens/min |
| 4 | DeepSeek | deepseek-v4-flash | `$env.OPENCODE_GO_API_KEY` | OpenCode Go: $10/mes |
| 5-7 | OpenRouter | nemotron/gemma/phi (free) | `$env.OPENROUTER_API_KEY` | Modelos pequeños, último recurso |

## 🔀 Switch (6 reglas)

| # | Regla | Output contiene | Ruta |
|---|-------|----------------|------|
| 0 | Confirmar Cita | `CITA_CONFIRMADA` | Leer Disponibilidad → Verificar Slot → Insertar Cita |
| 1 | Gestionar Cita | `GESTIONAR_CITA` | Leer Citas Cliente → Formatear Citas |
| 2 | Cancelar Cita | `CANCELAR_CITA` | Ejecutar Cancelación |
| 3 | Reagendar Cita | `REAGENDAR_CITA` | Ejecutar Reagendamiento |
| 4 | Mostrar Slots | `MOSTRAR_SLOTS` | Leer Slots Fecha → Formatear → Enviar |
| 5 | Fallback | (ninguno) | Respuesta Normal |

## 🛠️ Fixes activos (aplicados 31 Jul)

| Fix | Nodo | Qué cambió |
|-----|------|-----------|
| Reaction filter | Procesar Mensaje | `reactionMessage` + `protocolMessage` en `esNoTexto` |
| wbKey check | Procesar Mensaje | Tolera payloads sin `key` (connection.update, etc.) |
| INSERT typeVersion | Insertar Cita | 2.5 → 2.6 (soporta RETURNING) |
| Neutralizador | AI Agent | Solo bloquea `CANCELAR_CITA`, no `GESTIONAR_CITA` |
| Switch GESTIONAR_CITA | Switch | Sin `\n` corruptos en leftValue |
| Providers orden | AI Agent | Gemini primero, DeepSeek 4to |
| B18 fecha >7d | Procesar Mensaje + AI Agent | Deteccion `extraerFechaLejana()` + short-circuit sin LLM |

## ⚠️ EMERGENCIAS — Qué NO tocar

- **NO renombrar nodos** (AI Agent, Webhook, Switch, etc.) — tienen referencias downstream
- **NO cambiar typeVersion** de nodos que funcionan
- **NO modificar el prompt sin backup** del jsCode completo
- **NO hacer `docker compose restart`** para nuevas variables — usar `down && up -d`
- **NO activar billing de Google Cloud** en el proyecto de Gemini — pierde el tier gratuito

## 🧪 Cómo probar

```bash
# Probar el bot sin WhatsApp:
curl -X POST 'https://n8n.zyvenshop.com/webhook/whatsapp-bot' \
  -H 'Content-Type: application/json' \
  -d '{"event":"messages.upsert","instance":"peluqueria-beta",
    "data":{"key":{"remoteJid":"573142556322@s.whatsapp.net","fromMe":false,"id":"TEST"},
    "message":{"conversation":"Quiero agendar un corte para mañana a las 2pm"},
    "pushName":"Test","messageTimestamp":'"$(date +%s)"'}}'

# Ver ejecuciones recientes en n8n API:
# GET /rest/executions?workflowId=tzFJ9m2pJX1AheI0&limit=5
```
