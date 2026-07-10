import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function PoliticaPrivacidadPage() {
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
          <h1 className="text-2xl font-bold text-white">
            Política de tratamiento de datos personales
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {businessName} — conforme a la Ley 1581 de 2012 (Colombia)
          </p>
        </div>
      </div>

      <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-white font-semibold text-base">
            1. Responsable del tratamiento
          </h2>
          <p>
            <strong className="text-white">{businessName}</strong> es responsable del
            tratamiento de los datos personales que recolecta a través de su canal de
            WhatsApp y de este panel de gestión, para la prestación de sus servicios de
            agendamiento de citas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-base">
            2. Datos que recolectamos
          </h2>
          <p>
            Nombre, número de teléfono/WhatsApp, servicio solicitado, fecha y hora de
            la cita, e historial de citas agendadas, canceladas o completadas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-base">
            3. Finalidad del tratamiento
          </h2>
          <p>
            Los datos se usan exclusivamente para: agendar, confirmar, reagendar y
            cancelar citas; enviar recordatorios; y contactar al cliente en caso de
            novedades relacionadas con su servicio. No se comparten con terceros ni se
            usan con fines publicitarios distintos a los del propio negocio.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-base">
            4. Derechos del titular de los datos
          </h2>
          <p>De acuerdo con la Ley 1581 de 2012, usted tiene derecho a:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Conocer, actualizar y rectificar sus datos personales.</li>
            <li>Solicitar prueba de la autorización otorgada para el tratamiento.</li>
            <li>
              Ser informado sobre el uso que se ha dado a sus datos personales, previa
              solicitud.
            </li>
            <li>Revocar la autorización y/o solicitar la supresión de sus datos.</li>
            <li>
              Acceder de forma gratuita a sus datos personales que hayan sido objeto de
              tratamiento.
            </li>
            <li>
              Presentar quejas ante la Superintendencia de Industria y Comercio (SIC)
              por infracciones a la ley.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-base">
            5. Cómo ejercer sus derechos
          </h2>
          <p>
            Puede ejercer cualquiera de estos derechos escribiendo directamente por
            WhatsApp al número de contacto del negocio, indicando su solicitud.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-semibold text-base">
            6. Conservación de los datos
          </h2>
          <p>
            Los datos se conservan mientras exista una relación comercial activa o
            hasta que el titular solicite su supresión, salvo obligación legal de
            conservarlos por más tiempo.
          </p>
        </section>

        <p className="text-xs text-[var(--text-muted)] pt-4 border-t border-[var(--border-subtle)]">
          Última actualización: {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}.
        </p>
      </div>
    </div>
  );
}
