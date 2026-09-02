"use client";
// FILE: app/auth/zklogin/callback/page.tsx
// OAuth returns here with #id_token=.... complete zkLogin and land on /passport.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseIdTokenFromCallbackHash, loadUserSession } from "@/lib/sui/zklogin/session";
import { completeGoogleZkLogin } from "@/lib/sui/zklogin/completeLogin";
import { clearLoginInFlight } from "@/lib/sui/zklogin/loginInFlight";
import { logAuthEvent } from "@/lib/sui/zklogin/authDebug";
import {
  buildPassportRecoveryQuery,
  ZkLoginSignInRecoveryError,
} from "@/lib/sui/zklogin/signInRecovery";
import { consumePartnerVerifyResumePath } from "@/lib/partner/partnerVerifyResume";

export default function ZkLoginCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [errorMsg, setErrorMsg] = useState("");
  const finishedRef = useRef(false);

  useEffect(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    async function finish() {
      try {
        const resumePath = consumePartnerVerifyResumePath();

        const existing = loadUserSession();
        if (existing?.suiAddress) {
          router.replace(resumePath ?? "/passport?signed_in=1");
          return;
        }

        const idToken = parseIdTokenFromCallbackHash(window.location.hash);
        if (!idToken) {
          throw new Error("No id_token in callback URL. Check Google OAuth redirect settings.");
        }
        await completeGoogleZkLogin(idToken, { callbackHash: window.location.hash });
        router.replace(resumePath ?? "/passport?signed_in=1");
      } catch (err) {
        clearLoginInFlight();
        const message = err instanceof Error ? err.message : "Sign-in failed";
        logAuthEvent("oauth_callback_error", { error: message });
        setStatus("error");
        setErrorMsg(message);
        if (err instanceof ZkLoginSignInRecoveryError) {
          router.replace(`/passport?${buildPassportRecoveryQuery({
            message,
            suggestedMode: err.suggestedMode,
            createdAt: new Date().toISOString(),
          })}`);
          return;
        }
        router.replace(`/passport?sign_in_error=${encodeURIComponent(message)}`);
      }
    }
    void finish();
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #060810)",
        color: "var(--text-primary, #fff)",
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 380, padding: "2rem" }}>
        {status === "working" ? (
          <>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Signing you in
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted, rgba(255,255,255,0.5))" }}>
              Linking your Google account to your Passport…
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
