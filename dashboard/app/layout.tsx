import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-dm-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  const businessName = session?.user?.businessName;
  return {
    title: businessName ? `${businessName} — Dashboard` : "Dashboard",
    description: "Panel de gestión de citas",
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} ${dmSans.variable}`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}