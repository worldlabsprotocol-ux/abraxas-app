// FILE: app/login/page.tsx
// Wallet-only login. OAuth removed.
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/authState";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

export default function LoginPage() {
  const router = useRouter();
  const { walletConnected } = useAuth();

  useEffect(() => {
    if (walletConnected) router.push("/dashboard");
  }, [walletConnected, router]);

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "5rem 1.25rem", textAlign: "center" }}>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.75rem", marginBottom: "0.625rem" }}>Connect wallet</h1>
      <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "2rem", lineHeight: 1.6 }}>
        Phantom or Solflare to get started.
      </p>
      <ConnectWalletButton size="lg" />
    </div>
  );
}