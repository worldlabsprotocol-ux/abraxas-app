"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useToast } from "@/lib/toastState";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

/** Map NextAuth error codes to a clear message. */
function describeAuthError(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "OAuthSignin":
    case "OAuthCallback":
    case "OAuthCreateAccount":
    case "Callback":
      return "OAuth provider rejected the request. Verify your callback URL in the provider's dashboard exactly matches /api/auth/callback/<provider>.";
    case "OAuthAccountNotLinked":
      return "This email is already linked to a different provider. Sign in with the original provider you used first.";
    case "AccessDenied":
      return "Access denied. You may have cancelled the sign-in.";
    case "Configuration":
      return "Server misconfiguration. Check NEXTAUTH_SECRET, NEXTAUTH_URL (no trailing slash), and provider client IDs in .env.local. Restart the dev server after editing.";
    default:
      return `Sign-in error: ${code}`;
  }
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { connected: walletConnected } = useWallet();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState<string | null>(null);

  const errorCode = searchParams?.get("error") ?? null;
  const errorMessage = describeAuthError(errorCode);

  // If a wallet connects, route to dashboard
  useEffect(() => {
    if (walletConnected) {
      showToast("Wallet connected.");
      router.push("/app");
    }
  }, [walletConnected, router, showToast]);

  // If already signed in via OAuth, forward
  useEffect(() => {
    if (status === "authenticated" && session?.user && !walletConnected) {
      router.push("/app");
    }
  }, [status, session, walletConnected, router]);

  const handleGoogle = async () => {
    setSubmitting("google");
    try {
      await signIn("google", { callbackUrl: "/app" });
    } catch (err) {
      console.error("[login] google signIn failed:", err);
      setSubmitting(null);
      showToast("Google sign-in failed. Check console + /login error message.");
    }
  };

  const handleGithub = async () => {
    setSubmitting("github");
    try {
      await signIn("github", { callbackUrl: "/app" });
    } catch (err) {
      console.error("[login] github signIn failed:", err);
      setSubmitting(null);
      showToast("GitHub sign-in failed. Check console + /login error message.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px] bg-bg-2 border border-border rounded-[16px] p-8 md:p-10">
        <h1 className="font-display font-bold text-[1.4rem] mb-2">
          Welcome to Abraxas
        </h1>
        <p className="text-sm text-abraxas-muted mb-6 leading-relaxed">
          Sign in to access your dashboard. A wallet is required for asset actions.
        </p>

        {errorMessage && (
          <div className="mb-6 px-4 py-3 rounded-md bg-[rgba(248,113,113,0.06)] border border-[rgba(248,113,113,0.25)]">
            <div className="flex items-start gap-2">
              <span className="text-abraxas-red text-sm flex-shrink-0">!</span>
              <div className="flex-1">
                <p className="text-xs text-abraxas-red font-medium mb-1">
                  Sign-in failed
                </p>
                <p className="text-[0.7rem] text-abraxas-muted leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <button
            onClick={handleGoogle}
            disabled={submitting !== null}
            className="w-full flex items-center gap-3 bg-bg-3 border border-border-2 hover:border-gold rounded-[9px] px-5 py-3.5 text-sm text-abraxas-text transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            <GoogleIcon />
            {submitting === "google" ? "Redirecting…" : "Continue with Google"}
          </button>

          <button
            onClick={handleGithub}
            disabled={submitting !== null}
            className="w-full flex items-center gap-3 bg-bg-3 border border-border-2 hover:border-gold rounded-[9px] px-5 py-3.5 text-sm text-abraxas-text transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            <GitHubIcon />
            {submitting === "github" ? "Redirecting…" : "Continue with GitHub"}
          </button>
        </div>

        <div className="relative text-center text-xs text-abraxas-subtle mb-6">
          <span className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </span>
          <span className="relative bg-bg-2 px-3">or</span>
        </div>

        <ConnectWalletButton size="lg" className="block w-full" />

        <p className="text-xs text-abraxas-subtle text-center mt-5 leading-relaxed">
          Wallet connection is required for listing assets,
          <br />
          activating value, and using capital.
        </p>

        <p className="text-[0.7rem] text-abraxas-subtle text-center mt-4">
          OG ETH holders:{" "}
          <Link href="/access" className="text-gold hover:underline">
            verify holdings on /access
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
          <div className="text-abraxas-subtle text-sm">Loading…</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
