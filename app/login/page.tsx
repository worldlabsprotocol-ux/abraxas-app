"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useToast } from "@/lib/toastState";
import Link from "next/link";

function describeError(code: string | null): string | null {
  if (!code) return null;
  if (code === "OAuthCallback" || code === "OAuthSignin") return "Sign-in was cancelled or the connection failed. Try again.";
  if (code === "Configuration") return "Server configuration error. Check NEXTAUTH_SECRET and NEXTAUTH_URL in Vercel.";
  return `Sign-in error: ${code}`;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { connected } = useWallet();
  const { showToast } = useToast();
  const errorCode = searchParams?.get("error") ?? null;

  useEffect(() => {
    if (connected) { showToast("Wallet connected."); router.push("/app"); }
  }, [connected, router, showToast]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) router.push("/app");
  }, [status, session, router]);

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1.5rem" }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.4)", background: "radial-gradient(circle at 40% 40%, rgba(200,169,110,0.18), transparent 70%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 16px var(--gold)" }} />
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.35rem", letterSpacing: "-0.01em", marginBottom: "0.4rem" }}>
            Enter Abraxas
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
            Connect your wallet to access vaults,<br />deposit capital, and operate assets.
          </p>
        </div>

        {/* Error */}
        {errorCode && (
          <div style={{ marginBottom: "1.5rem", padding: "0.875rem 1rem", borderRadius: "10px", background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.2)" }}>
            <p style={{ fontSize: "0.75rem", color: "#f26b6b", lineHeight: 1.6 }}>{describeError(errorCode)}</p>
          </div>
        )}

        {/* Primary: Connect Wallet */}
        <div style={{ marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.625rem", textAlign: "center" }}>
            Connect wallet to get started
          </p>
          <ConnectWalletButton size="lg" className="block w-full" />
        </div>

        {/* Supported wallets */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "2rem" }}>
          {["Phantom", "Solflare", "Backpack"].map((w) => (
            <span key={w} style={{ fontSize: "0.62rem", color: "var(--subtle)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "4px", padding: "0.2rem 0.5rem" }}>
              {w}
            </span>
          ))}
        </div>

        {/* Info */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {[
              { icon: "◎", text: "Non-custodial — you keep ownership of all assets" },
              { icon: "◈", text: "Token-2022 position minted to your wallet on deposit" },
              { icon: "◉", text: "Circuit defense protects every position automatically" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                <span style={{ color: "var(--gold)", fontSize: "0.75rem", flexShrink: 0, marginTop: "0.1rem" }}>{icon}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.55 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: "0.65rem", color: "var(--subtle)", textAlign: "center", marginTop: "1.25rem", lineHeight: 1.6 }}>
          OG ETH holders →{" "}
          <Link href="/access" style={{ color: "var(--gold)", textDecoration: "none" }}>verify on /access</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--subtle)", fontSize: "0.875rem" }}>Loading…</div></div>}>
      <LoginContent />
    </Suspense>
  );
}