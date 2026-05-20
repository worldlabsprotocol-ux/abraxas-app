// FILE: lib/auth.ts
// NextAuth configuration — Email + GitHub + X (Twitter)
// JWT sessions only — no database adapter required.
// Wallet is stored in the JWT token and retrieved via session callback.
// All imports at top. No @auth/supabase-adapter dependency.

import { NextAuthOptions } from "next-auth";
import GitHubProvider      from "next-auth/providers/github";
import TwitterProvider     from "next-auth/providers/twitter";
import EmailProvider       from "next-auth/providers/email";

export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      server: {
        host:   process.env.EMAIL_SERVER_HOST    ?? "smtp.resend.com",
        port:   parseInt(process.env.EMAIL_SERVER_PORT ?? "465"),
        auth: {
          user: process.env.EMAIL_SERVER_USER    ?? "resend",
          pass: process.env.EMAIL_SERVER_PASSWORD ?? "",
        },
      },
      from: process.env.EMAIL_FROM ?? "noreply@abraxas-app.vercel.app",
    }),

    GitHubProvider({
      clientId:     process.env.GITHUB_CLIENT_ID     ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),

    TwitterProvider({
      clientId:     process.env.TWITTER_CLIENT_ID     ?? "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET ?? "",
      version:      "2.0",
    }),
  ],

  // JWT-only — no database adapter, no extra packages
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.email  = user.email ?? token.email;
        token.name   = user.name  ?? token.name;
      }
      // Allow wallet address to be updated via useSession().update()
      if (trigger === "update" && session?.walletAddress) {
        token.walletAddress = session.walletAddress;
      }
      return token;
    },
    async session({ session, token }) {
      (session as Record<string,unknown>).walletAddress = token.walletAddress ?? null;
      if (session.user) {
        (session.user as Record<string,unknown>).id = token.userId;
      }
      return session;
    },
  },

  pages: {
    signIn:        "/auth/signin",
    verifyRequest: "/auth/verify",
    error:         "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET ?? "fallback-dev-secret-change-in-production",
  debug:  process.env.NODE_ENV === "development",
};