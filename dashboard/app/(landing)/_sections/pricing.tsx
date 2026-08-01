"use client";

import { useState } from "react";

const plans = [
  {
    name: "Starter",
    sub: "1 a 5 profesionales",
    monthly: 120000,
    annual: 110000,
    features: [
      "Bot WhatsApp completo",
      "Dashboard web",
      "CRM de clientes",
      "Métricas básicas",
      "Multi-profesional",
      "1 dueño + 1 admin",
    ],
    featured: false,
    cta: "Elegir plan",
  },
  {
    name: "Pro",
    sub: "6 a 12 profesionales",
    monthly: 180000,
    annual: 160000,
    features: [
      "Todo lo de Starter",
      "Dashboard completo",
      "Métricas premium",
      "Auditoría de cambios",
      "Reportes avanzados",
      "Soporte prioritario",
    ],
    featured: true,
    cta: "Elegir plan",
  },
  {
    name: "Business",
    sub: "13 a 20 profesionales",
    monthly: 260000,
    annual: 230000,
    features: [
      "Todo lo de Pro",
      "Múltiples sucursales",
      "API de integración",
      "Soporte dedicado 24/7",
      "Capacitación personalizada",
      "Funcionalidades extra",
    ],
    featured: false,
    cta: "Elegir plan",
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  const formatCOP = (n: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <section id="precios" className="bg-zf-surface/50 px-6 py-20 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2
            className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight text-zf-text"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Planes <span className="text-zf-primary">simples</span>, sin letra
            pequeña
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-zf-text-secondary">
            Sin contratos largos. Sin penalizaciones. Pagas mes a mes. Cancela
            cuando quieras.
          </p>
        </div>

        <div className="mb-10 flex items-center justify-center gap-3">
          <span
            className={`text-sm font-medium transition-colors duration-200 ${
              !annual ? "text-zf-text" : "text-zf-text-muted"
            }`}
          >
            Mensual
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative h-7 w-14 rounded-full transition-colors duration-200 ${
              annual ? "bg-zf-primary" : "bg-zf-border"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
                annual ? "translate-x-7" : "translate-x-0.5"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium transition-colors duration-200 ${
              annual ? "text-zf-text" : "text-zf-text-muted"
            }`}
          >
            Anual
          </span>
          {annual && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
              -15%
            </span>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border bg-zf-surface p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                plan.featured
                  ? "border-zf-primary/40 shadow-lg ring-1 ring-zf-primary/10"
                  : "border-zf-border/50"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-zf-primary px-4 py-1 text-xs font-bold text-white">
                  Más popular
                </div>
              )}

              <div className="mb-1 text-sm font-medium text-zf-text-muted">
                {plan.name}
              </div>
              <div className="text-xs text-zf-text-muted">{plan.sub}</div>

              <div className="mt-5 mb-6">
                <span
                  className="text-[clamp(32px,4vw,40px)] font-extrabold text-zf-text"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {formatCOP(annual ? plan.annual : plan.monthly)}
                </span>
                <span className="text-sm text-zf-text-muted">/mes</span>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zf-text-secondary">
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={`https://wa.me/573226541957?text=Hola,%20quiero%20información%20sobre%20el%20plan%20${plan.name}%20de%20Nova`}
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full rounded-full py-3 text-center text-sm font-semibold transition-all duration-160 ease-out active:scale-[0.97] ${
                  plan.featured
                    ? "bg-zf-primary text-white hover:bg-[#e06200]"
                    : "border-2 border-zf-border text-zf-text hover:border-zf-primary hover:text-zf-primary"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-zf-text-muted">
          ¿Más de 20 profesionales?{" "}
          <a
            href="https://wa.me/573226541957?text=Hola,%20quiero%20cotizar%20un%20plan%20personalizado%20de%20Nova"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-zf-primary underline underline-offset-2"
          >
            Hablemos
          </a>
        </p>
      </div>
    </section>
  );
}
