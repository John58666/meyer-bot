import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function TerminosPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const businessName = session.user.businessName;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Términos de servicio</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {businessName}
          </p>
        </div>
      </div>

      <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-white font-semibold text-base">1. Agendamiento de citas</h2>
          <p>
            Las citas agendadas por WhatsApp o directamente en el negocio quedan
            sujetas a disponibilidad real de horario. {businessName} se reserva el
            derecho de reprogramar una cita por causas de fuerza mayor, avisando al
            cliente con la mayor antelación posible.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-base">2. Cancelaciones</h2>
          <p>
            El cliente puede cancelar o reagendar su cita escribiendo por WhatsApp.
            Se recomienda avisar con al menos 2 horas de anticipación.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-base">3. Precios</h2>
          <p>
            Los precios informados por el asistente virtual corresponden a la lista de
            servicios vigente del negocio y pueden variar sin previo aviso.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-base">4. Uso del asistente virtual</h2>
          <p>
            El asistente de WhatsApp es un sistema automatizado de apoyo para agendar
            citas. Para cualquier inconveniente no resuelto por el asistente, el
            cliente puede solicitar hablar directamente con el negocio.
          </p>
        </section>

        <p className="text-xs text-[var(--text-muted)] pt-4 border-t border-[var(--border-subtle)]">
          Última actualización: {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}.
        </p>
      </div>
    </div>
  );
}
