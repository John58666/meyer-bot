const industries = [
  { icon: "💇", label: "Peluquerías" },
  { icon: "💈", label: "Barberías" },
  { icon: "💅", label: "Salones de uñas" },
  { icon: "🧖", label: "Spas y estética" },
  { icon: "🦷", label: "Clínicas dentales" },
  { icon: "🐾", label: "Veterinarias" },
  { icon: "🏥", label: "Consultorios médicos" },
  { icon: "🧠", label: "Psicólogos" },
  { icon: "💪", label: "Gimnasios" },
  { icon: "🍎", label: "Nutricionistas" },
  { icon: "💆", label: "Masajistas" },
  { icon: "🏋️", label: "Entrenadores personales" },
  { icon: "🩺", label: "Fisioterapeutas" },
  { icon: "🎨", label: "Tatuadores" },
  { icon: "📋", label: "Asesorías" },
];

export function Industries() {
  return (
    <section className="bg-zf-surface/50 px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2
            className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight text-zf-text"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Hecho para <span className="text-zf-primary">cualquier negocio</span> con citas
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-zf-text-secondary">
            Si tu negocio vive de las citas, Nova te sirve. No importa la
            industria.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:gap-4">
          {industries.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-2 rounded-xl border border-zf-border/40 bg-zf-surface p-4 transition-all duration-150 hover:scale-[1.03] hover:border-zf-primary/30 hover:shadow-md"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-center text-xs font-medium text-zf-text-secondary">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
