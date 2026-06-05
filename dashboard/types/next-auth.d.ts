import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    businessId?: number;
    businessName?: string;
    multiProfessional?: boolean;
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      businessId: number;
      businessName: string;
      multiProfessional: boolean;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    businessId: number;
    businessName: string;
    multiProfessional: boolean;
    role: string;
  }
}
