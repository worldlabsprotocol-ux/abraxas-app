// FILE: types/next-auth.d.ts
// Properly extends NextAuth Session and JWT with walletAddress.
// Import this pattern — zero unsafe casts needed in auth.ts.
import type { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    walletAddress?: string | null;
    user: DefaultSession["user"] & {
      id:             string;
      walletAddress?: string | null;
    };
  }
  interface User {
    id:             string;
    walletAddress?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId?:        string;
    walletAddress?: string | null;
  }
}
