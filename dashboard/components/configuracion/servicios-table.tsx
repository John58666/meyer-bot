'use client'

import { useState, useTransition } from 'react'
import { updateServices } from '@/lib/actions'
import { parseServices } from '@/lib/parse-services'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react'

interface Servicio {
  nombre: string
  precio: number
  duracion: number
}

interface ServiciosTableProps {
  businessId: number
  initialServicesText: string
}

export function ServiciosTable({ businessId, initialServicesText }: ServiciosTableProps) {
  const parsed = parseServices(initialServicesText).map((s, i) => ({
    nombre: s.nombre,
    precio: s.precio,
    duracion: s.duracion ?? 30,
    id: i,
  })) as (Servicio & { id: number })[]

  const [servicios, setServicios] = useState(parsed)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formNombre, setFormNombre] = useState('')
  const [formPrecio, setFormPrecio] = useState('')
  const [formDuracion, setFormDuracion] = useState('30')

  function resetForm() {
    setFormNombre('')
    setFormPrecio('')
    setFormDuracion('30')
    setEditingId(null)
  }

  function openNew() {
    resetForm()
    setSheetOpen(true)
  }

  function openEdit(id: number) {
    const s = servicios.find(x => x.id === id)
    if (!s) return
    setFormNombre(s.nombre)
    setFormPrecio(String(s.precio))
    setFormDuracion(String(s.duracion))
    setEditingId(id)
    setSheetOpen(true)
  }

  function handleSaveForm() {
    if (!formNombre.trim()) { setError('El nombre es obligatorio'); return }
    const precio = parseInt(formPrecio.replace(/\./g, ''))
    if (isNaN(precio) || precio <= 0) { setError('Precio inválido'); return }
    const duracion = parseInt(formDuracion)
    if (isNaN(duracion) || duracion < 5) { setError('Duración mínima 5 minutos'); return }

    setError('')
    if (editingId != null) {
      setServicios(prev => prev.map(s => s.id === editingId ? { ...s, nombre: formNombre.trim(), precio, duracion } : s))
    } else {
      const newId = Math.max(0, ...servicios.map(s => s.id)) + 1
      setServicios(prev => [...prev, { id: newId, nombre: formNombre.trim(), precio, duracion }])
    }
    setSheetOpen(false)
  }

  function handleDelete(id: number) {
    setServicios(prev => prev.filter(s => s.id !== id))
  }

  function handleGuardarTodo() {
    setError('')
    setSaved(false)
    startTransition(async () => {
      const serviciosData = servicios.map(({ id: _id, ...rest }) => rest)
      const result = await updateServices({ businessId, servicios: serviciosData })
      if (result?.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-secondary)]">{servicios.length} servicio{servicios.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openNew} className="rounded-full">
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {servicios.length === 0 ? (
        <div className="text-center py-8 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)]">
          <p className="text-sm text-[var(--text-muted)]">No hay servicios. Agrega el primero.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">Servicio</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">Precio</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">Duración</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {servicios.map(s => (
                <tr key={s.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                  <td className="px-3 py-2.5 text-white font-medium">{s.nombre}</td>
                  <td className="px-3 py-2.5 text-right text-[var(--color-accent)] font-semibold">
                    ${s.precio.toLocaleString('es-CO')}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[var(--text-secondary)]">
                    {s.duracion} min
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(s.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <p className="text-sm text-[var(--color-danger)] flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />{error}
        </p>
      )}

      <button
        onClick={handleGuardarTodo}
        disabled={isPending || servicios.length === 0}
        className={cn(
          'w-full rounded-full h-10 text-sm font-semibold text-white transition-all',
          saved ? 'bg-[var(--color-success)]' : 'bg-[var(--color-accent)] hover:opacity-90',
          (isPending || servicios.length === 0) && 'opacity-50 pointer-events-none',
        )}
      >
        {isPending ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
      </button>

      <Sheet open={sheetOpen} onOpenChange={o => { setSheetOpen(o); if (!o) resetForm() }}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingId != null ? 'Editar servicio' : 'Nuevo servicio'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-6 px-1">
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-secondary)]">Nombre</label>
              <input
                value={formNombre}
                onChange={e => setFormNombre(e.target.value)}
                placeholder="Ej: Corte caballero"
                className="w-full rounded-lg border border-[var(--border-subtle)] px-3 h-10 text-sm bg-[var(--bg-primary)] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-secondary)]">Precio ($)</label>
              <input
                type="number"
                value={formPrecio}
                onChange={e => setFormPrecio(e.target.value)}
                placeholder="18000"
                min="0"
                className="w-full rounded-lg border border-[var(--border-subtle)] px-3 h-10 text-sm bg-[var(--bg-primary)] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[var(--text-secondary)]">Duración (minutos)</label>
              <input
                type="number"
                value={formDuracion}
                onChange={e => setFormDuracion(e.target.value)}
                placeholder="30"
                min="5"
                className="w-full rounded-lg border border-[var(--border-subtle)] px-3 h-10 text-sm bg-[var(--bg-primary)] text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setSheetOpen(false)}
                className="flex-1 rounded-full h-10 text-sm font-semibold border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveForm}
                className="flex-1 rounded-full h-10 text-sm font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 transition-all"
              >
                {editingId != null ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
