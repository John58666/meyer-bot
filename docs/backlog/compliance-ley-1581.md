# Compliance Ley 1581 Colombia — meyer-bot

> **Propósito:** Cumplimiento mínimo de protección de datos personales para clientes colombianos.
> **Aplica a:** Meyer (producción), Brayan Study (prueba), cualquier cliente futuro en Colombia.
> **Fecha:** 24 julio 2026

---

## 1. Qué exige la Ley 1581

| Requisito | Descripción | Prioridad |
|-----------|-------------|-----------|
| Aviso de privacidad | Informar al titular qué datos se recogen, para qué, y quién es el responsable | ALTA |
| Consentimiento | Obtener autorización expresa del titular para tratar sus datos | ALTA |
| Derecho al olvido | Permitir que el titular solicite eliminación de sus datos | ALTA |
| Política de tratamiento | Documento interno que describe cómo se manejan los datos | MEDIA |
| Registro SIC | Solo obligatorio si se tienen +10k registros o datos sensibles | BAJA (hoy no aplica) |

---

## 2. Implementación mínima (hacer AHORA)

### En el bot WhatsApp
Agregar al system prompt (B10 ya existe parcialmente):

```
Al inicio de la conversación, cuando el cliente escriba por primera vez:
"Antes de continuar, ¿autorizas el uso de tus datos personales (nombre, teléfono)
para agendar y gestionar tu cita? Puedes solicitar su eliminación en cualquier momento
diciendo 'elimina mis datos'. Responde 'sí' o 'no'."
Si responde "no": "Entendemos. Sin tu autorización no podemos agendar la cita por este medio.
Puedes contactarnos directamente al [teléfono del negocio]. ¡Gracias!"
```

### En el dashboard
Agregar sección en Settings > Privacidad:
- Botón "Solicitar eliminación de datos" para clientes
- Log de consentimientos (fecha, cliente, texto aceptado)

### Opcional — plantilla de política
Usar plantilla gratuita de Cámara de Comercio o SIC.
Guardar en `docs/legal/`.

---

## 3. Qué NO hacer (riesgo)

- No pedir datos sensibles (salud, religión, etc.) sin consentimiento explícito adicional
- No compartir datos con terceros sin autorización
- No guardar datos por más tiempo del necesario (definir política de retención)
- No asumir que el cliente acepta por defecto (opt-in, no opt-out)

---

## 4. Flujo de derecho al olvido

```
Cliente dice "elimina mis datos"
  → Bot responde "Vamos a eliminar tus datos. ¿Confirmas?"
  → Cliente confirma
  → Bot ejecuta: DELETE FROM clients WHERE numero = ? AND business_id = ?
  → Bot responde "Tus datos han sido eliminados. ¡Gracias!"
```

En DB: soft-delete o hard-delete según política. Hard-delete es más seguro legalmente.

---

## 5. Responsable del tratamiento

Johnander Prieto — como operador de la plataforma, es responsable del cumplimiento.

---

## 6. Referencias

- Ley 1581 de 2012 (Colombia)
- Decreto 1377 de 2013 (reglamentario)
- Guía de la SIC para pequeñas empresas
- https://www.sic.gov.co/proteccion-de-datos-personales
