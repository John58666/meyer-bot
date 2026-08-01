export function ComingSoon() {
  return (
    <section className="px-6 py-20 lg:px-12">
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
            El ecosistema{" "}
            <span className="text-zf-primary">NovaFlow</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-zf-text-secondary">
            No solo agendamiento. Estamos construyendo una suite completa de productos con IA para automatizar cualquier tipo de negocio.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <ProductCard
            icon="🍽️"
            name="NovaRestaurants"
            label="Sistema para restaurantes"
            description="Gestión completa con IA: reservas, pedidos, gestión de mesas, inventario, menú digital y reportes. Todo desde WhatsApp y un dashboard unificado."
          />
          <ProductCard
            icon="🛵"
            name="NovaEat"
            label="Delivery y pedidos"
            description="El cliente pide por WhatsApp, el restaurante recibe el pedido organizado, la cocina lo prepara y el domiciliario lo entrega. Todo automatizado, sin apps extra."
          />
          <ProductCard
            icon="🏨"
            name="NovaSuite"
            label="Sistema para hoteles"
            description="Reservas, check-in/check-out, room service, housekeeping, facturación. El huésped gestiona todo desde WhatsApp sin bajar a recepción."
          />
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  icon,
  name,
  label,
  description,
}: {
  icon: string;
  name: string;
  label: string;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zf-border/50 bg-zf-surface/60 p-8 transition-all duration-200 hover:-translate-y-1 hover:border-zf-primary/20 hover:shadow-lg hover:shadow-zf-primary/5">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-zf-primary/5 blur-xl transition-all duration-300 group-hover:bg-zf-primary/10" />
      <div className="relative">
        <div className="mb-1 inline-flex rounded-full border border-zf-border/50 bg-zf-neutral-bg px-3 py-1 text-xs font-medium text-zf-text-muted">
          Próximamente
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h3 className="font-display text-lg font-bold text-zf-text">
              {name}
            </h3>
            <p className="text-sm text-zf-text-muted">{label}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-zf-text-secondary">
          {description}
        </p>
      </div>
    </div>
  );
}
