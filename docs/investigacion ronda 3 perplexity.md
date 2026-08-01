📦 ARCHIVADO — Ver workflows/docs/03-INVESTIGACION.md para resumen consolidado.

# Seguridad, organización de código y límites de LLM

## Seguridad de webhooks multi‑tenant

Usar **un solo WEBHOOK_SECRET global** para todos los negocios es el anti‑patrón clásico en sistemas multi‑tenant: si ese secreto se filtra, un atacante puede falsificar eventos para *todos* los tenants a la vez.[web:110][web:111]

Patrón recomendado (aplicable a tu n8n + Next.js + Postgres):

- **Secreto por tenant + HMAC por tenant**  
  - Cada negocio tiene su propio `webhook_signing_secret` almacenado en Postgres (encriptado o al menos hasheado).[web:110][web:115]  
  - El emisor (tu bot) firma el cuerpo *raw* del webhook con `HMAC-SHA256(secret_tenant)` y lo envía en un header (`X-Signature`, `X-WhatsBot-Signature`, etc.).[web:111][web:119]  
  - El dashboard, antes de procesar, recalcula el HMAC con el secreto de *ese* tenant y compara; si no coincide, descarta el evento.[web:111][web:115]

- **Tenant id doblemente verificado**  
  - El payload incluye siempre `tenant_id`.  
  - El dashboard verifica que el `tenant_id` del cuerpo coincide con el tenant asociado al secreto con el que está validando; evita que un atacante reuse un secreto de otro negocio para inyectar eventos cruzados.[web:111]

- **Protección contra replay + rate limiting**  
  - Añadir `timestamp` firmado en el cuerpo y rechazar peticiones donde `now - timestamp > X minutos` (por ejemplo 5 min).[web:115]  
  - Aplicar rate limiting por IP/tenant en el API del dashboard (por middleware de Node, por ejemplo `express-rate-limit`) para evitar floods o intentos de fuerza bruta al endpoint.[web:115][web:119]

- **Rotación de secretos**  
  - Los sistemas de webhooks serios recomiendan rotar periódicamente los secretos y permitir múltiples secretos activos durante la ventana de rotación (old + new) para no romper integraciones.[web:119][web:124]

En tu caso práctico:  
- Añadí columna `webhook_secret` por negocio en la tabla de tenants.  
- Cambiá el Code node que llama al dashboard para que firme el cuerpo por negocio.  
- Cambiá el handler del dashboard para validar HMAC + `tenant_id` antes de tocar la DB.

---

## Organización del código: extraer lógica a un microservicio compartido

Tu situación actual (560 líneas de lógica de negocio dentro de un Code node) te impide:

- Reutilizar lógica entre bot y dashboard.
- Hacer tests unitarios serios.
- Evolucionar la arquitectura sin miedo a romper producción.

Patrón típico en SaaS similares: **monorepo con librería de dominio compartida** y servicios finos alrededor:

```txt
/apps
  /bot-service        # API que n8n invoca (HTTP)
  /dashboard          # Next.js
/packages
  /bot-core           # lógica que ambos comparten
      /validation/    # validadores post-LLM
      /slots/         # cálculo y verificación de slots
      /prompt/        # prompt builder / tool schemas
      /llm/           # client + fallback chain
```

- `bot-core` expone funciones puras: `buildPrompt(...)`, `validateAppointment(...)`, `parseDate(...)`, `selectModel(...)`, etc.  
- El **bot-service** es básicamente un controller HTTP que:  
  - Recibe la request de n8n.  
  - Llama a `bot-core`.  
  - Devuelve JSON al workflow.  
- El **dashboard** puede usar lo mismo para:  
  - Renderizar disponibilidad.  
  - Validar acciones del panel contra las mismas reglas que usa el bot.

Esto evita duplicar lógica (ej. validación de slots) y te permite testear `bot-core` con Jest/Node test runner sin depender de n8n.[web:88]

La alternativa inversa (“el microservicio importa código del dashboard”) no suele ser buena: acopla el backend de bot a Next.js y te obliga a arrastrar dependencias front‑end, mientras que un paquete `bot-core` neutral sirve a ambos lados.[web:88]

---

## Límites reales de los tiers gratuitos y cuándo los agotas

### Límites actuales (2025–2026, intervalo conservador)

- **Gemini 2.5 Flash‑Lite (Google)**  
  - Free tier: ~15 RPM, ~1.000 RPD por proyecto, 250.000 TPM.[web:73][web:69]  
  - El free tier desaparece completamente en ese proyecto si habilitas billing (todos los calls pasan a ser de pago).[web:69][web:130]

- **Cerebras gpt‑oss‑120B**  
  - Free tier (docs oficiales): 30 RPM, 60k tokens/min, 1M tokens/día.[web:97]  
  - Precios producción: ~0,35 USD / 1M tokens input, ~0,75 USD / 1M tokens output.[web:97][web:126][web:133]

- **Groq gpt‑oss‑120B**  
  - Free tier: 30 RPM, 1.000 RPD para gpt‑oss‑120B, 8.000 tokens/min.[web:118][web:123][web:121]  
  - Límite es a nivel organización, no por API key.[web:123]

### ¿Cuántos mensajes/día por negocio?

Como no hay datos públicos específicos de “bots de agendamiento en barberías”, lo único sólido es partir de tus límites agregados:

- Con Gemini y Groq, cada uno te da aprox. **1.000 requests/día** en free tier.[web:73][web:118][web:121]  
- Si distribuyes de forma uniforme entre 3 negocios, son unos **330–400 requests/día por negocio por proveedor** antes de tocar el techo (menos si tienes tráfico de pruebas, errores, etc.).

Cerebras mide por tokens/día: 1M tokens/día.  
- Si cada interacción promedio consume 500 tokens (contexto + respuesta), eso son ~2.000 interacciones/día total, o ~650 por negocio — como ejemplo de cálculo, no como dato real.[web:97]

En la práctica, el primer tier gratuito que vas a agotar suele ser *el que uses como primario* (ej. si tu fallback chain siempre empieza en Gemini, quemarás su RPD antes que los demás), independientemente del número de negocios.

### Coste mensual estimado al pasar a pago (ejemplo de escenario)

Supongamos:

- 100k tokens/día por proveedor (≈3M tokens/mes).
- Reparto aproximado: 70% input, 30% output.

Con los precios actuales:

- **Gemini 2.5 Flash‑Lite (pago)**: ~0,10 USD input + ~0,40 USD output por 1M tokens.[web:132]  
  - 3M tokens/mes → input ~0,30 USD, output ~1,20 USD → **~1,50 USD/mes** en total.  

- **Cerebras gpt‑oss‑120B (pago)**: ~0,35 USD input + ~0,75 USD output por 1M tokens.[web:97][web:126][web:133]  
  - 3M tokens/mes → input ~1,05 USD, output ~2,25 USD → **~3,30 USD/mes**.  

- **Groq gpt‑oss‑120B (pago)**: las fuentes públicas no dan una cifra única y clara para este modelo; el rango típico para modelos grandes está entre ~0,20 y ~0,60 USD/M tokens según análisis externos, pero sin un número oficial es mejor mirar tu consola de Groq para ver el precio exacto antes de estimar tu coste.[web:114][web:123]

Lo importante: incluso multiplicando estos números por 10, sigues hablando de decenas de dólares/mes, no cientos, para un bot de agendamiento de 3–10 negocios. Lo que limita antes es el **RPD/RPM del free tier**, no el coste del tier pago.

---

## Testing de prompts sin staging: evals, A/B y shadow mode

Los equipos que trabajan serio con LLMs no testean prompts “a ojo” en producción; montan un pipeline de evaluación con dataset + métricas.[web:56][web:54]

### 1. Dataset de conversaciones esperadas + evals automatizados

Patrón típico:

- Crear un **dataset de casos**:  
  - Inputs: mensajes reales o sintéticos (“quiero corte el viernes a las 4 pm”).  
  - Outputs esperados: intención + slots (servicio, fecha, hora) y mensajes de confirmación.  
- Ejecutar tu prompt contra ese dataset en modo batch (desde Node, no desde n8n) y medir:  
  - Exact match de JSON estructurado.  
  - Tasa de errores por tipo de acción (agendar, cancelar, etc.).[web:56]

Herramientas/ideas:

- Frameworks de eval que usan el propio LLM como “judge” para puntuar respuestas (corrección, utilidad) sobre un dataset fijo.[web:56]  
- Integrar ese eval en tu CI antes de desplegar: si la nueva versión del prompt baja la puntuación o aumenta la tasa de errores en tu dataset, no se despliega.[web:54][web:56]

### 2. A/B testing de prompts con tráfico real en n8n

Con tu switch actual, puedes montar un A/B simple:

- Dos versiones del prompt (A y B) en tu microservicio.  
- En n8n, un nodo Code que haga random split (ej. `Math.random() < 0.5 ? 'A' : 'B'`) y llame a la versión correspondiente.  
- Logueas por request qué versión se usó y si hubo validación fallida / queja del usuario.

Con eso puedes comparar:

- Tasa de validaciones fallidas post‑LLM por versión de prompt.  
- Métricas de negocio (ej. % de conversaciones que terminan en cita confirmada vs. abandono).[web:56]

### 3. Shadow mode (nuevo prompt en paralelo)

Patrón muy usado para no arriesgar UX:

- Producción sigue respondiendo al usuario con el prompt actual.  
- En paralelo, en background, mandas la misma entrada al “nuevo prompt” y guardas su salida en logs, pero no la envías al usuario.[web:54]  
- Comparas outputs (por eval automatizado o revisión manual) y sólo promueves el nuevo prompt cuando su desempeño es mejor o equivalente.

En n8n esto se puede hacer añadiendo un branch “shadow” que se ejecuta después de la respuesta principal, llama a la versión nueva del microservicio y guarda la respuesta en la DB para análisis offline.
