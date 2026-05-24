import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    businessId?: number;
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      businessId: number;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    businessId: number;
    role: string;
  }
}
