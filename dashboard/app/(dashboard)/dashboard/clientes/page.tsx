import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getClientes } from "@/lib/actions";
import { ClientesClient } from "@/components/clientes/clientes-client";

export default async function ClientesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const businessId = session.user.businessId;
  const professionalId = session.user.professionalId;
  const { clientes, error } = await getClientes(businessId, undefined, professionalId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} registrado{clientes.length !== 1 ? "s" : ""}
        </p>
      </div>

      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <ClientesClient clientes={clientes} />
      )}
    </div>
  );
}
