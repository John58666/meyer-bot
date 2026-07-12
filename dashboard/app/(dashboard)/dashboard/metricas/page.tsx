import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getMetricas, type RangoMetricas } from '@/lib/actions';
import MetricasClient from '@/components/metricas/metricas-client';

interface Props {
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string }>;
}

function parseRango(raw: string | undefined): RangoMetricas {
  if (raw === 'hoy' || raw === 'semana' || raw === 'mes' || raw === 'trimestre' || raw === 'custom') return raw;
  return 'semana';
}

export default async function MetricasPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.businessId) redirect('/login');

  const params = await searchParams;
  const rango = parseRango(params.rango);
  const fechaDesde = params.desde;
  const fechaHasta = params.hasta;

  const businessId = Number(session.user.businessId);
  const professionalId = session.user.professionalId;

  const { data, error } = await getMetricas(businessId, rango, professionalId, fechaDesde, fechaHasta);

  return (
    <MetricasClient
      data={data}
      error={error}
      rangoActivo={rango}
      businessId={businessId}
      role={session.user.role}
      professionalId={session.user.professionalId}
      fechaDesde={fechaDesde}
      fechaHasta={fechaHasta}
    />
  );
}
