export function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-zf-bg" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 20% 30%, rgba(255, 107, 107, 0.10) 0%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 85% 70%, rgba(255, 107, 107, 0.06) 0%, transparent 55%),
              radial-gradient(ellipse 70% 50% at 50% 10%, rgba(99, 102, 241, 0.06) 0%, transparent 50%)
            `,
            backgroundAttachment: "fixed",
          }}
        />
      </div>

      <nav className="relative z-20 flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2.5">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28">
                <stop stopColor="#818cf8" />
                <stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <path
              d="M14 2L3 8v4l11 5.5L25 12V8L14 2z"
              fill="url(#logoGrad)"
              opacity="0.3"
            />
            <path
              d="M14 2L3 8l11 5.5L25 8l-11-6z"
              stroke="url(#logoGrad)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M3 12v4l11 5.5L25 16v-4"
              stroke="url(#logoGrad)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M3 16v4l11 5.5L25 20v-4"
              stroke="url(#logoGrad)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              opacity="0.5"
            />
          </svg>
          <span className="font-display text-lg font-extrabold tracking-tight text-zf-text">
            Nova<span className="bg-gradient-to-r from-zf-primary to-violet-300 bg-clip-text text-transparent">Flow</span>
          </span>
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <a href="#como-funciona" className="text-sm text-zf-text-secondary hover:text-zf-primary transition-colors">
            Cómo funciona
          </a>
          <a href="#features" className="text-sm text-zf-text-secondary hover:text-zf-primary transition-colors">
            Funcionalidades
          </a>
          <a href="#precios" className="text-sm text-zf-text-secondary hover:text-zf-primary transition-colors">
            Precios
          </a>
          <a href="#faq" className="text-sm text-zf-text-secondary hover:text-zf-primary transition-colors">
            FAQ
          </a>
        </div>
        <a
          href="#precios"
          className="rounded-full bg-zf-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-160 ease-out hover:brightness-110 active:scale-[0.97]"
        >
          Empezar ahora
        </a>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center gap-12 px-6 pb-16 pt-8 lg:flex-row lg:gap-16 lg:px-12 lg:pt-0">
        <div className="flex max-w-2xl flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zf-border/60 bg-zf-surface/80 px-4 py-1.5 text-sm text-zf-text-secondary backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Hecho en Colombia
          </div>

          <h1 className="font-display text-[clamp(36px,7vw,72px)] font-extrabold leading-[1.05] tracking-[-0.02em] text-zf-text">
            Tu negocio atiende
            <br />
            <span className="bg-gradient-to-r from-zf-primary via-violet-400 to-cyan-300 bg-clip-text text-transparent">
              solo
            </span>
            , por WhatsApp,
            <br />
            24/7
          </h1>

          <p className="mt-6 max-w-lg text-[clamp(16px,1.4vw,20px)] leading-relaxed text-zf-text-secondary">
            Un bot con inteligencia artificial que agenda citas, habla como
            persona y te libera del teléfono. Como tener una recepcionista que
            nunca duerme, nunca se queja y nunca pide aumento.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#precios"
              className="inline-flex items-center gap-2 rounded-full bg-zf-primary px-7 py-3.5 text-base font-semibold text-white transition-all duration-160 ease-out hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.97]"
            >
              Ver planes
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 rounded-full border-2 border-zf-border px-7 py-3.5 text-base font-medium text-zf-text transition-all duration-160 ease-out hover:border-zf-primary hover:text-zf-primary active:scale-[0.97]"
            >
              Cómo funciona
            </a>
          </div>

          <p className="mt-4 text-sm text-zf-text-muted">
            Sin contrato. Sin tarjeta de crédito. Cancela cuando quieras.
          </p>
        </div>

        <div className="relative flex-shrink-0 w-full max-w-[340px] lg:max-w-[360px]">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-0.5 shadow-[0_24px_80px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.15)] backdrop-blur-xl">
            <div className="rounded-[14px] overflow-hidden bg-zf-surface/70">
              <div className="flex items-center gap-2.5 border-b border-zf-border/40 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-zf-primary to-violet-500 text-sm font-bold text-white">
                  N
                </div>
                <div>
                  <div className="text-sm font-semibold text-zf-text">NovaFlow</div>
                  <div className="text-xs text-green-400">En línea</div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 px-3.5 py-3.5">
                <div className="msg bot">
                  ¡Hola! Soy NovaFlow, el asistente virtual de{" "}
                  <strong>tu negocio</strong>. ¿En qué puedo ayudarte? 🙌
                </div>
                <div className="msg client">
                  Hola, necesito un corte para mañana en la tarde
                </div>
                <div className="msg bot">
                  ¡Claro! Tenemos disponible a las{" "}
                  <strong>4:00 PM con Carlos</strong> o a las 5:30 PM con
                  María. ¿Cuál prefieres? 😊
                </div>
                <div className="msg client">A las 4 con Carlos, ¡hágale!</div>
                <div className="msg bot">
                  ✅ <strong>¡Listo, confirmado!</strong> Mañana a las 4:00 PM
                  con Carlos. Te mando un recordatorio un día antes. ¡Gracias!
                </div>
                <div className="typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
