// FILE: lib/auth.ts
import { NextAuthOptions } from "next-auth";
import GitHubProvider     from "next-auth/providers/github";
import TwitterProvider    from "next-auth/providers/twitter";
import EmailProvider      from "next-auth/providers/email";

// Log missing vars at startup (visible in Vercel Function logs)
const required = ["NEXTAUTH_SECRET","NEXTAUTH_URL","GITHUB_CLIENT_ID","GITHUB_CLIENT_SECRET","TWITTER_CLIENT_ID","TWITTER_CLIENT_SECRET"];
required.forEach(k => { if (!process.env[k]) console.warn(`[ABRAXAS] Missing env: ${k}`); });

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId:     process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    TwitterProvider({
      clientId:     process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST ?? "smtp.resend.com",
        port: parseInt(process.env.EMAIL_SERVER_PORT ?? "465"),
        auth: {
          user: process.env.EMAIL_SERVER_USER ?? "resend",
          pass: process.env.EMAIL_SERVER_PASSWORD ?? "",
        },
      },
      from: process.env.EMAIL_FROM ?? "noreply@abraxas-app.vercel.app",
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user, trigger, session: upd }) {
      if (user) { token.userId = user.id; }
      if (trigger === "update" && upd?.walletAddress) {
        token.walletAddress = upd.walletAddress;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string,unknown>).id            = token.userId;
        (session.user as Record<string,unknown>).walletAddress = token.walletAddress ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn:        "/auth/signin",
    verifyRequest: "/auth/verify",
    error:         "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET!,
};
