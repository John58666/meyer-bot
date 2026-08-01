import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NovaFlow — Tu negocio atiende solo por WhatsApp, 24/7",
  description:
    "Bot con inteligencia artificial que agenda citas, habla como persona y te libera del teléfono. Dashboard completo incluido. Para peluquerías, clínicas, consultorios y cualquier negocio con citas.",
  openGraph: {
    title: "NovaFlow — Tu negocio atiende solo por WhatsApp",
    description:
      "Bot IA que agenda citas 24/7 por WhatsApp. Dashboard completo incluido.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    siteName: "NovaFlow",
    locale: "es_CO",
  },
  twitter: {
    card: "summary_large_image",
    title: "NovaFlow — Tu negocio atiende solo por WhatsApp",
  },
  keywords: [
    "bot whatsapp",
    "agendar citas",
    "inteligencia artificial",
    "peluquería",
    "clínica",
    "consultorio",
    "barbería",
    "veterinaria",
    "colombia",
    "dashboard",
    "gestión de citas",
    "novaflow",
    "restaurantes",
    "hoteles",
    "delivery",
  ],
  robots: { index: true, follow: true },
  alternates: { canonical: "https://zyvenshop.com" },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
