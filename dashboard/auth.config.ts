import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";

      if (isLoginPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) return false;

      const role = auth?.user?.role;
      const path = nextUrl.pathname;

      if (path.startsWith("/dashboard/equipo") && role !== "owner") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.businessId = ((user as { businessId?: number }).businessId) ?? 0;
        token.businessName = ((user as { businessName?: string }).businessName) ?? "";
        token.multiProfessional = ((user as { multiProfessional?: boolean }).multiProfessional) ?? false;
        token.role = ((user as { role?: string }).role) ?? "owner";
        token.professionalId = ((user as { professionalId?: number | null }).professionalId) ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.businessId = token.businessId as number;
        session.user.businessName = token.businessName as string;
        session.user.multiProfessional = token.multiProfessional as boolean;
        session.user.role = token.role as string;
        session.user.professionalId = token.professionalId as number | null;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
