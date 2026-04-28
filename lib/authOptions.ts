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

const googleId     = envStr("GOOGLE_CLIENT_ID");
const googleSecret = envStr("GOOGLE_CLIENT_SECRET");
const githubId     = envStr("GITHUB_ID");
const githubSecret = envStr("GITHUB_SECRET");
const twitterId    = envStr("TWITTER_CLIENT_ID");
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
 * X / Twitter OAuth 2.0
 * Setup at: https://developer.twitter.com/en/portal/projects
 * Callback URL: https://abraxas-app.vercel.app/api/auth/callback/twitter
 * Required scopes: tweet.read, users.read, offline.access
 * Add to .env.local:
 *   TWITTER_CLIENT_ID=
 *   TWITTER_CLIENT_SECRET=
 */
if (twitterId && twitterSecret) {
  providers.push(
    TwitterProvider({
      clientId: twitterId,
      clientSecret: twitterSecret,
      version: "2.0",
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
        // Persist Twitter username for display
        if (account.provider === "twitter") {
          const p = profile as { data?: { username?: string; name?: string } };
          token.twitterUsername = p?.data?.username ?? null;
          if (!token.name && p?.data?.name) token.name = p.data.name;
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