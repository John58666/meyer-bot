import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getMetricas, type RangoMetricas } from '@/lib/actions';
import MetricasClient from '@/components/metricas/metricas-client';

interface Props {
  searchParams: Promise<{ rango?: string }>;
}

export default async function MetricasPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.businessId) redirect('/login');

  const params = await searchParams;
  const rangoRaw = params.rango ?? 'semana';
  const rango: RangoMetricas =
    rangoRaw === 'hoy' || rangoRaw === 'semana' || rangoRaw === 'mes'
      ? rangoRaw
      : 'semana';

  const businessId = Number(session.user.businessId);
  const professionalId = session.user.professionalId;

  const { data, error } = await getMetricas(businessId, rango, professionalId);

  return (
    <MetricasClient
      data={data}
      error={error}
      rangoActivo={rango}
      businessId={businessId}
      role={session.user.role}
    />
  );
}
