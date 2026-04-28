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

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function describeAuthError(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "OAuthSignin":
    case "OAuthCallback":
    case "OAuthCreateAccount":
    case "Callback":
      return "OAuth provider rejected the request. Check your callback URL matches /api/auth/callback/<provider> exactly.";
    case "OAuthAccountNotLinked":
      return "This email is already linked to a different provider. Sign in with the original provider.";
    case "AccessDenied":
      return "Access denied. You may have cancelled the sign-in.";
    case "Configuration":
      return "Server misconfiguration. Check NEXTAUTH_SECRET, NEXTAUTH_URL (no trailing slash), and provider credentials in .env.local.";
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

  useEffect(() => {
    if (walletConnected) { showToast("Wallet connected."); router.push("/app"); }
  }, [walletConnected, router, showToast]);

  useEffect(() => {
    if (status === "authenticated" && session?.user && !walletConnected) router.push("/app");
  }, [status, session, walletConnected, router]);

  const handle = async (provider: "google" | "github" | "twitter") => {
    setSubmitting(provider);
    try {
      await signIn(provider, { callbackUrl: "/app" });
    } catch {
      setSubmitting(null);
      showToast(`${provider} sign-in failed.`);
    }
  };

  const providers = [
    {
      key: "twitter" as const,
      label: "Continue with X",
      icon: <XIcon />,
      bg: "#000000",
      color: "#ffffff",
      border: "rgba(255,255,255,0.15)",
      primary: true,
    },
    {
      key: "google" as const,
      label: "Continue with Google",
      icon: <GoogleIcon />,
      bg: "var(--surface)",
      color: "var(--text)",
      border: "rgba(255,255,255,0.1)",
      primary: false,
    },
    {
      key: "github" as const,
      label: "Continue with GitHub",
      icon: <GitHubIcon />,
      bg: "var(--surface)",
      color: "var(--text)",
      border: "rgba(255,255,255,0.1)",
      primary: false,
    },
  ];

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1.5rem" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%",
            border: "1px solid rgba(200,169,110,0.4)",
            background: "radial-gradient(circle at 40% 40%, rgba(200,169,110,0.2), transparent 70%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}>
            <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 12px var(--gold)" }} />
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.4rem", letterSpacing: "-0.01em", marginBottom: "0.4rem" }}>
            Enter Abraxas
          </h1>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6 }}>
            Sign in to access your dashboard.<br />A wallet is required for asset actions.
          </p>
        </div>

        {/* Error */}
        {errorMessage && (
          <div style={{ marginBottom: "1.5rem", padding: "0.875rem 1rem", borderRadius: "10px", background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.2)" }}>
            <p style={{ fontSize: "0.75rem", color: "#f26b6b", fontWeight: 600, marginBottom: "0.25rem" }}>Sign-in failed</p>
            <p style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.6 }}>{errorMessage}</p>
          </div>
        )}

        {/* OAuth buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.5rem" }}>
          {providers.map((p) => (
            <button
              key={p.key}
              onClick={() => handle(p.key)}
              disabled={submitting !== null}
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                background: p.bg,
                color: p.color,
                border: `1px solid ${p.border}`,
                borderRadius: "10px",
                padding: "0.875rem 1.25rem",
                fontSize: "0.82rem",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: p.primary ? 600 : 400,
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting && submitting !== p.key ? 0.4 : 1,
                transition: "opacity 0.2s, border-color 0.2s",
                width: "100%",
                textAlign: "left",
              }}
            >
              <span style={{ flexShrink: 0 }}>{p.icon}</span>
              <span style={{ flex: 1 }}>
                {submitting === p.key ? "Redirecting…" : p.label}
              </span>
              {p.primary && (
                <span style={{ fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold)", marginLeft: "auto" }}>
                  Recommended
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ position: "relative", textAlign: "center", marginBottom: "1.5rem" }}>
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
            <span style={{ width: "100%", borderTop: "1px solid rgba(255,255,255,0.06)" }} />
          </span>
          <span style={{ position: "relative", background: "var(--void)", padding: "0 0.75rem", fontSize: "0.7rem", color: "var(--subtle)", letterSpacing: "0.06em" }}>
            or connect wallet
          </span>
        </div>

        {/* Wallet */}
        <ConnectWalletButton size="lg" className="block w-full" />

        {/* Footer */}
        <p style={{ fontSize: "0.68rem", color: "var(--subtle)", textAlign: "center", marginTop: "1.5rem", lineHeight: 1.65 }}>
          Wallet required for deposits, vault access, and asset activation.
        </p>
        <p style={{ fontSize: "0.68rem", color: "var(--subtle)", textAlign: "center", marginTop: "0.75rem" }}>
          OG ETH holders →{" "}
          <Link href="/access" style={{ color: "var(--gold)", textDecoration: "none" }}>verify on /access</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "calc(100vh-60px)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--subtle)", fontSize: "0.875rem" }}>Loading…</div></div>}>
      <LoginContent />
    </Suspense>
  );
}