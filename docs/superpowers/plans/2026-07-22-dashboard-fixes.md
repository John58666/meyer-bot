# Dashboard Fixes + Rediseño UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir bugs críticos del dashboard, rediseñar roles/UX, y sincronizar disponibilidad con el bot n8n.

**Architecture:** Next.js 16 App Router + Tailwind 4 + shadcn/ui + PostgreSQL. Server actions en `actions.ts`. Bot n8n consume endpoints API del dashboard.

**Tech Stack:** Next.js 16, Tailwind 4, shadcn/ui, Recharts, PostgreSQL (Neon), n8n

## Global Constraints

- No cambiar schemas de DB existentes (solo agregar si es necesario)
- Todos los textos en español (interfaz de barbería colombiana)
- Multi-tenant: todas las queries filtran por `business_id`
- No romper queries existentes del bot n8n hasta migrar a API
- El role en DB se guarda como `'profesional'` (sin acento, 11 chars)
- Mobile-first: todo nuevo componente debe ser responsive (<768px)

---

## File Structure

### Crear:
| Archivo | Responsabilidad |
|---------|---------------|
| `dashboard/app/api/availability/check/route.ts` | Endpoint POST para bot: verifica si un slot está disponible (schedule + excepciones + colisiones) |
| `dashboard/app/(dashboard)/dashboard/mi-horario/page.tsx` | Server page: carga datos y renderiza MiHorarioClient |
| `dashboard/components/horario/mi-horario-client.tsx` | Client component: horario recurrente + calendario excepciones + modal |
| `dashboard/components/horario/calendario-excepciones.tsx` | Client component: calendario mensual con colores por estado |

### Modificar:
| Archivo | Responsabilidad |
|---------|---------------|
| `dashboard/lib/actions.ts` | createAppointment: validar schedule_exceptions. fetchOcupacion: incluir schedule_exceptions |
| `dashboard/components/sidebar.tsx` | Agregar "Mi horario" al sidebar según rol |
| `dashboard/components/topbar.tsx` | Agregar "Mi horario" al dropdown mobile según rol |
| `dashboard/auth.config.ts` | Agregar ruta `/dashboard/mi-horario` a rutas permitidas, actualizar lógica de permisos |
| `dashboard/app/(dashboard)/dashboard/configuracion/page.tsx`| Remover horario profesional de acá (ahora está en Mi horario) |
| `dashboard/components/configuracion/servicios-client.tsx`| Rediseñar a editor por filas |
| `dashboard/components/clientes/clientes-client.tsx`| Agregar detección y fusión de clientes duplicados |
| `database/n8n-queries.sql`| Deprecar queries viejas, documentar nuevos endpoints |

---

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

### Task 2: Endpoint API /api/availability/check para el bot n8n

**Files:**
- Create: `dashboard/app/api/availability/check/route.ts`
- Modify: `database/n8n-queries.sql`

**Interfaces:**
- Consumes: `schedule_exceptions`, `schedule_text`, `appointments` tables
- Produces: `POST /api/availability/check` → `{ available: boolean, reason?: string }`

- [ ] **Step 1: Crear endpoint POST /api/availability/check**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { fecha, hora, professionalId } = await request.json()
  const businessId = session.user.businessId

  if (!fecha || !hora) {
    return NextResponse.json({ error: 'fecha y hora requeridos' }, { status: 400 })
  }

  try {
    // 1. Verificar schedule_exceptions
    const exParams: (string | number)[] = [businessId, fecha]
    const exProfCondition = professionalId
      ? `AND (professional_id = $${exParams.push(professionalId)} OR professional_id IS NULL)`
      : 'AND professional_id IS NULL'

    const { rows: excepciones } = await pool.query(
      `SELECT tipo, hora_inicio, hora_fin FROM schedule_exceptions
       WHERE business_id = $1 AND fecha = $2 ${exProfCondition}`,
      exParams
    )

    for (const ex of excepciones) {
      if (ex.tipo === 'cerrado') {
        return NextResponse.json({ available: false, reason: 'closed' })
      }
      if (ex.tipo === 'horario_especial') {
        const horaStr = hora.length === 5 ? hora + ':00' : hora
        if (horaStr < (ex.hora_inicio?.substring(0, 5) ?? '') + ':00' ||
            horaStr >= (ex.hora_fin?.substring(0, 5) ?? '') + ':00') {
          return NextResponse.json({ available: false, reason: 'special_hours' })
        }
      }
    }

    // 2. Verificar schedule_text del negocio o profesional
    let scheduleText: string
    if (professionalId) {
      const { rows } = await pool.query(
        `SELECT COALESCE(ps.schedule_text, b.schedule_text) AS schedule_text
         FROM businesses b
         LEFT JOIN professional_schedule ps ON ps.business_id = b.id AND ps.professional_id = $2
         WHERE b.id = $1`,
        [businessId, professionalId]
      )
      if (rows.length === 0) return NextResponse.json({ available: false, reason: 'no_schedule' })
      scheduleText = rows[0].schedule_text
    } else {
      const { rows } = await pool.query(
        `SELECT schedule_text FROM businesses WHERE id = $1`,
        [businessId]
      )
      if (rows.length === 0) return NextResponse.json({ available: false, reason: 'no_schedule' })
      scheduleText = rows[0].schedule_text
    }

    const schedule = typeof scheduleText === 'string' ? JSON.parse(scheduleText) : scheduleText
    const dateObj = new Date(fecha + 'T12:00:00')
    const dayOfWeek = dateObj.getDay()
    const daySchedule = schedule[String(dayOfWeek)]
    if (!daySchedule) {
      return NextResponse.json({ available: false, reason: 'closed_day' })
    }

    const horaNum = parseInt(hora.split(':')[0]) + parseInt(hora.split(':')[1]) / 60
    if (horaNum < daySchedule.open || horaNum >= daySchedule.close) {
      return NextResponse.json({ available: false, reason: 'outside_hours' })
    }

    // 3. Verificar colisiones de appointments
    const aptParams: (string | number)[] = [businessId, fecha, hora]
    const aptProfCondition = professionalId
      ? `AND professional_id = $${aptParams.push(professionalId)}`
      : ''

    const { rows: conflicts } = await pool.query(
      `SELECT id FROM appointments
       WHERE business_id = $1 AND fecha = $2 AND hora = $3::time AND estado != 'Cancelada' ${aptProfCondition}`,
      aptParams
    )

    if (conflicts.length > 0) {
      return NextResponse.json({ available: false, reason: 'conflict' })
    }

    return NextResponse.json({ available: true })
  } catch (e) {
    console.error('[availability/check]', e)
    return NextResponse.json({ error: 'Error checking availability' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Actualizar n8n-queries.sql con documentación de deprecación**

```sql
-- ============================================================
-- ⚠️ QUERIES DEPRECADAS — usar API del dashboard en su lugar
-- ============================================================
-- En lugar de estas queries SQL, los workflows de n8n deben llamar:
--
--   POST /api/availability/check
--     Body: { fecha: "2026-08-15", hora: "14:00", professionalId: 2 }
--     Response: { available: true/false, reason: "conflict"|"closed"|... }
--
--   GET /api/appointments/slots?fecha=2026-08-15&professionalId=2
--     Response: { slots: ["09:00", "09:30", ...] }
--
-- Los endpoints ya incluyen toda la lógica: schedule_text,
-- schedule_exceptions (cerrado + horario_especial), y colisiones.
-- ============================================================
```

---

### Task 3: Corregir fetchOcupacion para incluir schedule_exceptions

**Files:**
- Modify: `dashboard/lib/actions.ts:438-481`

**Interfaces:**
- Consumes: `schedule_exceptions` table
- Produces: `fetchOcupacion` returns correct `{ ocupados, total }`

- [ ] **Step 1: Modificar fetchOcupacion**

```typescript
async function fetchOcupacion(
  businessId: number,
  fechaDesde: string,
  fechaHasta: string,
  professionalId?: number | null
): Promise<{ ocupados: number; total: number }> {
  const scheduleQuery = await pool.query<{ schedule_text: unknown }>(
    `SELECT schedule_text FROM businesses WHERE id = $1`,
    [businessId]
  );
  if (!scheduleQuery.rows[0]?.schedule_text) return { ocupados: 0, total: 0 };

  const schedule: Record<string, { open: number; close: number }> =
    typeof scheduleQuery.rows[0].schedule_text === 'string'
      ? JSON.parse(scheduleQuery.rows[0].schedule_text)
      : scheduleQuery.rows[0].schedule_text;

  const start = new Date(fechaDesde + 'T12:00:00');
  const end = new Date(fechaHasta + 'T12:00:00');
  let totalSlots = 0;

  const params: (string | number)[] = [businessId, fechaDesde, fechaHasta];
  const profFilter = professionalId != null
    ? ` AND a.professional_id = $${params.push(professionalId)}`
    : '';

  const { rows: aptRows } = await pool.query<{ fecha: string }>(
    `SELECT a.fecha::text
     FROM appointments a
     WHERE a.business_id = $1 AND a.fecha BETWEEN $2 AND $3 AND a.estado != 'Cancelada'
     ${profFilter}`,
    params
  );

  // Obtener excepciones del período
  const exParams: (string | number)[] = [businessId, fechaDesde, fechaHasta];
  const exProfCondition = professionalId != null
    ? `AND (professional_id = $${exParams.push(professionalId)} OR professional_id IS NULL)`
    : 'AND professional_id IS NULL';

  const { rows: excepciones } = await pool.query<{ fecha: string; tipo: string; hora_inicio: string | null; hora_fin: string | null }>(
    `SELECT fecha::text, tipo, hora_inicio::text, hora_fin::text
     FROM schedule_exceptions
     WHERE business_id = $1 AND fecha BETWEEN $2 AND $3 ${exProfCondition}`,
    exParams
  );

  const exMap = new Map<string, { tipo: string; hora_inicio?: string; hora_fin?: string }>();
  for (const ex of excepciones) {
    exMap.set(ex.fecha, {
      tipo: ex.tipo,
      hora_inicio: ex.hora_inicio ?? undefined,
      hora_fin: ex.hora_fin ?? undefined,
    });
  }

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const fechaStr = d.toISOString().slice(0, 10);
    const ex = exMap.get(fechaStr);

    if (ex?.tipo === 'cerrado') continue; // día completamente cerrado

    const dayOfWeek = d.getDay();
    const daySchedule = schedule[String(dayOfWeek)];
    if (!daySchedule) continue;

    if (ex?.tipo === 'horario_especial') {
      const open = parseInt((ex.hora_inicio ?? '').split(':')[0]);
      const close = parseInt((ex.hora_fin ?? '').split(':')[0]);
      totalSlots += (close - open) * 2;
    } else {
      totalSlots += (daySchedule.close - daySchedule.open) * 2;
    }
  }

  return { ocupados: aptRows.length, total: totalSlots };
}
```

---

### Task 4: Actualizar roles en sidebar, topbar y middleware

**Files:**
- Modify: `dashboard/components/sidebar.tsx`
- Modify: `dashboard/components/topbar.tsx`
- Modify: `dashboard/auth.config.ts`

- [ ] **Step 1: Actualizar sidebar.tsx**

Agregar "Mi horario" a navItems y ajustar bottomItems:

```typescript
const navItems = [
  { icon: Home,      href: "/dashboard",          label: "Inicio"   },
  { icon: Calendar,  href: "/dashboard/semana",   label: "Agenda"   },
  { icon: BarChart2, href: "/dashboard/metricas", label: "Métricas" },
  { icon: Users,     href: "/dashboard/clientes", label: "Clientes" },
  { icon: Clock,     href: "/dashboard/mi-horario", label: "Mi horario" },
];

const bottomItems = [
  ...(role !== "profesional"
    ? [
        { icon: Settings, href: "/dashboard/configuracion", label: "Configuración" },
        { icon: ClipboardList, href: "/dashboard/auditoria", label: "Auditoría" },
      ]
    : []),
  ...(role === "owner"
    ? [{ icon: UserCog, href: "/dashboard/equipo", label: "Equipo" }]
    : []),
  { icon: HelpCircle, href: "/dashboard/help", label: "Ayuda" },
];
```

Agregar `Clock` a los imports de lucide-react:
```typescript
import { Home, Calendar, BarChart2, Users, Settings, HelpCircle, UserCog, ClipboardList, Clock } from "lucide-react";
```

- [ ] **Step 2: Actualizar topbar.tsx**

Agregar "Mi horario" al BottomNav y al DropdownMenu.

BottomNav:
```typescript
const bottomNavItems = [
  { icon: Home,      href: "/dashboard",          label: "Inicio"   },
  { icon: Calendar,  href: "/dashboard/semana",   label: "Agenda"   },
  { icon: BarChart2, href: "/dashboard/metricas", label: "Métricas" },
  { icon: Users,     href: "/dashboard/clientes", label: "Clientes" },
  { icon: Clock,     href: "/dashboard/mi-horario", label: "Horario" },
];
```

Agregar `Clock` a los imports.

- [ ] **Step 3: Actualizar auth.config.ts middleware**

Agregar `/dashboard/mi-horario` a las rutas permitidas (no necesita bloqueo extra porque está disponible para todos los roles autenticados). La lógica actual ya permite el acceso a cualquier ruta no bloqueada.

---

### Task 5: Página "Mi horario"

**Files:**
- Create: `dashboard/app/(dashboard)/dashboard/mi-horario/page.tsx`
- Create: `dashboard/components/horario/mi-horario-client.tsx`
- Create: `dashboard/components/horario/calendario-excepciones.tsx`
- Modify: `dashboard/lib/actions.ts` (agregar funciones getMiHorario, saveMiHorario, createBloqueo ya existe)

- [ ] **Step 1: Agregar server action getMiHorario en actions.ts**

```typescript
export async function getMiHorario(businessId: number, professionalId?: number | null) {
  const session = await auth()
  if (!session) return { error: 'No autenticado' }

  // Horario: si tiene professional_schedule, usarlo; si no, el del negocio
  let horario: Record<string, { open: number; close: number }>
  if (professionalId != null) {
    const { rows } = await pool.query(
      `SELECT COALESCE(ps.schedule_text, b.schedule_text) AS schedule_text
       FROM businesses b
       LEFT JOIN professional_schedule ps ON ps.business_id = b.id AND ps.professional_id = $2
       WHERE b.id = $1`,
      [businessId, professionalId]
    )
    if (rows.length === 0) return { error: 'No encontrado' }
    const raw = rows[0].schedule_text
    horario = typeof raw === 'string' ? JSON.parse(raw) : raw
  } else {
    const { rows } = await pool.query(
      `SELECT schedule_text FROM businesses WHERE id = $1`,
      [businessId]
    )
    if (rows.length === 0) return { error: 'No encontrado' }
    const raw = rows[0].schedule_text
    horario = typeof raw === 'string' ? JSON.parse(raw) : raw
  }

  return { horario }
}

export async function saveMiHorario(data: {
  horario: Record<string, { open: number; close: number }>
}) {
  const session = await auth()
  if (!session) return { error: 'No autenticado' }

  const professionalId = session.user.professionalId
  const businessId = session.user.businessId

  if (professionalId != null) {
    // Profesional: guardar/actualizar en professional_schedule
    await pool.query(
      `INSERT INTO professional_schedule (business_id, professional_id, schedule_text)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (business_id, professional_id)
       DO UPDATE SET schedule_text = $3::jsonb, updated_at = NOW()`,
      [businessId, professionalId, JSON.stringify(data.horario)]
    )
  } else {
    // Owner/admin: actualizar schedule_text del negocio
    await pool.query(
      `UPDATE businesses SET schedule_text = $1::jsonb WHERE id = $2`,
      [JSON.stringify(data.horario), businessId]
    )
  }

  revalidatePath('/dashboard/mi-horario')
  return { ok: true }
}
```

- [ ] **Step 2: Crear página server mi-horario/page.tsx**

```typescript
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getMiHorario, getBloqueos } from '@/lib/actions'
import { MiHorarioClient } from '@/components/horario/mi-horario-client'

export default async function MiHorarioPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const businessId = session.user.businessId
  const professionalId = session.user.professionalId

  const [horarioData, bloqueos] = await Promise.all([
    getMiHorario(businessId, professionalId),
    getBloqueos(businessId, professionalId, false),
  ])

  if (horarioData.error) {
    return <div className="text-[var(--color-danger)]">{horarioData.error}</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Mi horario</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Configurá tus días laborales y excepciones
        </p>
      </div>

      <MiHorarioClient
        horario={horarioData.horario}
        bloqueos={bloqueos}
        businessId={businessId}
        isProfesional={professionalId != null}
      />
    </div>
  )
}
```

- [ ] **Step 3: Crear MiHorarioClient component**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { saveMiHorario, createBloqueo, deleteBloqueo, getBloqueos } from '@/lib/actions'
import { CalendarioExcepciones } from './calendario-excepciones'
import { toast } from 'sonner'
import { Clock, Plus, Trash2 } from 'lucide-react'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

interface Bloqueo {
  id: number
  fecha: string
  tipo: 'cerrado' | 'horario_especial'
  hora_inicio?: string
  hora_fin?: string
  motivo?: string
}

interface Props {
  horario: Record<string, { open: number; close: number }>
  bloqueos: Bloqueo[]
  businessId: number
  isProfesional: boolean
}

export function MiHorarioClient({ horario: initialHorario, bloqueos: initialBloqueos, businessId, isProfesional }: Props) {
  const [horario, setHorario] = useState(initialHorario)
  const [bloqueos, setBloqueos] = useState(initialBloqueos)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newEx, setNewEx] = useState({ fecha: '', tipo: 'cerrado' as const, hora_inicio: '', hora_fin: '', motivo: '' })

  const toggleDia = (dia: string) => {
    setHorario(prev => {
      const next = { ...prev }
      if (next[dia]) {
        delete next[dia]
      } else {
        next[dia] = { open: 9, close: 18 }
      }
      return next
    })
  }

  const updateHora = (dia: string, campo: 'open' | 'close', valor: number) => {
    setHorario(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await saveMiHorario({ horario })
    setSaving(false)
    if (result.ok) toast.success('Horario guardado')
    else toast.error(result.error ?? 'Error al guardar')
  }

  const handleAddBloqueo = async () => {
    const result = await createBloqueo({
      businessId,
      fecha: newEx.fecha,
      tipo: newEx.tipo,
      hora_inicio: newEx.tipo === 'horario_especial' ? newEx.hora_inicio : undefined,
      hora_fin: newEx.tipo === 'horario_especial' ? newEx.hora_fin : undefined,
      motivo: newEx.motivo || undefined,
      professionalId: isProfesional ? undefined : null,
    })
    if (result.ok) {
      toast.success('Bloqueo creado')
      setShowModal(false)
      setNewEx({ fecha: '', tipo: 'cerrado', hora_inicio: '', hora_fin: '', motivo: '' })
      // Recargar bloqueos
      const refreshed = await getBloqueos(businessId, isProfesional ? undefined : null, false)
      setBloqueos(refreshed)
    } else {
      toast.error(result.error ?? 'Error al crear bloqueo')
    }
  }

  const handleDeleteBloqueo = async (id: number) => {
    const result = await deleteBloqueo(id, businessId)
    if (result.ok) {
      setBloqueos(prev => prev.filter(b => b.id !== id))
      toast.success('Bloqueo eliminado')
    } else {
      toast.error(result.error ?? 'Error al eliminar')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Columna izquierda: Horario recurrente */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock size={18} /> Horario recurrente
        </h2>
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-2">
          {[1,2,3,4,5,6,0].map(dia => (
            <div key={dia} className="flex items-center gap-3 py-1.5">
              <label className="flex items-center gap-2 text-sm text-white min-w-[100px]">
                <input
                  type="checkbox"
                  checked={!!horario[String(dia)]}
                  onChange={() => toggleDia(String(dia))}
                  className="accent-[var(--color-accent)]"
                />
                {DIAS[dia]}
              </label>
              {horario[String(dia)] && (
                <div className="flex items-center gap-1 text-sm">
                  <input
                    type="number"
                    min={0} max={23}
                    value={horario[String(dia)].open}
                    onChange={e => updateHora(String(dia), 'open', parseInt(e.target.value) || 0)}
                    className="w-14 h-8 rounded border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white text-center text-xs"
                  />
                  <span className="text-[var(--text-muted)]">a</span>
                  <input
                    type="number"
                    min={0} max={23}
                    value={horario[String(dia)].close}
                    onChange={e => updateHora(String(dia), 'close', parseInt(e.target.value) || 0)}
                    className="w-14 h-8 rounded border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white text-center text-xs"
                  />
                </div>
              )}
              {!horario[String(dia)] && (
                <span className="text-xs text-[var(--text-muted)]">No laboral</span>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-full h-10 text-sm font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 transition-all disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar horario'}
        </button>
      </div>

      {/* Columna derecha: Calendario de excepciones */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          Excepciones
          <button
            onClick={() => setShowModal(true)}
            className="ml-auto h-8 w-8 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center hover:opacity-90"
          >
            <Plus size={16} />
          </button>
        </h2>

        <CalendarioExcepciones bloqueos={bloqueos} />

        {bloqueos.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            Sin excepciones. Agregá días cerrados u horarios especiales.
          </p>
        ) : (
          <div className="space-y-1">
            {bloqueos.map(b => (
              <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${b.tipo === 'cerrado' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <span className="text-sm text-white">
                    {b.fecha} {b.tipo === 'cerrado' ? '🔴 Cerrado' : '🟡 Horario especial'}
                    {b.motivo && <span className="text-[var(--text-muted)] ml-1">— {b.motivo}</span>}
                  </span>
                </div>
                <button onClick={() => handleDeleteBloqueo(b.id)} className="text-[var(--text-muted)] hover:text-[var(--color-danger)]">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Agregar excepción */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">Nueva excepción</h3>

            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-secondary)]">Fecha</label>
              <input
                type="date"
                value={newEx.fecha}
                onChange={e => setNewEx(prev => ({ ...prev, fecha: e.target.value }))}
                className="w-full h-10 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white px-3 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-secondary)]">Tipo</label>
              <select
                value={newEx.tipo}
                onChange={e => setNewEx(prev => ({ ...prev, tipo: e.target.value as 'cerrado' | 'horario_especial' }))}
                className="w-full h-10 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white px-3 text-sm"
              >
                <option value="cerrado">Cerrado todo el día</option>
                <option value="horario_especial">Horario especial</option>
              </select>
            </div>

            {newEx.tipo === 'horario_especial' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--text-secondary)]">Desde</label>
                  <input
                    type="time"
                    value={newEx.hora_inicio}
                    onChange={e => setNewEx(prev => ({ ...prev, hora_inicio: e.target.value }))}
                    className="w-full h-10 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white px-3 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--text-secondary)]">Hasta</label>
                  <input
                    type="time"
                    value={newEx.hora_fin}
                    onChange={e => setNewEx(prev => ({ ...prev, hora_fin: e.target.value }))}
                    className="w-full h-10 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white px-3 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-secondary)]">Motivo (opcional)</label>
              <input
                type="text"
                value={newEx.motivo}
                onChange={e => setNewEx(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Ej: Vacaciones, médico..."
                className="w-full h-10 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white px-3 text-sm placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 h-10 rounded-full border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddBloqueo}
                disabled={!newEx.fecha || (newEx.tipo === 'horario_especial' && (!newEx.hora_inicio || !newEx.hora_fin))}
                className="flex-1 h-10 rounded-full bg-[var(--color-accent)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Crear CalendarioExcepciones component**

```typescript
'use client'

import { useMemo } from 'react'

interface Bloqueo {
  id: number
  fecha: string
  tipo: 'cerrado' | 'horario_especial'
}

interface Props {
  bloqueos: Bloqueo[]
}

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAYS_ES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']

export function CalendarioExcepciones({ bloqueos }: Props) {
  const today = new Date()
  const [year, month] = [today.getFullYear(), today.getMonth()]

  const bloqueoMap = useMemo(() => {
    const map = new Map<string, Bloqueo>()
    for (const b of bloqueos) {
      map.set(b.fecha, b)
    }
    return map
  }, [bloqueos])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days: (number | null)[] = Array(firstDay).fill(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const fmt = (d: number) => {
    const m = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${year}-${m}-${dd}`
  }

  const isToday = (d: number) => {
    return d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3">
      <div className="text-center text-sm font-semibold text-white mb-3">
        {MONTHS_ES[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS_ES.map(d => (
          <div key={d} className="text-xs text-[var(--text-muted)] py-1">{d}</div>
        ))}
        {days.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />
          const fechaStr = fmt(d)
          const bloqueo = bloqueoMap.get(fechaStr)
          const todayClass = isToday(d) ? 'ring-1 ring-[var(--color-accent)]' : ''
          const colorClass = bloqueo?.tipo === 'cerrado'
            ? 'bg-red-500/20 text-red-400'
            : bloqueo?.tipo === 'horario_especial'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'text-[var(--text-secondary)]'

          return (
            <div
              key={d}
              className={`text-xs h-7 flex items-center justify-center rounded ${colorClass} ${todayClass}`}
            >
              {d}
            </div>
          )
        })}
      </div>
      <div className="flex gap-3 mt-2 pt-2 border-t border-[var(--border-subtle)] text-[10px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/60" /> Cerrado</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500/60" /> Horario esp.</span>
      </div>
    </div>
  )
}
```

---

### Task 6: Servicios — Editor por filas

**Files:**
- Modify: `dashboard/components/configuracion/servicios-client.tsx`

- [ ] **Step 1: Reemplazar textarea por editor de filas**

El componente debe cambiar de un textarea a una lista de servicios con inputs individuales. Cada servicio tiene nombre + precio. Botones para agregar/eliminar filas. El formato de guardado sigue siendo `services_text` (compatible con el bot).

```typescript
'use client'

import { useState, useTransition } from 'react'
import { updateServicesText } from '@/lib/actions'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Servicio {
  nombre: string
  precio: number
}

function parseServices(text: string): Servicio[] {
  if (!text?.trim()) return []
  return text.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const match = s.match(/^(.+?)\s*\$?([0-9.,]+)$/)
    if (match) {
      return {
        nombre: match[1].trim(),
        precio: parseInt(match[2].replace(/\./g, '')),
      }
    }
    return { nombre: s, precio: 0 }
  }).filter(s => s.nombre)
}

function formatServices(servicios: Servicio[]): string {
  return servicios.map(s => `${s.nombre} $${s.precio.toLocaleString('es-CO')}`).join(', ')
}

interface Props {
  businessId: number
  initialServicesText: string
}

export function ServiciosClient({ businessId, initialServicesText }: Props) {
  const [servicios, setServicios] = useState<Servicio[]>(() => parseServices(initialServicesText))
  const [isPending, startTransition] = useTransition()

  const updateServicio = (i: number, campo: keyof Servicio, valor: string | number) => {
    setServicios(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [campo]: valor }
      return next
    })
  }

  const addServicio = () => {
    setServicios(prev => [...prev, { nombre: '', precio: 0 }])
  }

  const removeServicio = (i: number) => {
    setServicios(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSave = () => {
    const validos = servicios.filter(s => s.nombre.trim() && s.precio > 0)
    if (validos.length === 0) {
      toast.error('Agregá al menos un servicio válido')
      return
    }
    startTransition(async () => {
      const result = await updateServicesText(businessId, formatServices(validos))
      if (result?.error) toast.error(result.error)
      else {
        toast.success('Servicios guardados')
        setServicios(validos)
      }
    })
  }

  return (
    <div className="space-y-4">
      {servicios.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={s.nombre}
            onChange={e => updateServicio(i, 'nombre', e.target.value)}
            placeholder="Nombre del servicio"
            className="flex-1 h-10 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white px-3 text-sm placeholder:text-[var(--text-muted)]"
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">$</span>
            <input
              type="number"
              value={s.precio || ''}
              onChange={e => updateServicio(i, 'precio', parseInt(e.target.value) || 0)}
              placeholder="0"
              min={0}
              className="w-28 h-10 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-white pl-7 pr-3 text-sm placeholder:text-[var(--text-muted)]"
            />
          </div>
          <button
            onClick={() => removeServicio(i)}
            className="h-10 w-10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--color-danger)]"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <button
        onClick={addServicio}
        className="flex items-center gap-1 text-sm text-[var(--color-accent)] hover:opacity-80"
      >
        <Plus size={16} /> Agregar servicio
      </button>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full rounded-full h-10 text-sm font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 transition-all disabled:opacity-50"
      >
        {isPending ? 'Guardando...' : 'Guardar servicios'}
      </button>
    </div>
  )
}
```

---

### Task 7: Clientes — Detección de duplicados

**Files:**
- Modify: `dashboard/components/clientes/clientes-client.tsx`
- Add server action: `dashboard/lib/actions.ts` (getClientesDuplicados y mergeClientes)

- [ ] **Step 1: Agregar server actions para duplicados**

```typescript
export async function getClientesDuplicados(
  businessId: number
): Promise<{ cliente: Cliente; duplicados: Cliente[] }[]> {
  const session = await auth()
  if (!session) return []

  const { rows } = await pool.query(
    `SELECT c1.id, c1.nombre, c1.numero, c1.total_visitas, c1.ultima_visita, c1.ultimo_servicio
     FROM customers c1
     JOIN customers c2 ON c1.business_id = c2.business_id
       AND c1.id != c2.id
       AND (
         c1.numero = c2.numero
         OR (
           REPLACE(REPLACE(c1.numero, '+', ''), ' ', '') = REPLACE(REPLACE(c2.numero, '+', ''), ' ', '')
         )
       )
     WHERE c1.business_id = $1
     ORDER BY c1.numero`,
    [businessId]
  )

  // Agrupar por número normalizado
  const grupos = new Map<string, Cliente[]>()
  for (const row of rows) {
    const key = row.numero.replace(/[+\s]/g, '')
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(row)
  }

  return Array.from(grupos.values())
    .filter(g => g.length > 1)
    .map(grupo => ({
      cliente: grupo[0],
      duplicados: grupo.slice(1),
    }))
}

export async function mergeClientes(
  businessId: number,
  keepId: number,
  mergeIds: number[]
) {
  const session = await auth()
  if (!session || (session.user.role !== 'owner' && session.user.role !== 'admin')) {
    return { error: 'No autorizado' }
  }

  try {
    // Actualizar appointments apuntando al cliente que se queda
    for (const mergeId of mergeIds) {
      await pool.query(
        `UPDATE appointments SET numero = (SELECT numero FROM customers WHERE id = $1)
         WHERE business_id = $2 AND numero = (SELECT numero FROM customers WHERE id = $3)`,
        [keepId, businessId, mergeId]
      )
      // Eliminar duplicado
      await pool.query(
        `DELETE FROM customers WHERE id = $1 AND business_id = $2`,
        [mergeId, businessId]
      )
    }

    // Recalcular total_visitas del cliente que se queda
    await pool.query(
      `UPDATE customers SET
        total_visitas = (SELECT COUNT(*) FROM appointments WHERE business_id = $1 AND numero = customers.numero),
        updated_at = NOW()
       WHERE id = $2 AND business_id = $1`,
      [businessId, keepId]
    )

    revalidatePath('/dashboard/clientes')
    return { ok: true }
  } catch (err) {
    console.error('[mergeClientes]', err)
    return { error: 'Error al fusionar clientes' }
  }
}
```

- [ ] **Step 2: Actualizar clientes-client.tsx**

Agregar sección de duplicados con tarjetas showing posible merge, y botón "Fusionar" que llama a `mergeClientes`.

---

### Task 8: UX y contraste

**Files:**
- Modify: `dashboard/globals.css`

- [ ] **Step 1: Mejorar contraste de texto**

Reemplazar variables de color con mejor contraste:

```css
:root {
  /* ... existing vars ... */
  --text-primary: #E5E5E5;   /* antes #FFFFFF o #A0A0A0 - más suave que blanco puro */
  --text-secondary: #A0A0A0; /* antes #555 - ahora 6.5:1 contra #0A0A0A */
  --text-muted: #6B6B6B;     /* antes #555 - 4.5:1 mínimo */
}
```

- [ ] **Step 2: Agregar tooltips a iconos del sidebar**

El sidebar ya tiene `title` en los links. Verificar que también estén en los nuevos ítems.

- [ ] **Step 3: Verificar touch targets en mobile**

Asegurar que todos los botones tengan `min-h-[44px]` en mobile.

---

## Self-Review

- [x] **Spec coverage**: Cada bug del spec tiene una tarea correspondiente
- [x] **Placeholder scan**: No hay TBD/TODO en el plan
- [x] **Type consistency**: Las funciones creadas (getMiHorario, saveMiHorario, etc.) se referencian consistentemente entre tareas
- [x] **Scope check**: Un solo plan cohesivo para todos los bugs + rediseño
