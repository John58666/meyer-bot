# Prompt Changelog

> Registro de cambios en el system prompt del nodo `AI Agent`.
> Formato: `YYYY-MM-DD: [B#] [descripción]`

## Estructura

| Capa | Variables JS | Propósito |
|------|-------------|-----------|
| 1 | `role`, `saludoInicial`, `instruccionPrincipal` | Identidad del bot, saludo inicial, instrucción principal |
| 2 | `reglaSesionInterna`, `precedenciaGestion`, `seleccionCita`, `cancelarAccion`, `reagendarAccion`, `desambiguacion`, `cambioIntencion`, `reglaDisponibilidad` | Reglas de prioridad y comportamiento crítico |
| 3 | `servicios`, `profesionales`, `horariosAtencion`, `fechaHoy`, `validacionHorario`, `sesionActiva`, `horariosDisponibles` | Datos dinámicos del negocio (contienen `${d.*}` interpolaciones) |
| 4 | `agendamiento` | Flujo completo de agendamiento (6 pasos + confirmación) |
| 5 | `cancelaciones` | Detección de cancelación/reagendamiento y emisión de código |
| 8 | `tolerancia`, `tono` | Tolerancia ortográfica, jerga colombiana, alcance, sinónimos |

## Historial

- `2026-07-20: [B6] Modularización del system prompt`.
  Se reorganizó el template literal monolítico (~900 tokens) en 22 variables con nombre
  agrupadas en 8 capas lógicas y reensambladas con espaciado exacto.
   Output del string: **idéntico** (verificado con diff programático).
   Mejora: editar prompt = encontrar la variable por nombre, no buscar en ~12K chars de texto plano.

- `2026-07-21: [B7] Regla "más horarios" + HORARIOS COMPLETOS`.
  Nueva capa 3.5 (`horariosDisponibles` pasó de capa 3 a capa dedicada).
  Se agregó `disponibilidadCompleta` (todos los slots) en la salida del nodo Code [6].
  Se agregó sección `HORARIOS COMPLETOS` en prompt + regla `INSTRUCCIÓN "MÁS HORARIOS"`.
  Fallback: `${d.disponibilidadCompleta || d.disponibilidad}`.

- `2026-07-21: [B9] Tono colombiano neutro`.
  Sección TONO Y LENGUAJE reescrita con instrucción explícita:
  "español colombiano neutro (usa 'tú' no 'vos')", lista de expresiones colombianas,
  advertencia de NO usar modismos argentinos.
  `recomendás` → `recomiendas`, `¿Querés?` → `¿Quieres?`.

- `2026-07-21: [B10] Protección de datos (Ley 1581 de 2012)`.
  Nueva sección en capa 8: `DATOS PERSONALES (Ley 1581)`.
  Template: `${d.politicaPrivacidadUrl || '[enlace a política de privacidad]'}`.
  Palabras clave: "uso de sus datos", "privacidad", "protección de datos".

- `2026-07-22: [B4+B3] Fix interpretación de hora en reagendamiento + confirmación`.
  Capa 2 (`reagendarAccion`): PASO 3 cambiado — números 1-12 = HORA, NO posición en listado.
  Capa 2 (`reagendarAccion`): Nuevo PASO 4 — confirmación obligatoria antes de REAGENDAR_CITA.
  Capa 4 (`agendamiento`): Paso 5 clarificado — números 1-12 son hora, no posición.
