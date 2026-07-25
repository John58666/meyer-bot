### Task 1: Validar schedule_exceptions en createAppointment

**Files:**
- Modify: `dashboard/lib/actions.ts:22-98`

**Interfaces:**
- Consumes: `schedule_exceptions` table (business_id, fecha, tipo, professional_id)
- Produces: `createAppointment` returns `{ error: "Día bloqueado" }` if blocked

- [ ] **Step 1: Agregar validación en createAppointment**

Buscar la sección `if (!forceOverride)` (línea 49) y agregar después del check de colisiones existente:

```typescript
// Validar que el día no esté bloqueado para este profesional/negocio
if (!forceOverride) {
  const blockParams: (string | number)[] = [businessId, fecha];
  let blockProfCondition: string;
  if (professionalId != null) {
    blockProfCondition = `AND (professional_id = $${blockParams.push(professionalId)} OR professional_id IS NULL)`;
  } else {
    blockProfCondition = 'AND professional_id IS NULL';
  }

  const { rows: bloqueos } = await pool.query(
    `SELECT id, tipo FROM schedule_exceptions
     WHERE business_id = $1 AND fecha = $2 ${blockProfCondition}`,
    blockParams
  );

  for (const b of bloqueos) {
    if (b.tipo === 'cerrado') {
      return { error: 'Este día está bloqueado para el profesional seleccionado' };
    }
    if (b.tipo === 'horario_especial') {
      const { rows: ex } = await pool.query(
        `SELECT hora_inicio, hora_fin FROM schedule_exceptions WHERE id = $1`,
        [b.id]
      );
      if (ex.length > 0) {
        const horaStr = hora.length === 5 ? hora + ':00' : hora;
        if (horaStr < ex[0].hora_inicio!.substring(0, 5) + ':00' || horaStr >= ex[0].hora_fin!.substring(0, 5) + ':00') {
          return { error: 'El horario seleccionado está fuera del horario especial configurado' };
        }
      }
    }
  }
}
```

**Nota:** El `forceOverride` debe seguir saltándose esta validación (para dueños que necesiten forzar).

- [ ] **Step 2: Verificar que getAvailableSlots ya filtra correctamente**

`getAvailableSlots` (línea 1683) ya consulta `schedule_exceptions` correctamente. No modificar.

---

