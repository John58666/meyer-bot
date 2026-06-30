import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    businessId?: number;
    businessName?: string;
    multiProfessional?: boolean;
    role?: string;
    professionalId?: number | null;
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
      professionalId: number | null;
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
    professionalId: number | null;
  }
}
