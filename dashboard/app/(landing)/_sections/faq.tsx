"use client";

import { useState } from "react";

const faqs = [
  {
    q: "¿Es difícil de configurar? No sé de tecnología",
    a: "Para nada. Nosotros te configuramos todo. Tú solo nos dices tus servicios, precios y horarios. En menos de una semana tu bot ya está atendiendo clientes. Además, te capacitamos para que aprendas a usar el dashboard. Es más fácil que aprender a usar Instagram.",
  },
  {
    q: "¿Y si el bot se equivoca y agenda mal?",
    a: "El bot tiene 3 inteligencias artificiales trabajando en cadena. Si una duda, otra verifica. Además, el sistema revisa la disponibilidad en tiempo real y bloquea los horarios automáticamente. Es matemáticamente imposible que dos clientes caigan en el mismo espacio. Y si algo raro pasa, tú recibes una notificación al instante.",
  },
  {
    q: "Está muy caro para mi negocio",
    a: "Un plan de Nova cuesta desde $120,000 COP al mes. Eso es menos de lo que pagas por almuerzos en una semana. Ahora piensa: ¿cuánto pierdes al mes en clientes que llaman y no les contestas? El bot se paga solo con 1 o 2 citas extra a la semana. No es un gasto, es una inversión que se paga sola.",
  },
  {
    q: "¿Mis clientes no van a extrañar hablar con una persona?",
    a: "El 90% de las consultas son para saber horarios, precios y agendar. Cosas que Nova resuelve al instante, a cualquier hora, sin hacer esperar a nadie. El cliente recibe respuesta inmediata. Y si el caso es complejo, el dueño siempre puede intervenir. No reemplazamos al dueño, reemplazamos el estrés de contestar WhatsApp todo el día.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí. Sin contratos largos. Sin penalizaciones. Sin letra pequeña. Pagas mes a mes y cancelas cuando quieras. Así de simple.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 text-center">
          <h2
            className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight text-zf-text"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Preguntas <span className="text-zf-primary">frecuentes</span>
          </h2>
        </div>

        <div className="divide-y divide-zf-border/50">
          {faqs.map((faq, i) => (
            <FaqItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="py-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors duration-150 hover:text-zf-primary"
      >
        <span
          className="text-base font-semibold text-zf-text"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {question}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`flex-shrink-0 text-zf-text-muted transition-transform duration-300 ${
            open ? "rotate-45" : ""
          }`}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          open ? "max-h-96 pb-4" : "max-h-0"
        }`}
      >
        <p className="text-sm leading-relaxed text-zf-text-secondary">
          {answer}
        </p>
      </div>
    </div>
  );
}
