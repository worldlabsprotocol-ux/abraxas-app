// FILE: lib/auth.ts
// NextAuth configuration — Email (magic link) + GitHub + X (Twitter)
// Solana wallet can be linked to any account after login.
// All imports at top. No client-only APIs used in this file.

import { NextAuthOptions }    from "next-auth";
import GitHubProvider         from "next-auth/providers/github";
import TwitterProvider        from "next-auth/providers/twitter";
import EmailProvider          from "next-auth/providers/email";
import { SupabaseAdapter }    from "@auth/supabase-adapter";
import { createClient }       from "@supabase/supabase-js";

// Supabase adapter for persistent sessions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url:    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),

  providers: [
    // Email magic-link (no password — just click the link)
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

    // GitHub
    GitHubProvider({
      clientId:     process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    // X / Twitter (OAuth 2.0)
    TwitterProvider({
      clientId:     process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version:      "2.0",
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge:   30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    // Attach wallet address from DB to session token
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        // Fetch linked wallet from users table
        const { data } = await supabaseAdmin
          .from("users")
          .select("wallet_address, abra_balance")
          .eq("id", user.id)
          .single();
        token.walletAddress = data?.wallet_address ?? null;
        token.abraBalance   = data?.abra_balance   ?? 0;
      }
      // Allow wallet to be updated mid-session
      if (trigger === "update" && session?.walletAddress) {
        token.walletAddress = session.walletAddress;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string,unknown>).id            = token.userId as string;
        (session.user as Record<string,unknown>).walletAddress = token.walletAddress;
        (session.user as Record<string,unknown>).abraBalance   = token.abraBalance;
      }
      return session;
    },
  },

  pages: {
    signIn:  "/auth/signin",
    error:   "/auth/error",
    verifyRequest: "/auth/verify",
  },

  debug: process.env.NODE_ENV === "development",
};