export function Features() {
  return (
    <section id="features" className="px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2
            className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight text-zf-text"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Todo lo que necesitas en{" "}
            <span className="text-zf-primary">un solo lugar</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-zf-text-secondary">
            Bot WhatsApp + Dashboard de gestión. No necesitas 3 herramientas
            distintas.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon="🤖"
            title="Bot que habla colombiano"
            description='"Parce", "hágale", "listo pues", "mi amor". El bot entiende la jerga local y responde natural. No es un robot frío.'
          />
          <FeatureCard
            icon="🔒"
            title="3 IAs en respaldo"
            description="Tres inteligencias artificiales trabajando en cadena. Si una falla, la otra responde. Como tener 3 empleados por el precio de 1."
          />
          <FeatureCard
            icon="🔔"
            title="Doble recordatorio"
            description="Un día antes + dos horas antes de cada cita. Tus clientes nunca se olvidan. Adiós a los que no asisten."
          />
          <FeatureCard
            icon="👥"
            title="Multi-profesional"
            description="Cada profesional con su propia agenda, horarios y servicios. El cliente elige con quién agendarse."
          />
          <FeatureCard
            icon="📊"
            title="Dashboard completo"
            description="Citas, clientes, inventario, caja, métricas, equipo. Todo desde el celular, tablet o computador."
          />
          <FeatureCard
            icon="🧠"
            title="Relleno inteligente"
            description="Si un cliente no llega, el bot detecta el espacio vacío y lo ofrece al siguiente que pida cita. Cero ingresos perdidos."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-zf-border/50 bg-zf-surface p-7 transition-all duration-200 hover:-translate-y-1 hover:border-zf-primary/20 hover:shadow-lg">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-zf-accent-bg text-2xl">
        {icon}
      </div>
      <h3
        className="text-lg font-bold text-zf-text"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-zf-text-secondary">
        {description}
      </p>
    </div>
  );
}
