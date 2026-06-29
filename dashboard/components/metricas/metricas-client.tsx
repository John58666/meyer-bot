'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { MetricasData, RangoMetricas } from '@/lib/actions';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPesos(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatHora(hora: number): string {
  if (hora === 0) return '12:00 AM';
  if (hora < 12) return `${hora}:00 AM`;
  if (hora === 12) return '12:00 PM';
  return `${hora - 12}:00 PM`;
}

function formatFechaCorta(fechaISO: string): string {
  // 'YYYY-MM-DD' → 'Lun 23'
  const d = new Date(fechaISO + 'T00:00:00');
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return `${dias[d.getUTCDay()]} ${d.getUTCDate()}`;
}

// ─── Componentes internos ─────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-[var(--bg-card,#1a1a1a)] rounded-xl p-4 flex flex-col gap-1 border border-[var(--border-subtle,#2a2a2a)]">
      <span className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide">
        {label}
      </span>
      <span className="text-2xl font-bold text-[var(--text-primary,#fff)]">
        {value}
      </span>
      {sub && (
        <span className="text-[11px] text-[var(--text-secondary)]">{sub}</span>
      )}
    </div>
  );
}

function BarraEstado({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[12px]">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="text-[var(--text-primary,#fff)] font-medium">
          {count}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--border-subtle,#2a2a2a)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-card,#1a1a1a)] border border-[var(--border-subtle,#2a2a2a)] rounded-lg px-3 py-2 text-[12px] shadow-lg">
      <p className="text-[var(--text-secondary)] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[var(--text-primary,#fff)] font-medium">
          {p.name === 'ingresos' ? formatPesos(p.value) : `${p.value} citas`}
        </p>
      ))}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  data: MetricasData | null;
  error: string | null;
  rangoActivo: RangoMetricas;
  businessId: number;
}

// ─── Componente principal ────────────────────────────────────────────────────

const RANGOS: { key: RangoMetricas; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
];

export default function MetricasClient({
  data,
  error,
  rangoActivo,
  businessId: _businessId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function cambiarRango(rango: RangoMetricas) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('rango', rango);
    startTransition(() => {
      router.push(`/dashboard/metricas?${params.toString()}`);
    });
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--text-secondary)] text-sm">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--text-secondary)] text-sm">
        Sin datos
      </div>
    );
  }

  const totalParaBarra = data.totalCitas;

  const chartData = data.historialPorDia.map(d => ({
    fecha: formatFechaCorta(d.fecha),
    citas: d.total,
    ingresos: d.ingresos,
  }));

  const hayIngresos = data.ingresos > 0;

  return (
    <div
      className={`px-4 pb-24 pt-4 max-w-lg mx-auto transition-opacity duration-200 ${
        isPending ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <h1 className="text-lg font-semibold text-[var(--text-primary,#fff)] mb-4">
        Métricas
      </h1>

      <div className="flex gap-2 mb-6">
        {RANGOS.map(r => (
          <button
            key={r.key}
            onClick={() => cambiarRango(r.key)}
            disabled={isPending}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              rangoActivo === r.key
                ? 'bg-[var(--color-accent,#6366f1)] text-white'
                : 'bg-[var(--bg-card,#1a1a1a)] text-[var(--text-secondary)] border border-[var(--border-subtle,#2a2a2a)]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <KpiCard
          label="Ingresos"
          value={formatPesos(data.ingresos)}
          sub="solo completadas"
        />
        <KpiCard
          label="Total citas"
          value={String(data.totalCitas)}
          sub={`${data.completadas} completadas`}
        />
        <KpiCard
          label="Cancelaciones"
          value={`${data.tasaCancelacion}%`}
          sub={`${data.canceladas} canceladas`}
        />
        <KpiCard
          label="Hora pico"
          value={data.horaPico !== null ? formatHora(data.horaPico) : '—'}
          sub="más citas agendadas"
        />
      </div>

      <div className="bg-[var(--bg-card,#1a1a1a)] rounded-xl p-4 border border-[var(--border-subtle,#2a2a2a)] mb-6">
        <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide mb-3">
          Distribución
        </p>
        <div className="flex flex-col gap-3">
          <BarraEstado
            label="Completadas"
            count={data.completadas}
            total={totalParaBarra}
            color="var(--color-accent,#6366f1)"
          />
          <BarraEstado
            label="Pendientes"
            count={data.pendientes}
            total={totalParaBarra}
            color="#f59e0b"
          />
          <BarraEstado
            label="Canceladas"
            count={data.canceladas}
            total={totalParaBarra}
            color="#ef4444"
          />
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="bg-[var(--bg-card,#1a1a1a)] rounded-xl p-4 border border-[var(--border-subtle,#2a2a2a)]">
          <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide mb-4">
            {hayIngresos ? 'Ingresos por día' : 'Citas por día'}
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              barSize={hayIngresos ? 16 : 20}
            >
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 10, fill: 'var(--text-secondary,#888)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-secondary,#888)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={hayIngresos ? (v) => `$${(v/1000).toFixed(0)}k` : undefined}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar
                dataKey={hayIngresos ? 'ingresos' : 'citas'}
                name={hayIngresos ? 'ingresos' : 'citas'}
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={index}
                    fill="var(--color-accent,#6366f1)"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {hayIngresos && (
            <p className="text-[10px] text-[var(--text-secondary)] mt-2 text-center">
              Solo citas marcadas como Completada
            </p>
          )}
        </div>
      ) : (
        <div className="bg-[var(--bg-card,#1a1a1a)] rounded-xl p-6 border border-[var(--border-subtle,#2a2a2a)] text-center">
          <p className="text-[var(--text-secondary)] text-sm">
            Sin citas en este período
          </p>
        </div>
      )}
    </div>
  );
}
