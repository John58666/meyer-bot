import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;

        try {
          const result = await pool.query(
            `SELECT u.id, u.email, u.password_hash, u.name, u.business_id, u.role,
                    b.name AS business_name, b.multi_professional
             FROM users u
             LEFT JOIN businesses b ON b.id = u.business_id
             WHERE LOWER(u.email) = LOWER($1) AND u.active = true`,
            [email]
          );

          const user = result.rows[0];
          if (!user) return null;

          const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
          );
          if (!passwordMatch) return null;

          // Actualizar last_login_at en background, sin await
          pool
            .query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [
              user.id,
            ])
            .catch(() => {});

          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            businessId: user.business_id,
            businessName: user.business_name ?? "",
            multiProfessional: user.multi_professional ?? false,
            role: user.role,
          };
        } catch (err) {
          console.error("Auth error:", err);
          return null;
        }
      },
    }),
  ],
});
