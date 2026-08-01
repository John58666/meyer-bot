export function Problem() {
  return (
    <section className="px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2
            className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight text-zf-text"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            ¿Cuánto te cuesta <span className="text-zf-primary">no contestar</span>?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-zf-text-secondary">
            Cada mensaje sin responder es una cita perdida. Cada cita perdida es
            plata que se fue. Y pasa todos los días.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="group rounded-2xl border border-zf-border/50 bg-zf-surface p-8 transition-all duration-200 hover:-translate-y-1 hover:border-zf-primary/30 hover:shadow-lg md:col-span-2 md:row-span-2">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zf-error-bg text-2xl">
              💸
            </div>
            <h3
              className="text-xl font-bold text-zf-text"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Pierdes plata todos los días
            </h3>
            <p className="mt-3 leading-relaxed text-zf-text-secondary">
              Una peluquería o consultorio promedio pierde entre{" "}
              <strong className="text-zf-error-text">
                $3,000,000 y $5,000,000 COP al mes
              </strong>{" "}
              en citas que nunca se agendan porque nadie contestó el WhatsApp a
              tiempo. Si el cliente escribe y no le respondes en 5 minutos, ya
              le escribió a tu competencia.
            </p>
          </div>

          <div className="group rounded-2xl border border-zf-border/50 bg-zf-surface p-8 transition-all duration-200 hover:-translate-y-1 hover:border-zf-primary/30 hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zf-warning-bg text-2xl">
              📱
            </div>
            <h3
              className="text-xl font-bold text-zf-text"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              WhatsApp es un caos
            </h3>
            <p className="mt-3 leading-relaxed text-zf-text-secondary">
              Mensajes perdidos. Clientes preguntando horarios a las 10 PM. El
              dueño respondiendo hasta los domingos. Sin orden, sin control, sin
              paz.
            </p>
          </div>

          <div className="group rounded-2xl border border-zf-border/50 bg-zf-surface p-8 transition-all duration-200 hover:-translate-y-1 hover:border-zf-primary/30 hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zf-neutral-bg text-2xl">
              😫
            </div>
            <h3
              className="text-xl font-bold text-zf-text"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Eres esclavo del teléfono
            </h3>
            <p className="mt-3 leading-relaxed text-zf-text-secondary">
              En vez de hacer crecer tu negocio, pasas el día contestando
              &quot;¿qué horarios tienes?&quot; una y otra vez. Tu tiempo vale
              más que eso.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
