# Prompt — Sesión: Aplicar Lazy Loading Slots

Copia esto como primer mensaje de la nueva sesión:

---

Lee `docs/sessions/HANDOFF.md` y `docs/sessions/CURRENT.md`. Esos tienen todo el contexto.

Resumen: ya está construido y validado el `workflow-nuevo.json` con lazy loading de slots (90 días + flujo `MOSTRAR_SLOTS`). Falta:

1. Aplicar el PATCH a la API n8n: `POST /rest/login` → `PUT /rest/workflows/tzFJ9m2pJX1AheI0` con `workflow-nuevo.json` (backoff 429, re-login 401)
2. Sincronizar `workflows/WhatsApp Bot - Genérico restored.json`
3. Verificar E2E: "agendar → 9 de agosto" debe emitir MOSTRAR_SLOTS, mostrar slots y permitir confirmar

Los archivos están en `/var/folders/m0/4xzw4l_n4r37vchrcks277br0000gn/T/opencode/`. Empieza por el paso 1.

---

¿ applied el PATCH a n8n?
