import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authConfig } from "./auth.config";

const nextAuthMiddleware = NextAuth(authConfig).auth;

export default function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return;
  }
  return nextAuthMiddleware(request as Parameters<typeof nextAuthMiddleware>[0]);
}

export const config = {
  matcher: ["/((?!api/auth|api/webhooks|_next/static|_next/image|favicon.ico).*)"],
};
