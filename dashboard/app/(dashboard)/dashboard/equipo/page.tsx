import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getEquipo } from "@/lib/actions";
import { EquipoClient } from "@/components/equipo/equipo-client";

export default async function EquipoPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "owner") redirect("/dashboard");

  const businessId = session.user.businessId;
  const { miembros, error } = await getEquipo(businessId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Equipo</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {miembros.length} miembro{miembros.length !== 1 ? "s" : ""} del equipo
        </p>
      </div>

      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <EquipoClient miembros={miembros} businessId={businessId} />
      )}
    </div>
  );
}
