# 03-INVESTIGACION.md — Lo que Aprendimos

> **Para:** entender por qué tomamos decisiones. R1+R2+R3 de Perplexity resumidas por tema.
> **Archivos originales:** `docs/investigacion perplexity.md`, `docs/Ronda 2 — investigacion perplexity.md`, `docs/investigacion ronda 3 perplexity.md`

---

## 1. Prompt Architecture vs Industria

**Hallazgo:** Ninguna plataforma seria (Landbot, Wati, respond.io) usa el LLM como state machine. El patrón universal: **"el LLM decide QUÉ, el código decide QUÉ HACER con eso"**. El LLM solo extrae intención/entidades; el routing y validación son código determinístico.

**Nuestro problema:** Prompt de 560 líneas haciendo 5 roles (routing, validación, extracción, estado, tono). Cada bug B2-B18 es una colisión de reglas compitiendo por atención del LLM.

**Solución:** Separar reglas determinísticas (→ código) de juicio semántico (→ LLM). Prompt bajaría de 560 a ~150 líneas.

## 2. Post-LLM Validation Pipeline

**Patrón:** `generar → parsear → validar esquema → validar semántica → guardar`. 3 capas:
1. Regex/schema (gratis, ms)
2. Reglas de negocio (gratis, ms): ¿slot existe? ¿servicio válido? ¿fecha futura?
3. LLM-as-judge (caro, solo para pasos críticos)

**Aplicar a:** CITA_CONFIRMADA, CANCELAR_CITA, REAGENDAR_CITA, MOSTRAR_SLOTS.

## 3. Dashboard Sync

**Problema:** Webhooks fire-and-forget. Si fallan, el dashboard nunca se entera.

**Patrón:** 3 capas: (1) Idempotencia con `event_id` único, (2) Retry con backoff exponencial 3-5 intentos, (3) Dead Letter Queue + reconciliación periódica.

**Para nosotros:** Tabla Postgres `webhook_dead_letter` + workflow n8n de reconciliación cada 15-30 min. Sin SQS ni RabbitMQ.

## 4. Function Calling Viability

**Los 3 proveedores soportan function calling en tier gratuito.** Cerebras y Groq con `strict: true` fuerzan JSON válido contra schema. **Pero:** requiere 2 llamadas por turno (no 1) → duplica consumo de requests. Gemini tiene solo 1,000 RPD → no usar function calling con Gemini. Usar Cerebras/Groq.

**⚠️ Advertencia:** Activar billing en Google Cloud = perder tier gratuito completo de Gemini.

## 5. Session Management (State Machines)

**Patrón:** State machine determinística (`esperando_servicio → esperando_fecha → esperando_hora → confirmando`). El LLM solo extrae entidades; el código decide transiciones.

**Implementación:** Columna `step` en tabla `sessions`. Validación post-LLM rechaza transiciones inválidas.

## 6. Monitoring & Quality

**4 capas de monitoreo:** (1) Chequeos deterministas, (2) Scoring heurístico, (3) LLM-as-judge, (4) Revisión humana.

**Quick win:** Health check sintético — workflow n8n que simula conversación cada N minutos y verifica respuesta esperada. Tabla `validation_failures` agrupada por acción + modelo.

## 7. Evolution API vs BSP

**Riesgos Evolution API:** Ban del número, QR expira, sin templates, sin SLA, sin catálogos oficiales.

**Mitigación:** <200-300 conversaciones/día, delays aleatorios, no iniciar conversaciones, suscribir CONNECTION_UPDATE.

**BSP (360dialog):** Partner Platform €250/mes + €49/canal. Diseñado para multi-tenant. Migrar cuando un bloqueo cueste más que la suscripción.

## 8. LLM Free Tier Limits & Costs

| Proveedor | Free Tier | Costo pago/mes (3M tokens) |
|-----------|-----------|--------------------------|
| Gemini Flash-Lite | 15 RPM, 1k RPD | ~$1.50 |
| Cerebras gpt-oss-120b | 30 RPM, 1M tokens/día | ~$3.30 |
| Groq gpt-oss-120b | 30 RPM, 1k RPD | ~$1-2 (est.) |
| DeepSeek V4 Flash | OpenCode Go: $10/mes | 31k requests/mes incluidos |

## 9. Code Organization (Fase 3)

```
/apps
  /bot-service        # API que n8n invoca (HTTP)
  /dashboard          # Next.js
/packages
  /bot-core           # Lógica compartida (validation, slots, prompt, llm)
```

`bot-core` contiene funciones puras. El bot-service es un controller HTTP. El dashboard usa lo mismo para validaciones.

## 10. Security (Webhooks Multi-Tenant)

**Anti-patrón:** Un solo `WEBHOOK_SECRET` global.

**Patrón:** HMAC por tenant. Columna `webhook_secret` en businesses. Firmar con HMAC-SHA256, validar en dashboard. Protección anti-replay (timestamp + 5 min), rate limiting por IP.
