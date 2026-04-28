import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import TwitterProvider from "next-auth/providers/twitter";

function envStr(key: string): string | undefined {
  const v = process.env[key];
  if (!v) return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const googleId      = envStr("GOOGLE_CLIENT_ID");
const googleSecret  = envStr("GOOGLE_CLIENT_SECRET");
const githubId      = envStr("GITHUB_ID");
const githubSecret  = envStr("GITHUB_SECRET");
const twitterId     = envStr("TWITTER_CLIENT_ID");
const twitterSecret = envStr("TWITTER_CLIENT_SECRET");
const nextAuthSecret = envStr("NEXTAUTH_SECRET");
const nextAuthUrl    = envStr("NEXTAUTH_URL");

if (typeof window === "undefined") {
  console.log("[next-auth] config check:", {
    NEXTAUTH_URL:    nextAuthUrl ?? "MISSING",
    NEXTAUTH_SECRET: nextAuthSecret ? "set" : "MISSING",
    GOOGLE:  googleId  && googleSecret  ? "configured" : "missing",
    GITHUB:  githubId  && githubSecret  ? "configured" : "missing",
    TWITTER: twitterId && twitterSecret ? "configured" : "missing",
  });
  if (nextAuthUrl?.endsWith("/")) {
    console.warn("[next-auth] NEXTAUTH_URL ends with trailing slash — remove it.");
  }
}

const providers: NextAuthOptions["providers"] = [];

if (googleId && googleSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleId,
      clientSecret: googleSecret,
      authorization: { params: { prompt: "consent", access_type: "offline", response_type: "code" } },
    })
  );
}

if (githubId && githubSecret) {
  providers.push(GitHubProvider({ clientId: githubId, clientSecret: githubSecret }));
}

/**
 * X / Twitter — OAuth 1.0a (more reliable with NextAuth v4 than OAuth 2.0)
 *
 * Setup at: https://developer.twitter.com/en/portal/projects
 * Enable "OAuth 1.0a" in your app settings (not just 2.0)
 * Callback URL: http://localhost:3000/api/auth/callback/twitter
 *
 * .env.local:
 *   TWITTER_CLIENT_ID=     ← API Key (not Client ID)
 *   TWITTER_CLIENT_SECRET= ← API Secret (not Client Secret)
 *
 * IMPORTANT: In the Twitter developer portal:
 *   App permissions → Read
 *   Callback URL → http://localhost:3000/api/auth/callback/twitter
 *   Website URL  → http://localhost:3000
 *   Do NOT enable "Request email from users" unless you add the email scope
 */
if (twitterId && twitterSecret) {
  providers.push(
    TwitterProvider({
      clientId: twitterId,
      clientSecret: twitterSecret,
      // OAuth 1.0a — omit version field entirely for v4 compatibility
    })
  );
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.provider = account.provider;
        if (account.provider === "twitter") {
          const p = profile as { screen_name?: string; name?: string } | undefined;
          token.twitterUsername = p?.screen_name ?? null;
          if (!token.name && p?.name) token.name = p.name;
        }
      }
      if (profile && !token.name) {
        const p = profile as { name?: string; login?: string };
        token.name = p.name ?? p.login ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-expect-error extending Session.user
        session.user.provider = token.provider;
        // @ts-expect-error extending Session.user
        session.user.twitterUsername = token.twitterUsername ?? null;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, metadata) { console.error("[next-auth][error]", code, metadata); },
    warn(code)            { console.warn("[next-auth][warn]", code); },
    debug(code, metadata) { if (process.env.NODE_ENV === "development") console.log("[next-auth][debug]", code, metadata); },
  },
};