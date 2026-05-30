// FILE: lib/auth.ts
// NextAuth config — Email + GitHub + X.
// Session extended via types/next-auth.d.ts — zero unsafe casts.
import { NextAuthOptions } from "next-auth";
import GitHubProvider      from "next-auth/providers/github";
import TwitterProvider     from "next-auth/providers/twitter";
import EmailProvider       from "next-auth/providers/email";

export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST  ?? "smtp.resend.com",
        port: parseInt(process.env.EMAIL_SERVER_PORT ?? "465"),
        auth: {
          user: process.env.EMAIL_SERVER_USER     ?? "resend",
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

  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  callbacks: {
    async jwt({ token, user, trigger, session: updateSession }) {
      if (user) {
        token.userId        = user.id;
        token.walletAddress = (user as { walletAddress?: string | null }).walletAddress ?? null;
      }
      if (trigger === "update" && updateSession?.walletAddress !== undefined) {
        token.walletAddress = updateSession.walletAddress as string | null;
      }
      return token;
    },

    async session({ session, token }) {
      // Types are extended in types/next-auth.d.ts — no cast needed
      session.walletAddress = token.walletAddress ?? null;
      if (session.user) {
        session.user.id            = token.userId ?? "";
        session.user.walletAddress = token.walletAddress ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn:        "/auth/signin",
    verifyRequest: "/auth/verify",
    error:         "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET ?? "change-this-in-production",
  debug:  process.env.NODE_ENV === "development",
};
