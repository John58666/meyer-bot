# B2 — Servicios con nombres parecidos (ambigüedad del LLM)

> Arregla: cuando el cliente dice "corte" y hay múltiples servicios que empiezan con "Corte",
> el bot debe LISTARLOS TODOS y preguntar cuál, no elegir uno arbitrariamente.
> Aplica en: n8n workflow `WhatsApp Bot - Genérico`, nodo `AI Agent`.
> **Estado: ✅ Aplicado en n8n UI y JSON local (2026-07-20)**

---

## Diagnóstico

**Causa raíz:** El prompt tiene dos problemas:

1. **TOLERANCIA A ERRORES ORTOGRÁFICOS** mapea `"corte" = Corte caballero` directamente, sin considerar que hay otros cortes. El LLM usa este mapeo como verdad absoluta.

2. **No hay instrucción de desambiguación.** El paso 1 de AGENDAMIENTO dice "Si el cliente NO ha dicho un servicio específico → LISTA TODOS los servicios", pero no cubre el caso de "dijo un término que coincide con múltiples servicios".

**Ejemplo del bug:**
```
Cliente: "Quiero un corte"
Bot: "Perfecto, un corte caballero"  ← eligió arbitrariamente
# Debería decir: "Tenemos 3 tipos de corte: 
#   1. Corte niño - $20.000
#   2. Corte caballero - $25.000
#   3. Corte dama - $35.000
#   ¿Cuál te gustaría?"
```

---

## Cambio único: nodo `AI Agent` → `jsCode`

### Sección a modificar 1: AGENDAMIENTO paso 1

**Texto actual en el jsCode** (buscar en el código):
```javascript
1. SERVICIO — Si el cliente NO ha dicho un servicio específico:
   → LISTA TODOS los servicios con sus precios (completa, sin truncar)
   → Pregunta cuál le interesa
   → Si YA dijo el servicio → confírmalo y continúa sin preguntar
```

**Texto nuevo** (reemplazar ese bloque):
```javascript
1. SERVICIO — Determina el servicio exacto:
   → Si el cliente NO ha dicho un servicio → LISTA TODOS los servicios con sus precios y pregunta.
   → Si el cliente dijo palabras que coinciden con MÚLTIPLES servicios de la lista
     (ej: "corte" coincide con "Corte niño", "Corte caballero", "Corte dama"):
     - LISTA TODOS los servicios que coinciden, numerados, con sus precios
     - Pregunta: "¿Cuál de estos te gustaría?"
     - Ejemplo: "Tenemos 3 opciones:\n1. Corte niño - $20.000\n2. Corte caballero - $25.000\n3. Corte dama - $35.000\n¿Cuál prefieres?"
   → Si el cliente dijo un servicio EXACTO o claramente identificable
     (ej: "Corte dama", "tinte completo", "manicure"):
     - Confírmalo y continúa sin preguntar de nuevo
   → NUNCA elijas un servicio por defecto cuando hay múltiples opciones que coinciden
```

### Sección a modificar 2: TOLERANCIA A ERRORES ORTOGRÁFICOS — servicios

**Texto actual:**
```
- Servicios: "corte", "cort", "crt" = Corte caballero | "corte dama", "dama", "mujer" = Corte dama | "tint", "tinte", "color" = Tinte completo | "uñas", "unias", "uñitas" = Uñas | "manicur", "manicure", "manikur", "mano" = Manicure + pedicure | "peinado", "peinao", "peinado especial" = Peinado especial
```

**Texto nuevo:**
```
- Servicios: "corte", "cort", "crt" = coincide con CUALQUIER servicio que contenga "Corte" (ej: Corte niño, Corte caballero, Corte dama). APLICA DESAMBIGUACIÓN. | "tint", "tinte", "color" = Tinte completo | "uñas", "unias", "uñitas" = Uñas (si hay múltiples servicios de uñas, desambigua) | "manicur", "manicure", "manikur", "mano" = Manicure + pedicure | "peinado", "peinao", "peinado especial" = Peinado especial
```

> **REGLAS DE DESAMBIGUACIÓN:**
> - Si el término del cliente coincide con MÚLTIPLES servicios → LISTA TODOS los que coinciden, numerados con precios, y pregunta cuál
> - Si el término coincide con UN SOLO servicio → úsalo directamente
> - Los mapeos de sinónimos SON REFERENCIAS, no reglas fijas. "corte" NO es solo "Corte caballero"

---

## Cómo aplicar en n8n UI

1. Ir a n8n → Workflow `WhatsApp Bot - Genérico`
2. Editar nodo **AI Agent**
3. En el campo `jsCode`, buscar las dos secciones indicadas arriba y reemplazar
4. Guardar workflow
5. Probar con: "Quiero un corte" → debe listar todos los cortes disponibles

---

## Cómo revertir

Volver al texto original de las dos secciones (documentado arriba como "Texto actual").
