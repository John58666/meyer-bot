import Link from "next/link";

export function Footer({ businessName }: { businessName: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 pt-6 border-t border-[var(--border-subtle)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
        <p>
          © {year} {businessName}. Todos los derechos reservados.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/dashboard/legal/privacidad"
            className="hover:text-[var(--text-secondary)] transition-colors underline underline-offset-2"
          >
            Política de tratamiento de datos
          </Link>
          <Link
            href="/dashboard/legal/terminos"
            className="hover:text-[var(--text-secondary)] transition-colors underline underline-offset-2"
          >
            Términos de servicio
          </Link>
        </div>
      </div>
    </footer>
  );
}
