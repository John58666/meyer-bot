'use client'

import { useState, useTransition } from 'react'
import { updateServicesText } from '@/lib/actions'
import { parseServices } from '@/lib/parse-services'
import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface ServiciosClientProps {
  businessId: number
  initialServicesText: string
}

export function ServiciosClient({ businessId, initialServicesText }: ServiciosClientProps) {
  const [text, setText] = useState(initialServicesText)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const preview = parseServices(text)
  const entries = text.split(',').map(s => s.trim()).filter(Boolean)
  const invalidEntries = entries.filter(e => !e.match(/^.+\s*\$[0-9.,]+$/))
  const hasErrors = invalidEntries.length > 0

  function handleSave() {
    setError('')
    setSaved(false)
    startTransition(async () => {
      const result = await updateServicesText(businessId, text)
      if (result?.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Instrucciones */}
      <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)] px-4 py-3">
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Formato: <code className="text-[var(--color-accent)]">Nombre $precio</code> separados por coma.<br />
          Ejemplo: <code className="text-[var(--text-muted)]">Corte caballero $18.000, Barba $10.000, Corte+barba $22.000</code>
        </p>
      </div>

      {/* Textarea */}
      <div className="space-y-1.5">
        <label className="text-xs text-[var(--text-secondary)]">Lista de servicios</label>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setSaved(false) }}
          rows={4}
          className={cn(
            'w-full rounded-lg border px-3 py-2.5',
            'text-sm bg-[var(--bg-primary)] text-white resize-none',
            'focus:outline-none transition-colors',
            hasErrors
              ? 'border-[var(--color-danger)]'
              : 'border-[var(--border-subtle)] focus:border-[var(--color-accent)]'
          )}
        />
        {invalidEntries.length > 0 && (
          <p className="text-xs text-[var(--color-danger)] flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Formato inválido en: {invalidEntries.map(e => `"${e}"`).join(', ')}
          </p>
        )}
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-[var(--text-secondary)]">Vista previa</p>
          <div className="space-y-1">
            {preview.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]"
              >
                <span className="text-sm text-white">{s.nombre}</span>
                <span className="text-sm font-semibold text-[var(--color-accent)]">
                  ${s.precio.toLocaleString('es-CO')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-[var(--color-danger)] flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />{error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={isPending || hasErrors}
        className={cn(
          'w-full rounded-full h-10 text-sm font-semibold text-white transition-all',
          saved
            ? 'bg-[var(--color-success)]'
            : 'bg-[var(--color-accent)] hover:opacity-90',
          (isPending || hasErrors) && 'opacity-50 pointer-events-none'
        )}
      >
        {isPending ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
      </button>
    </div>
  )
}
