import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

/**
 * NextAuth configuration — kept in its own file so it can be imported
 * by both the App Router route handler AND server components / API
 * routes that need `getServerSession(authOptions)`.
 *
 * Required env vars (read from process.env, no hardcoding):
 *   NEXTAUTH_SECRET   (required — openssl rand -base64 32)
 *   NEXTAUTH_URL      (required — http://localhost:3000 in dev, NO trailing slash)
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   GITHUB_ID, GITHUB_SECRET
 */

/** Treats undefined / empty / whitespace-only env strings as "missing". */
function envStr(key: string): string | undefined {
  const v = process.env[key];
  if (!v) return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const googleId = envStr("GOOGLE_CLIENT_ID");
const googleSecret = envStr("GOOGLE_CLIENT_SECRET");
const githubId = envStr("GITHUB_ID");
const githubSecret = envStr("GITHUB_SECRET");
const nextAuthSecret = envStr("NEXTAUTH_SECRET");
const nextAuthUrl = envStr("NEXTAUTH_URL");

// One-time startup logging — server-side only, never in client bundle.
// Logs presence of credentials, NEVER the values themselves.
if (typeof window === "undefined") {
  console.log("[next-auth] config check:", {
    NEXTAUTH_URL: nextAuthUrl ?? "MISSING",
    NEXTAUTH_SECRET: nextAuthSecret ? "set" : "MISSING",
    GOOGLE: googleId && googleSecret ? "configured" : "MISSING",
    GITHUB: githubId && githubSecret ? "configured" : "MISSING",
  });

  if (nextAuthUrl?.endsWith("/")) {
    console.warn(
      "[next-auth] NEXTAUTH_URL ends with a trailing slash — this WILL break callbacks. Remove it."
    );
  }
}

const providers: NextAuthOptions["providers"] = [];

if (googleId && googleSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleId,
      clientSecret: googleSecret,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    })
  );
}

if (githubId && githubSecret) {
  providers.push(
    GitHubProvider({
      clientId: githubId,
      clientSecret: githubSecret,
    })
  );
}

export const authOptions: NextAuthOptions = {
  // Pass the secret explicitly so misconfiguration fails loudly rather
  // than silently issuing un-signed JWTs.
  secret: nextAuthSecret,

  providers,

  session: {
    strategy: "jwt",
  },

  // Custom sign-in page. The login page itself reads ?error= and shows
  // a human-readable message when NextAuth bounces a user back here.
  pages: {
    signIn: "/login",
  },

  callbacks: {
    /** Persist OAuth provider name into the JWT. */
    async jwt({ token, account, profile }) {
      if (account) {
        token.provider = account.provider;
      }
      if (profile) {
        const p = profile as { name?: string; login?: string };
        if (!token.name && (p.name || p.login)) {
          token.name = p.name ?? p.login;
        }
      }
      return token;
    },

    /** Surface provider on the session for client UI. */
    async session({ session, token }) {
      if (session.user && token.provider) {
        // @ts-expect-error — extending Session.user
        session.user.provider = token.provider;
      }
      return session;
    },
  },

  // Verbose logs in dev to help diagnose auth failures.
  // These do not leak secrets.
  debug: process.env.NODE_ENV === "development",

  logger: {
    error(code, metadata) {
      console.error("[next-auth][error]", code, metadata);
    },
    warn(code) {
      console.warn("[next-auth][warn]", code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === "development") {
        console.log("[next-auth][debug]", code, metadata);
      }
    },
  },
};
