"use client";
// FILE: app/auth/callback/page.tsx
// THE MISSING PIECE, Supabase sends the magic link, but nothing was
// ever built to receive it. This page completes the loop: verify the
// session Supabase just created from the email link, create (or fetch)
// the user's Solana wallet, store the session locally, and land them
// in the dashboard. This is the zkLogin-style behavior, click the
// email link, land with a real wallet and profile, no separate signup.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function complete() {
      try {
        // Supabase's client SDK auto-detects the auth token in the URL
        // and creates a session, we just need to wait for it and read it.
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.user?.email) {
          throw new Error(error?.message ?? "No session found in the link");
        }

        const email = data.session.user.email;
        localStorage.setItem("abraxas_email", email);

        // Create or fetch the wallet tied to this email, idempotent,
        // safe to call every time someone logs in.
        const walletRes = await fetch("/api/auth/wallet/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const walletData = await walletRes.json() as { publicKey?: string; error?: string };
        if (walletData.publicKey) {
          localStorage.setItem("abraxas_credential_v1", walletData.publicKey);
        }

        router.push("/dashboard");
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      }
    }
    complete();
  }, [router]);

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
                   justifyContent:"center", background:"#060810",
                   color:"#fff", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign:"center", maxWidth:340, padding:"2rem" }}>
        {status === "working" ? (
          <>
            <div style={{ fontSize:"0.95rem", fontWeight:600, marginBottom:"0.5rem" }}>
              Setting up your account
            </div>
            <div style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.5)" }}>
              Confirming your email and creating your wallet...
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize:"0.95rem", fontWeight:600, marginBottom:"0.5rem",
                           color:"#EF4444" }}>
              Couldn't complete sign in
            </div>
            <div style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.5)",
                           marginBottom:"1rem" }}>
              {errorMsg}
            </div>
            <a href="/terminal?signin=1" style={{ color:"#10B981", fontSize:"0.8rem",
                                                    textDecoration:"none" }}>
              Try signing in again →
            </a>
          </>
        )}
      </div>
    </div>
  );
}
