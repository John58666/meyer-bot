📦 ARCHIVADO — Ver workflows/docs/03-INVESTIGACION.md para resumen consolidado.

# Ronda 2: de parches reactivos a arquitectura sistemática

## 1. Validación post-LLM: patrón de pipeline, no parches sueltos

El patrón que usan los sistemas de producción reales se llama **verification harness** o **validation pipeline**: trata al LLM como un "transductor no confiable" y coloca la confiabilidad en una capa separada, no en el prompt. La arquitectura de referencia tiene tres etapas fijas que se aplican a **toda** salida del LLM, no solo a las acciones que ya fallaron:[^1]

1. **Parse & Validate** — forzar un esquema tipado (JSON Schema, Zod, o incluso un objeto plano con campos obligatorios) y rechazar de inmediato cualquier salida que no calce estructuralmente.[^2][^1]
2. **Field-level / semantic validation** — reglas de negocio sobre los valores ya parseados: ¿el slot de hora existe en la tabla de disponibilidad?, ¿el servicio pertenece a ese negocio?, ¿la fecha es futura?.[^3]
3. **Repair cascade / reask** — si falla la validación, no se regenera todo el turno: se le devuelve al modelo un mensaje de error puntual ("el campo hora no coincide con ningún slot libre") y se le pide corregir solo eso, con un tope de reintentos antes de fallar de forma segura.[^1][^2]

La clave conceptual que conviene adoptar es "todo antes de *Store* es zona no confiable": el flujo completo es *generar → parsear → validar esquema → validar semántica → recién ahí guardar y actuar*. Esto es exactamente lo opuesto a un parche reactivo, porque el validador es una interfaz estándar reutilizable —recibe `{acción, datosParseados}`, devuelve `{status, razón}`— y se aplica igual a `CITA_CONFIRMADA`, `CANCELAR_CITA`, `REAGENDAR_CITA` y `MOSTRAR_SLOTS`, no a cada bug individualmente.[^4][^2]

**Cómo aplicarlo en tu Code node de n8n concretamente:** en lugar de "Verificar Slot" y "neutralizador" como nodos aislados nacidos de B4 y B17, conviene refactorizarlos en un único módulo `validators.js` con una función por acción (`validateCitaConfirmada()`, `validateCancelarCita()`, etc.) que todas comparten la misma firma de entrada/salida. El switch de 6 ramas llama siempre a `validate(accion, payload)` antes de ejecutar el efecto (escribir en DB, responder al usuario). Esto es arquitectura Pipes-and-Filters: los validadores son etapas componibles que se pueden añadir o reordenar sin tocar el resto. Documentar cada validador con el bug que lo originó (B4, B17...) como comentario ayuda a mantener trazabilidad, pero el código debe vivir en la interfaz común desde el día uno de cualquier acción nueva, no después de que explote.[^5]

Un detalle operativo importante para tu caso con LLMs gratuitos: cada validación fallida y cada reintento debe loguearse con el modelo que lo generó (Gemini/Cerebras/Groq) y el tipo de acción. Esto te da, gratis, la base de datos para responder la pregunta 5 (monitoreo de calidad) sin instrumentación adicional.[^3]

## 2. Sincronización con el dashboard: de "fire-and-forget" a idempotencia + reconciliación

Tu problema descrito —el cliente recibe confirmación por WhatsApp pero el dashboard nunca se entera si el webhook falla— es el escenario clásico de **pérdida silenciosa de datos** que toda la literatura de webhooks identifica como el fallo más peligroso, porque "no sabés lo que no sabés". La solución estándar tiene tres capas, no una sola:[^6][^7]

**Capa 1 — Idempotencia.** Cada evento que HTTP Request node envía al dashboard debe llevar un `event_id` único (por ejemplo, hash de `tenant_id + appointment_id + action + timestamp`). El dashboard, antes de procesar, chequea contra una tabla `processed_webhook_events` con índice único en `event_id`; si ya existe, responde 200 sin reprocesar. Esto es indispensable porque el paso 2 (retries) generará entregas duplicadas por diseño.[^8][^9]

**Capa 2 — Retry con backoff exponencial.** Un HTTP Request node de n8n que falla una vez no debería darse por vencido. El patrón estándar es 3-5 reintentos con backoff exponencial + jitter (ej. 2s, 4s, 8s, 16s), y solo después de agotarlos, mover el evento a una cola de fallos. En n8n esto se implementa con el nodo "Retry On Fail" nativo del HTTP Request, o con un sub-workflow que capture el error y reintente vía un nodo Wait + loop, leyendo el header `Retry-After` si el dashboard lo devuelve.[^10][^11][^8]

**Capa 3 — Dead Letter Queue (DLQ) + reconciliación periódica.** Cuando se agotan los reintentos, el evento no se descarta: se guarda en una tabla `webhook_dead_letter` con el payload completo, la razón del fallo, y un timestamp. Sin esto, "los eventos fallidos simplemente se pierden" — es literalmente la frase que usa la documentación de referencia para tu escenario exacto. Además de la DLQ, la práctica recomendada para casos donde el negocio no puede tolerar ninguna pérdida es una **reconciliación periódica**: un job (puede ser un workflow de n8n con Cron Trigger cada 15-30 min) que compare `appointments` en la DB del bot contra el estado reportado por el dashboard, y reenvíe cualquier discrepancia. Esto es exactamente la sugerencia que ya intuiste en tu pregunta, y es la respuesta estándar de la industria, no una idea exótica.[^7][^9][^6][^8]

Tabla resumen de lo que falta hoy vs. el patrón esperado:

| Componente | Tu estado actual | Patrón esperado |
|---|---|---|
| Idempotencia | Ninguna | `event_id` único + tabla de eventos procesados[^8] |
| Retry | Ninguno | Backoff exponencial, 3-5 intentos[^10] |
| Fallos permanentes | Se pierden silenciosamente | Tabla DLQ + alerta[^7] |
| Reconciliación | Ninguna | Job periódico que compara ambas fuentes de verdad[^9] |

Dado que sos un solo dev, no necesitás SQS ni RabbitMQ: una tabla Postgres `webhook_dead_letter` + un workflow n8n de reconciliación cada 15 min cubre el 90% del riesgo con una fracción del esfuerzo de infraestructura dedicada.

## 3. Function calling con tu stack de modelos gratuitos: viable en 2 de 3, no en el tercero

Esto es lo más urgente que verificar, porque cambia la viabilidad de la recomendación anterior de "reemplazar texto libre por JSON estructurado":

| Proveedor | Function calling / tool use | Contexto en tier gratuito | Notas |
|---|---|---|---|
| **Groq (gpt-oss-120b)** | Sí, soportado nativamente[^12][^13] | — | Tool calling y structured outputs confirmados en la documentación del modelo[^12] |
| **Cerebras (gpt-oss-120b)** | Sí, `tools`, `tool_choice`, `parallel_tool_calls`, `strict: true` soportados[^14][^15] | Tier gratuito: 30 req/min, 60k tokens input/min, 1M tokens/día, contexto de 65k tokens (vs 131k en pago)[^16] | Cerebras documenta explícitamente que el modelo "puede alucinar tool calls no especificados" — recomiendan reprompt automático con el mensaje "you're hallucinating a tool call" si detectás una tool call inválida[^16] |
| **Gemini 2.5 Flash-Lite** | Sí, function calling soportado según ficha oficial del modelo[^17] | Free tier: ~15 RPM, ~1,000 RPD, 250k TPM (verificado en múltiples fuentes de 2026, con cierta variación 15-30 RPM según fuente)[^18][^19] | El límite diario de ~1,000 requests es el techo real para tu volumen, no la capacidad de function calling |

**Conclusión concreta:** los tres soportan function calling en su capa gratuita, así que la migración de texto libre (`CITA_CONFIRMADA|servicio|fecha|hora`) a JSON con schema es técnicamente viable en todo tu stack actual sin cambiar de proveedor. Vale la pena el esfuerzo por una razón que va más allá de la elegancia: con `strict: true` en Cerebras/Groq, el modelo queda forzado a `additionalProperties: false`, lo que elimina de raíz buena parte de los bugs de colisión de reglas que mencionás en la Ronda 1, porque el modelo ya no puede "inventar" un formato ligeramente distinto al esperado — el proveedor rechaza la generación si no calza[^15].

Advertencia operativa importante para tu Code node manual (no AI Agent nativo de n8n): tenés que implementar vos mismo el loop de "si `tool_calls` viene en la respuesta, ejecutar la función, devolver el resultado como mensaje `tool` y volver a llamar al modelo" — es un patrón de 2 llamadas por turno, no 1. Esto duplica tu consumo de requests contra el límite diario de Gemini (1,000 RPD), así que si migrás Gemini a function calling, vas a agotar tu cuota gratuita al doble de velocidad; considerá reservar function calling estructurado para Cerebras/Groq (que tienen límites por minuto más generosos, no por día) y mantener Gemini como fallback de texto simple.[^20][^15]

Un riesgo no cubierto en la documentación que vale la pena que sepas: **si activás billing en el proyecto de Google Cloud para subir el límite de Gemini, perdés el tier gratuito completo desde esa misma llamada** — no es un tier superior con más cuota, es facturación desde el primer token. Si algún día necesitás más de 1,000 requests/día de Gemini, la opción más segura es un segundo proyecto de Google Cloud con su propia clave, no habilitar billing en el mismo.[^21]

## 4. Session management: separar "dónde estoy en el flujo" del LLM

El patrón que usan plataformas serias para conversaciones multi-paso es exactamente el que intuiste: **state machine determinística que gobierna el flujo + LLM restringido a NLU (extracción de intención/entidades)**, nunca al revés. La razón de fondo es la misma que en la pregunta 1: el estado de la conversación es un dato crítico para el negocio (si se pierde, el cliente puede terminar sin cita o con una cita duplicada), así que no puede depender de que un modelo probabilístico "recuerde" actualizarlo correctamente en cada turno.[^4][^3]

Aplicado a tu tabla `sessions` en Postgres, la separación de responsabilidades recomendada es:

- **El LLM solo devuelve:** intención detectada + entidades extraídas (servicio, fecha, hora) en el JSON de function calling de la pregunta 3.
- **El código (Code node, no el prompt) decide:** a qué paso pasa la sesión, basado en una tabla de transiciones explícita (ej. `esperando_servicio → esperando_fecha → esperando_hora → confirmando`). Esto es una máquina de estados clásica, con transiciones fijas en código, no en lenguaje natural.
- **La validación post-LLM (pregunta 1) actúa como corrector:** si el LLM devuelve una acción que no es válida para el estado actual de la sesión (ej. intenta confirmar una cita cuando la sesión todavía está en `esperando_fecha`), el validador rechaza la transición y fuerza el estado correcto en la DB, en vez de confiar en que el LLM "se dio cuenta" solo.

Sobre Postgres vs. Redis para las sesiones: dado que ya tenés Postgres funcionando bien para todo el resto del esquema (según ARCHITECTURE.md), no hay urgencia de migrar a Redis solo para esto — Redis brilla cuando necesitás miles de operaciones de lectura/escritura por segundo con TTL nativo de muy baja latencia, que no es tu escala actual con 3-50 negocios. Lo que sí es una omisión real es la limpieza automática: el patrón estándar en Postgres es `pg_cron` con un `cron.schedule()` que corre una `DELETE FROM sessions WHERE expires_at < NOW()` cada hora, y lo mismo para `conversation_history` con su TTL de 2h. Si estás en Supabase, esta extensión ya viene disponible sin instalar nada adicional, sólo se activa. Sin este job, tus tablas crecen indefinidamente con filas "muertas", lo cual eventualmente afecta performance de queries y es una causa silenciosa de degradación que podría explicar parte de por qué el bot "se pierde": si `sessions` acumula basura sin índice eficiente sobre `expires_at`, las lecturas se vuelven más lentas y aumenta la probabilidad de condiciones de carrera entre mensajes consecutivos del mismo usuario.[^22][^23]

## 5. Monitoreo de calidad: pasar de "alerta cuando algo truena" a "detectar cuando algo miente"

Tu distinción entre errores ruidosos (nodo falla, hay excepción) y errores silenciosos (200 OK con contenido incorrecto) es la distinción central de todo el campo de LLM evaluation en producción. La arquitectura de referencia tiene **cuatro capas**, cada una atrapando una clase distinta de fallo:[^24]

1. **Chequeos deterministas** — formato JSON válido, longitud, regex de patrones prohibidos, umbrales de latencia. Esto ya lo tenés parcialmente cubierto si implementás la pregunta 1.
2. **Scoring heurístico** — similitud semántica contra una respuesta de referencia, chequeos de "grounding" factual (¿la hora que menciona el bot existe realmente en la tabla de slots?), consistencia de tono.
3. **LLM-as-judge** — un modelo barato (podría ser el mismo Groq o Gemini) evalúa asincrónicamente una muestra de respuestas contra criterios de corrección/utilidad, sin bloquear la respuesta al usuario.
4. **Revisión humana** — para casos límite y para etiquetar los fallos que las capas anteriores no detectaron.[^24]

Para tu escala (un solo dev, 3-50 negocios), lo más costo-efectivo es implementar la capa 1 (ya cubierta) y agregar un **health check sintético**: un workflow de n8n con Cron Trigger que simula, cada N minutos, una conversación completa de prueba (pedir una cita, confirmar, cancelar) contra una instancia de prueba de Evolution API o directamente inyectando al webhook del bot con datos ficticios, y verifica que la respuesta final calce con lo esperado. Esto es exactamente el patrón de "synthetic monitoring" que usan equipos de SRE para detectar degradación antes de que un cliente real se queje — la clave es que corre continuamente sin depender de tráfico real, así que agarra fallos incluso en horas de baja actividad.

Un dashboard mínimo viable, dado tu volumen de logging ya generado por la validación post-LLM (pregunta 1), sería una tabla simple `validation_failures` agrupada por `accion` y `modelo_llm`, con una vista o query diaria que te muestre tasa de fallo por tipo de acción. No necesitás Grafana ni Datadog para empezar: un query SQL corriendo cada mañana y mandándote un resumen por WhatsApp a vos mismo ya te da visibilidad que hoy no tenés.

## 6. Staging y CI/CD para n8n sin duplicar infraestructura

La mala noticia es que "duplicar el workflow con nombre TEST" es, en efecto, la práctica más frágil posible, y B6 lo demuestra. La buena noticia es que hay un camino intermedio entre eso y levantar una instancia completa de n8n para staging, que es viable para un solo dev con presupuesto limitado.

**Nivel 1 (mínimo, gratis, implementable esta semana):** exportar los workflows como JSON a un repositorio Git, con nombres de archivo descriptivos y mensajes de commit que expliquen qué cambió y por qué — no "Updated workflow". Esto te da rollback en minutos y un historial de cambios, que es lo que hoy no tenés y es la causa raíz de que B6 haya sido difícil de diagnosticar.[^25][^26]

**Nivel 2 (recomendado, bajo costo):** n8n tiene una función nativa de **Source Control** (Settings → Source Control) que conecta directamente con un repo Git y permite hacer push/pull desde la UI sin exportar manualmente. Con una sola instancia de n8n podés simular ambientes usando **credenciales distintas por ambiente** y una rama Git para "estable" y otra para "en pruebas", en vez de duplicar servidores.[^27][^28]

**Nivel 3 (cuando el presupuesto lo permita):** instancia de n8n separada para staging, apuntando a una base de datos de prueba con datos sintéticos (nunca PII real), sincronizada vía el mismo repo Git pero en una rama distinta. La promoción a producción se hace mediante un pull request revisado, no edición directa.[^29][^30][^31]

Sobre testear la lógica de los Code nodes **fuera** de n8n: sí es posible y es lo más práctico para tu escala — el código JavaScript dentro de un Code node de n8n es JavaScript estándar, así que podés extraer las funciones de validación/parseo a archivos `.js` independientes, testearlos con Jest o Node's test runner nativo fuera de n8n, y luego pegarlos dentro del Code node. Esto te da cobertura de test real sin necesitar staging para la lógica pura (parseo de fechas, validación de slots, etc.), reservando el staging solo para probar la integración end-to-end con Evolution API y el LLM.

## 7. Salud de la sesión de WhatsApp en Evolution API: sí hay webhooks, y es crítico activarlos

Este es el hallazgo más urgente de esta ronda para tu operación multi-tenant: Evolution API **sí expone un evento de webhook dedicado a esto**, `CONNECTION_UPDATE`, que dispara cada vez que cambia el estado de la conexión con WhatsApp (`connecting`, `open`, `close`). Si hoy no lo tenés suscrito, es la causa exacta del riesgo que describís ("un negocio que pierde su número por 48h sin que yo me entere").[^32][^33][^34]

Cómo funciona en detalle:

- **Evento `connection.update`** con `state: "close"` incluye un `statusReason` (código HTTP-like) que indica la causa de la desconexión.[^34]
- **Evento `qrcode.updated`** se dispara cuando se genera un nuevo QR que necesita ser escaneado — es la señal de que la instancia requiere intervención humana inmediata.[^32][^34]
- Evolution API maneja **reconexión automática solo para fallos transitorios**; una desconexión por code 401/428 (logout manual o sesión inválida) requiere re-escaneo de QR y no se resuelve solo.[^34]

Recomendación concreta y de bajo esfuerzo: agregar `CONNECTION_UPDATE` y `QRCODE_UPDATED` a la configuración de eventos de webhook de cada instancia (vía `.env` con `WEBHOOK_EVENTS_CONNECTION_UPDATE=true` o vía el endpoint `/webhook/set`), y en tu workflow de n8n, un nodo simple que reciba ese webhook y, si `state === "close"`, te mande una alerta por WhatsApp/Telegram a vos mismo con el nombre del `instance` (que en tu caso mapea a un negocio específico). Esto convierte un fallo invisible durante 48h en una alerta en segundos, y es probablemente el cambio de mayor impacto por esfuerzo de toda esta ronda porque no requiere tocar el prompt, el LLM, ni la arquitectura de n8n — es una línea de configuración en Evolution API más un nodo nuevo.[^32][^34]

## Qué hacer ya vs. qué dejar para cuando escales

| Prioridad | Acción | Esfuerzo | Cuándo |
|---|---|---|---|
| **Crítica, ya** | Suscribir `CONNECTION_UPDATE` + `QRCODE_UPDATED` de Evolution API con alerta propia[^34] | Bajo | Esta semana |
| **Crítica, ya** | Job `pg_cron` de limpieza de `sessions` y `conversation_history`[^22] | Bajo | Esta semana |
| **Alta** | Idempotencia (`event_id`) en los 3 webhooks al dashboard[^8] | Medio | Próximas 2 semanas |
| **Alta** | Extraer validadores post-LLM a módulo único reutilizable por las 4 acciones[^4] | Medio | Próximas 2-3 semanas |
| **Alta** | Retry con backoff en los HTTP Request nodes hacia el dashboard[^10] | Bajo-medio | Junto con idempotencia |
| **Media** | Exportar workflows a Git con Source Control nativo de n8n[^27] | Bajo | Este mes |
| **Media** | Migrar a function calling estructurado en Cerebras/Groq (no Gemini, por límite RPD)[^14][^18] | Alto | Próximo mes, cuando el prompt ya esté modularizado por la validación |
| **Media** | DLQ + reconciliación periódica dashboard↔DB[^9] | Medio | Cuando pases de 3 a ~10 negocios |
| **Baja / diferir** | Rate limiting por tenant con Redis en vez de límite global[^11] | Alto | Cuando pases de ~10-15 negocios, momento en que un tenant ruidoso empieza a afectar a otros |
| **Baja / diferir** | Instancia de staging separada de n8n | Alto | Cuando el costo de una regresión en producción supere el costo de una segunda instancia (aprox. 15-20 negocios) |
| **Baja / diferir** | Health checks sintéticos automatizados (capa 2-4 de monitoreo)[^24] | Medio-alto | Cuando ya tengas la capa 1 (validación) generando suficiente señal de logs |

Nota de transparencia: no fue posible verificar con precisión exacta si tu límite de "50 msg/hora" descrito es una configuración de Evolution API, de n8n, o un límite implícito de la API no oficial de WhatsApp — los tres son plausibles y la fuente exacta depende de dónde está implementado ese contador en tu workflow, algo que solo se puede confirmar revisando el nodo específico que lo aplica. Tampoco fue posible determinar con certeza absoluta el RPM exacto de Gemini 2.5 Flash-Lite porque las fuentes de 2026 varían entre 15 y 30 RPM según la fecha de publicación — para tu planificación, es más seguro asumir el escenario conservador de 15 RPM / 1,000 RPD.[^19][^18]

---

## References

1. [Building a Structured Output Verification Harness for LLM Pipelines](https://codeintel.xyz/blog/structured-output-verification-harness/) - A production architecture for verifying LLM structured outputs using typed validation, self-consiste...

2. [LLM Structured Outputs: Schema Validation for Real Pipelines ...](https://collinwilkins.com/articles/structured-output) - Structured outputs turn LLM text into dependable, validated data. Learn schemas, validation loops, p...

3. [LLM Output Validation Patterns: Structured Outputs, Schema ...](https://www.aisecurityinpractice.com/defend-and-harden/llm-output-validation-patterns/) - A practitioner's guide to validating LLM output with constrained decoding, schema enforcement, conte...

4. [AI Output QA Pipeline Architecture (2026 Guide) - telework.live](https://telework.live/how-to-architect-an-ai-output-qa-pipeline-for-remote-dev-tea) - Architect a microservice AI output QA pipeline with CI hooks to catch hallucinations and formatting ...

5. [Principle:Guardrails ai Guardrails ValidationPipeline - Leeroopedia](https://leeroopedia.com/index.php/Principle:Guardrails_ai_Guardrails_ValidationPipeline)

6. [Webhook Retry Logic and Idempotency: A Developer's Guide](https://webhookify.app/guides/webhook-retry-logic-idempotency)

7. [Resilient Webhooks: Error Handling, Retries, and Dead Letter ...](https://webhookagent.com/resilient-webhooks-error-handling-retries-dead-letter-queues) - A complete guide to production-grade webhook reliability: exponential backoff retry logic, idempoten...

8. [Webhook Retry Policy: Backoff, Idempotency & Dead Letter ...](https://hookray.com/blog/webhook-retry-strategies-2026) - This guide covers the four pillars of a resilient webhook receiver: idempotency, safe retry semantic...

9. [Webhook Reliability 2026: Idempotency & Retry Reference](https://www.digitalapplied.com/blog/webhook-reliability-idempotency-retries-engineering-reference-2026) - Engineering reference for reliable webhook consumers: idempotency keys, retry-with-backoff, dead-let...

10. [Building a Webhook Dead-Letter Queue | Webhook Architecture](https://webhook-architecture.com/resilient-delivery-retry-strategies/dead-letter-queue-architecture/building-a-dead-letter-queue-for-failed-webhooks/) - Build a webhook dead-letter queue on SQS end to end: redrive policy, a backoff-aware dispatcher, an ...

11. [Way to Handle API Rate Limits Across Hundreds of ...](https://community.n8n.io/t/way-to-handle-api-rate-limits-across-hundreds-of-tenants-in-n8n/297734) - Hi everyone, I’m running a multi-tenant n8n platform where each tenant connects to external APIs wit...

12. [Using gpt-oss-120b on GroqCloud — Setup, API, Pricing](https://www.llmreference.com/provider/groq-api/gpt-oss-120b) - How to use gpt-oss-120b on GroqCloud: API setup, quick start, pricing, and capabilities. $0.15/1M in...

13. [Groq | Docker Docs](https://docs.docker.com/ai/docker-agent/providers/groq/) - Use Groq fast-inference models with docker-agent.

14. [Public models - Cerebras Inference](https://inference-docs.cerebras.ai/api-reference/models/public-models)

15. [Tool Calling - Cerebras Inference](https://inference-docs.cerebras.ai/capabilities/tool-use)

16. [OpenAI GPT OSS - Cerebras Inference](https://inference-docs.cerebras.ai/models/openai-oss)

17. [Gemini 2.5 Flash-Lite | Gemini Enterprise Agent Platform](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/2-5-flash-lite) - Gemini 2.5 Flash-Lite is our most balanced Gemini model, optimized for low latency use cases. ... Fu...

18. [Gemini API Free Tier Complete Guide: Rate Limits, Upgrade ...](https://www.aifreeapi.com/en/posts/gemini-api-free-tier-complete-guide) - Gemini 2.5 Flash-Lite which leads the pack with 15 RPM and 1,000 daily requests. All three models sh...

19. [Rate limits | Gemini API - Google AI for Developers](https://ai.google.dev/gemini-api/docs/rate-limits) - Default rate limits are: 0.3x the standard rate limit for each model and tier ... Gemini 2.5 Flash L...

20. [Cerebras - Linkup API Documentation](https://docs.linkup.so/pages/integrations/cerebras)

21. [Gemini API Free Tier Limits 2026: RPM, RPD & TPM by ...](https://usagebox.com/articles/gemini-api-billing-free-tier-confusion) - The 2026 Gemini API free-tier limits by model (RPM, RPD, TPM) - plus the catch the docs bury: enabli...

22. [PostgreSQL Job Scheduling with pg_cron](https://www.javacodegeeks.com/postgresql-job-scheduling-with-pg_cron.html) - How to schedule jobs in postgresql with pg cron: Learn how to schedule jobs in PostgreSQL with pg_cr...

23. [Supabase Cron: Schedule Database Jobs with pg_cron ...](https://cronjobpro.com/blog/supabase-cron) - Schedule database jobs with Supabase pg_cron and trigger Edge Functions on a schedule. Setup, SQL ex...

24. [LLM Evaluation and Testing: How to Build an Eval Pipeline That ...](https://dev.to/pockit_tools/llm-evaluation-and-testing-how-to-build-an-eval-pipeline-that-actually-catches-failures-before-5e3n) - The complete guide to evaluating LLM applications before they break in production. Automated eval fr...

25. [15 best practices for deploying AI agents in production](https://blog.n8n.io/best-practices-for-deploying-ai-agents-in-production/) - This guide walks you through the 15 best n8n practices for deploying production-ready AI Agents. Cho...

26. [Git For Low-Code: How I Finally Got My N8n Workflows Under Version Control By Triumphoid](https://triumphoid.com/low-code-n8n-workflows-version-control/) - I broke a production n8n workflow and had no way to roll back. Here's how I set up Git version contr...

27. [Versioning and Deploying n8n Workflows Across Dev ...](https://community.n8n.io/t/versioning-and-deploying-n8n-workflows-across-dev-staging-and-production/295660?tl=es) - What deployment/versioning workflow has worked best? Any recommended practices for safe releases and...

28. [How do I enable Git version control in n8n and promote workflows across dev/staging/prod environments?](https://codeables.dev/article/how-do-i-enable-git-version-control-in-n8n-and-promote-workflows)

29. [Version control and CI/CD for n8n: Dev to prod without ...](https://lumadock.com/tutorials/n8n-ci-cd-version-control?language=spanish) - Best practice I follow: Never export credentials from prod; In staging and prod create credentials m...

30. [Why Your N8n Git Integration Strategy Needs a Rethink](https://agenticmarketingpro.com/n8n-git-integration/) - What's the best practice for n8n staging to production deployments with Git? Maintain separate n8n i...

31. [n8n Automation CI/CD Pipelines. Version Control, Staging ...](https://n8nlab.io/blog/n8n-workflow-automation-ci-cd-pipelines)

32. [Eventos Suportados](https://doc.evolution-api.com/v2/pt/configuration/webhooks)

33. [Event Types - Laravel Evolution API - lynkbyte.github.io](https://lynkbyte.github.io/laravel-evolution-api/docs/webhooks/events/) - Production-ready Laravel package for Evolution API (WhatsApp messaging)

34. [Connection Management - Evolution API](https://evolutionapi-evolution-api-90.mintlify.app/whatsapp/connections)

