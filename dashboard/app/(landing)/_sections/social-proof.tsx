"use client";

import { useEffect, useRef, useState } from "react";

function useCountUp(end: number, duration: number, startCounting: boolean) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!startCounting) return;

    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, startCounting]);

  return count;
}

function StatCounter({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: string;
}) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const count = useCountUp(value, 2000, inView);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1 text-center">
      <div
        className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight text-zf-text"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {count}
        {suffix}
      </div>
      <div className="text-sm text-zf-text-muted">{label}</div>
    </div>
  );
}

export function SocialProof() {
  return (
    <section className="relative border-y border-zf-border/50 bg-zf-surface/50 px-6 py-12 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-8 md:justify-start">
            <StatCounter value={3} suffix="+" label="Negocios activos" />
            <div className="hidden md:block h-12 w-px bg-zf-border/50" />
            <StatCounter
              value={350}
              suffix="+"
              label="Citas agendadas este mes"
            />
            <div className="hidden md:block h-12 w-px bg-zf-border/50" />
            <StatCounter value={98} suffix="%" label="Tiempo activo del bot" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 md:justify-end">
            <span className="text-sm text-zf-text-muted">Usado por:</span>
            <Badge label="Peluquerías" />
            <Badge label="Clínicas" />
            <Badge label="Barberías" />
            <Badge label="Veterinarias" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-zf-border/50 bg-zf-accent-bg/50 px-3 py-1 text-xs text-zf-accent-text">
      {label}
    </span>
  );
}
