"use client";
// FILE: components/EmailWalletLogin.tsx
// Native Solana email login. No Privy, no EVM dependency chain.
// Email -> Supabase magic link -> click link -> server generates a
// real Solana keypair tied to that email. User never sees a seed phrase.

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";
const G = "#10B981";
const BDR = "#E5E5E0";

interface EmailWalletLoginProps {
  onWalletReady: (publicKey: string, email: string) => void;
}

export function EmailWalletLogin({ onWalletReady }: EmailWalletLoginProps) {
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    // If returning from a magic link, Supabase session will be present.
    supabase.auth.getSession().then(async ({ data }) => {
      const userEmail = data.session?.user?.email;
      if (userEmail) {
        await provisionWallet(userEmail);
      }
    });
  }, []);

  async function provisionWallet(userEmail: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/wallet/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json() as { publicKey?: string; error?: string };
      if (data.publicKey) {
        onWalletReady(data.publicKey, userEmail);
      } else {
        setError(data.error ?? "Wallet creation failed");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink() {
    if (!email.includes("@")) { setError("Enter a valid email"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { sent?: boolean; error?: string };
      if (data.sent) {
        setSent(true);
      } else {
        setError(data.error ?? "Could not send link");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={{ padding:"1rem", borderRadius:8, background:`${G}08`,
                     border:`1px solid ${G}25`, textAlign:"center" }}>
        <div style={{ fontFamily:M, fontSize:"0.7rem", fontWeight:700,
                       color:G, letterSpacing:"0.08em", marginBottom:"0.375rem" }}>
          CHECK YOUR EMAIL
        </div>
        <div style={{ fontFamily:S, fontSize:"0.78rem",
                       color:"rgba(21,21,26,0.5)" }}>
          Magic link sent to {email}. Click it to finish creating your wallet.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
      <div style={{ display:"flex", gap:"0.5rem" }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com"
          style={{ flex:1, padding:"0.6rem 0.75rem", borderRadius:5,
                    border:`1px solid ${BDR}`, background:"#FFFFFF",
                    color:"#15151A", fontFamily:S, fontSize:"16px", outline:"none" }}
        />
        <button
          onClick={sendMagicLink}
          disabled={loading}
          style={{ padding:"0.6rem 1.25rem", borderRadius:5, border:"none",
                    background:G, color:"#000", fontFamily:M,
                    fontSize:"0.7rem", fontWeight:900, cursor:"pointer",
                    letterSpacing:"0.05em", textTransform:"uppercase",
                    opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "..." : "SIGN IN"}
        </button>
      </div>
      {error && (
        <div style={{ fontFamily:M, fontSize:"0.62rem", color:"#EF4444" }}>{error}</div>
      )}
      <div style={{ fontFamily:S, fontSize:"0.65rem",
                     color:"rgba(21,21,26,0.25)" }}>
        No password, no seed phrase. A Solana wallet is created for you automatically.
      </div>
    </div>
  );
}
