export function Demo() {
  return (
    <section className="px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="font-display text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight text-zf-text">
            Mira cómo funciona <span className="text-zf-primary">en vivo</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-zf-text-secondary">
            Así se ve tu negocio cuando NovaFlow lo atiende por ti.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col justify-center">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-400/10 text-green-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-zf-text">El cliente escribe por WhatsApp</h4>
                  <p className="mt-1 text-sm text-zf-text-secondary">
                    Como siempre lo ha hecho. Sin apps nuevas, sin links raros.
                    Solo un chat normal.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-400/10 text-green-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-zf-text">NovaFlow agenda la cita automáticamente</h4>
                  <p className="mt-1 text-sm text-zf-text-secondary">
                    Verifica horarios disponibles, confirma con el cliente,
                    guarda todo. En segundos.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-400/10 text-green-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-zf-text">Tú ves todo desde el dashboard</h4>
                  <p className="mt-1 text-sm text-zf-text-secondary">
                    Citas del día, ingresos, clientes frecuentes, ocupación.
                    Todo desde el celular.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-full border border-zf-border/50 bg-zf-surface/50 px-4 py-2 text-sm text-zf-text-secondary">
                🔔 Recordatorios automáticos
              </div>
              <div className="rounded-full border border-zf-border/50 bg-zf-surface/50 px-4 py-2 text-sm text-zf-text-secondary">
                📊 Dashboard en tiempo real
              </div>
              <div className="rounded-full border border-zf-border/50 bg-zf-surface/50 px-4 py-2 text-sm text-zf-text-secondary">
                🧠 IA que aprende de tu negocio
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1 shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur-md">
              <div className="overflow-hidden rounded-xl bg-zf-surface/90">
                <div className="flex items-center gap-1.5 border-b border-zf-border/30 px-3 py-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-zf-text-muted">Dashboard — NovaFlow</span>
                </div>
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-zf-text">Hoy</div>
                      <div className="text-xs text-zf-text-muted">8 citas · $480,000</div>
                    </div>
                    <div className="rounded-lg bg-zf-primary/10 px-3 py-1 text-xs font-bold text-zf-primary">
                      92% ocupación
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { time: "9:00 AM", client: "Laura Gómez", service: "Corte + Barba", pro: "Carlos", status: "completada" },
                      { time: "10:30 AM", client: "Andrés Pérez", service: "Corte clásico", pro: "María", status: "pendiente" },
                      { time: "2:00 PM", client: "Diana Ruiz", service: "Tinte + Corte", pro: "Carlos", status: "pendiente" },
                    ].map((appt) => (
                      <div key={appt.client} className="flex items-center justify-between rounded-lg border border-zf-border/30 p-2.5 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-zf-primary">{appt.time}</span>
                          <div>
                            <div className="font-semibold text-zf-text">{appt.client}</div>
                            <div className="text-zf-text-muted">{appt.service} · {appt.pro}</div>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            appt.status === "completada"
                              ? "bg-green-400/10 text-green-400"
                              : "bg-amber-400/10 text-amber-400"
                          }`}
                        >
                          {appt.status === "completada" ? "✓ Hecho" : "Pendiente"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-dashed border-zf-border/50 p-2.5 text-center text-xs text-zf-text-muted">
                    +5 citas más esta tarde
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
