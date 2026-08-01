export function CtaFooter() {
  return (
    <>
      <section className="relative px-6 py-24 lg:px-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-zf-bg" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 60% 50% at 50% 50%, rgba(249, 115, 22, 0.1) 0%, transparent 70%),
                radial-gradient(ellipse 50% 60% at 80% 20%, rgba(251, 146, 60, 0.06) 0%, transparent 60%)
              `,
            }}
          />
        </div>

        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-[clamp(28px,5vw,48px)] font-extrabold tracking-tight text-zf-text"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Tu negocio merece atender{" "}
            <span className="text-zf-primary">24/7</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-zf-text-secondary">
            El bot se paga solo con 1 o 2 citas extra a la semana. Sin tarjeta
            de crédito. Sin compromiso.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="https://wa.me/573226541957?text=Hola,%20quiero%20empezar%20con%20Nova"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-zf-primary px-8 py-4 text-base font-semibold text-white transition-all duration-160 ease-out hover:bg-[#e06200] hover:-translate-y-0.5 active:scale-[0.97] sm:w-auto"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Empieza por WhatsApp
            </a>
            <a
              href="#como-funciona"
              className="inline-flex w-full items-center justify-center rounded-full border-2 border-zf-border px-8 py-4 text-base font-medium text-zf-text transition-all duration-160 ease-out hover:border-zf-primary hover:text-zf-primary active:scale-[0.97] sm:w-auto"
            >
              Ver demo
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-zf-border/50 bg-zf-surface/50 px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zf-primary">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span
                className="text-base font-bold tracking-tight text-zf-text"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Nova
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-zf-text-muted">
              <a href="#como-funciona" className="hover:text-zf-text transition-colors">
                Cómo funciona
              </a>
              <a href="#features" className="hover:text-zf-text transition-colors">
                Funcionalidades
              </a>
              <a href="#precios" className="hover:text-zf-text transition-colors">
                Precios
              </a>
              <a href="#faq" className="hover:text-zf-text transition-colors">
                FAQ
              </a>
              <a
                href="https://wa.me/573226541957"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zf-text transition-colors"
              >
                Contacto
              </a>
            </div>
          </div>

          <div className="mt-8 border-t border-zf-border/50 pt-6 text-center text-xs text-zf-text-muted">
            Hecho en Colombia para negocios locales. Todos los derechos
            reservados.
          </div>
        </div>
      </footer>
    </>
  );
}
