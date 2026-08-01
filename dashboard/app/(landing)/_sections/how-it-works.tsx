export function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-zf-surface/50 px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2
            className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight text-zf-text"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            De la conversación a la cita{" "}
            <span className="text-zf-primary">en 3 pasos</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-zf-text-secondary">
            Sin intervención humana. El dueño solo recibe la notificación de
            &quot;cita agendada&quot;.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <Step
            number="1"
            icon="💬"
            title="El cliente escribe"
            description='"Parce, necesito un corte mañana en la tarde" — el bot entiende lenguaje natural, jerga colombiana, y guía la conversación paso a paso.'
          />
          <Step
            number="2"
            icon="🤖"
            title="El bot agenda solo"
            description="Verifica disponibilidad en tiempo real, confirma con el cliente, guarda la cita y bloquea el horario. Imposible que dos clientes caigan en el mismo espacio."
          />
          <Step
            number="3"
            icon="📊"
            title="El dueño lo ve al instante"
            description="Notificación al WhatsApp del dueño + el dashboard se actualiza en vivo. Todo queda registrado: cliente, servicio, profesional, fecha, hora, estado."
          />
        </div>

        <div className="mt-16 rounded-2xl border border-zf-primary/10 bg-gradient-to-r from-zf-accent-bg/30 to-zf-bg p-8 text-center">
          <p className="text-lg font-semibold text-zf-text">
            No es un link de reserva como los demás. Es una conversación real.
          </p>
          <p className="mt-2 text-zf-text-secondary">
            El cliente habla normal y el bot le entiende. Como chatear con una
            persona del barrio.
          </p>
        </div>
      </div>
    </section>
  );
}

function Step({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zf-accent-bg text-3xl">
        {icon}
      </div>
      <div className="absolute left-[calc(50%+2.5rem)] top-8 hidden h-[2px] w-[calc(100%-5rem)] bg-gradient-to-r from-zf-primary/30 to-transparent md:block" />
      <div className="mb-2 rounded-full bg-zf-primary px-3 py-0.5 text-xs font-bold text-white">
        Paso {number}
      </div>
      <h3
        className="mt-3 text-xl font-bold text-zf-text"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {title}
      </h3>
      <p className="mt-3 leading-relaxed text-zf-text-secondary">
        {description}
      </p>
    </div>
  );
}
