export function Expansion() {
  return (
    <section className="relative overflow-hidden px-6 py-20 lg:px-12">
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle 120px at 15% 30%, rgba(129, 140, 248, 0.09) 0%, transparent 70%),
              radial-gradient(circle 100px at 50% 60%, rgba(129, 140, 248, 0.07) 0%, transparent 70%),
              radial-gradient(circle 140px at 85% 40%, rgba(129, 140, 248, 0.08) 0%, transparent 70%),
              radial-gradient(circle 60px at 30% 80%, rgba(129, 140, 248, 0.05) 0%, transparent 60%),
              radial-gradient(circle 80px at 70% 20%, rgba(167, 139, 250, 0.06) 0%, transparent 60%)
            `,
          }}
        />
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zf-primary/30 bg-zf-primary/5 px-4 py-1.5 text-sm font-medium text-zf-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zf-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-zf-primary" />
            </span>
            Próximamente
          </div>
          <h2 className="font-display text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight text-zf-text">
            De Colombia{" "}
            <span className="bg-gradient-to-r from-zf-primary via-violet-400 to-cyan-300 bg-clip-text text-transparent">
              al mundo
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-zf-text-secondary">
            NovaFlow nació en Colombia. Pronto estaremos en toda América y Europa, llevando automatización con IA a negocios de todo el mundo.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <RegionCard
            icon="🌎"
            region="Latinoamérica"
            delay="0ms"
            countries={["Perú", "Chile", "Argentina", "Brasil", "Ecuador", "Panamá", "México"]}
          />
          <RegionCard
            icon="🇪🇺"
            region="Europa"
            delay="100ms"
            countries={["España", "Italia", "Francia", "Alemania", "Portugal", "Reino Unido", "Países Bajos"]}
          />
          <RegionCard
            icon="🌐"
            region="Norteamérica"
            delay="200ms"
            countries={["Estados Unidos", "Canadá"]}
          />
        </div>
      </div>
    </section>
  );
}

function RegionCard({
  icon,
  region,
  countries,
  delay,
}: {
  icon: string;
  region: string;
  countries: string[];
  delay: string;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-zf-border/50 bg-zf-surface/50 p-8 transition-all duration-200 hover:-translate-y-1 hover:border-zf-primary/20 hover:shadow-lg hover:shadow-zf-primary/5"
      style={{ animationDelay: delay }}
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-zf-primary/5 blur-xl transition-all duration-300 group-hover:bg-zf-primary/10" />

      <div className="relative">
        <div className="mb-1 inline-flex rounded-full border border-zf-border/50 bg-zf-neutral-bg px-3 py-1 text-xs font-medium text-zf-text-muted">
          En desarrollo
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <h3 className="font-display text-xl font-bold text-zf-text">
            {region}
          </h3>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {countries.map((c) => (
            <span
              key={c}
              className="rounded-full border border-zf-border/40 px-3 py-1 text-xs text-zf-text-secondary"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
