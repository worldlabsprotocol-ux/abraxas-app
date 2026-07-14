"use client";
// FILE: app/auth/zklogin/callback/page.tsx
// OAuth returns here with #id_token=.... complete zkLogin and land on /passport.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { consumePostLoginReturn } from "@/lib/auth/postLoginReturn";
import { parseIdTokenFromCallbackHash, loadUserSession } from "@/lib/sui/zklogin/session";
import { completeGoogleZkLogin } from "@/lib/sui/zklogin/completeLogin";
import { emailFromIdToken, mapZkLoginCompletionError } from "@/lib/auth/zkLoginErrors";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function ZkLoginCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [errorMsg, setErrorMsg] = useState("");
  const [hintEmail, setHintEmail] = useState<string | null>(null);

  useEffect(() => {
    async function finish() {
      let idToken: string | null = null;
      try {
        idToken = parseIdTokenFromCallbackHash(window.location.hash);
        if (!idToken) {
          throw new Error("Google did not return a sign-in token. Try again from Passport.");
        }
        const googleEmail = emailFromIdToken(idToken);
        if (googleEmail) setHintEmail(googleEmail);

        await completeGoogleZkLogin(idToken);
        const returnPath = consumePostLoginReturn();
        router.replace(returnPath ?? "/passport?signed_in=1");
      } catch (err) {
        setStatus("error");
        setErrorMsg(mapZkLoginCompletionError(err, idToken));
        const existing = loadUserSession();
        if (existing?.email) setHintEmail(existing.email);
        else if (idToken) {
          const googleEmail = emailFromIdToken(idToken);
          if (googleEmail) setHintEmail(googleEmail);
        }
      }
    }
    finish();
  }, [router]);

  return (
    <div data-theme="dark" className="abx-institutional-shell" style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT,
    }}>
      <div style={{ textAlign: "center", maxWidth: 440, padding: "2rem" }}>
        {status === "working" ? (
          <>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
              Creating your Sui identity
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              Linking your Passport wallet…
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.65rem", color: "#EF4444" }}>
              Sign-in incomplete
            </div>
            {hintEmail && (
              <p style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600, margin: "0 0 0.65rem" }}>
                Google account: {hintEmail}
              </p>
            )}
            <div style={{
              fontSize: "0.82rem", color: "var(--text-secondary)",
              marginBottom: "1.25rem", lineHeight: 1.65, textAlign: "left",
            }}>
              {errorMsg}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
              <Btn href="/passport" size="sm">Back to Passport →</Btn>
              <Link href="/passport" style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", textDecoration: "none" }}>
                Use Sign out in the top right if you need a different Google account
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
