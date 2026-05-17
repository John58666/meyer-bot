# CLAUDE.md — meyer-bot

## Qué es este proyecto
Bot de WhatsApp con IA para Peluquería Meyer.
Stack: n8n + Evolution API + Groq (llama-3.3-70b).
Plataforma SaaS en construcción para negocios locales.

## SEGURIDAD — CRÍTICO
- NUNCA leer, imprimir ni incluir el contenido de `.env` en ningún output
- NUNCA hardcodear API keys, tokens o contraseñas en el código
- Las credenciales van en `.env` — acceder via variables de entorno
- El archivo JSON de Google Cloud va en `secrets/` — nunca en Git
- Antes de cualquier commit, verificar que `.env` y `secrets/` no estén incluidos
- Si necesitas mostrar una key de ejemplo, usa `process.env.NOMBRE_VARIABLE`

## Estructura del proyecto
- Workflows de n8n exportados en `/workflows`
- Documentación en `/docs`
- Credenciales de Google en `/secrets` (ignorado por Git)

## Convenciones
- Commits en español o inglés, formato: tipo: descripción
- Tipos: feat, fix, chore, docs
