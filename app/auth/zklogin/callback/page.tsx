"use client";
// FILE: app/auth/zklogin/callback/page.tsx
// OAuth returns here with #id_token=.... complete zkLogin and land on /passport.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseIdTokenFromCallbackHash } from "@/lib/sui/zklogin/session";
import { completeGoogleZkLogin } from "@/lib/sui/zklogin/completeLogin";

export default function ZkLoginCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function finish() {
      try {
        const idToken = parseIdTokenFromCallbackHash(window.location.hash);
        if (!idToken) {
          throw new Error("No id_token in callback URL. Check Google OAuth redirect settings.");
        }
        await completeGoogleZkLogin(idToken);
        router.replace("/passport?signed_in=1");
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Sign-in failed");
      }
    }
    finish();
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg, #060810)", color: "var(--text-primary, #fff)", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 380, padding: "2rem" }}>
        {status === "working" ? (
          <>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Creating your Sui identity
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted, rgba(255,255,255,0.5))" }}>
              Deriving your zkLogin address and linking your Passport…
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem", color: "#EF4444" }}>
              Sign-in incomplete
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              {errorMsg}
            </div>
            <a href="/passport" style={{ color: "#10B981", fontSize: "0.8rem", textDecoration: "none" }}>
              Back to Passport →
            </a>
          </>
        )}
      </div>
    </div>
  );
}
