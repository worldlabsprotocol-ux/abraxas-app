"use client";
// FILE: app/auth/zklogin/callback/page.tsx
// OAuth returns here with #id_token=.... complete zkLogin and resume partner verify when saved.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logAuthEvent, toAuthErrorCode } from "@/lib/sui/zklogin/authDebug";
import {
  buildPassportRecoveryQuery,
  ZkLoginSignInRecoveryError,
} from "@/lib/sui/zklogin/signInRecovery";
import { clearLoginInFlight } from "@/lib/sui/zklogin/loginInFlight";
import {
  completePartnerVerifyOAuthCallback,
  PartnerVerifyOAuthCallbackError,
} from "@/lib/partner/partnerVerifyOAuthCallback";

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
        const { redirectPath } = await completePartnerVerifyOAuthCallback(window.location.hash);
        router.replace(redirectPath);
      } catch (err) {
        clearLoginInFlight();
        if (err instanceof ZkLoginSignInRecoveryError) {
          const message = err.message;
          logAuthEvent("oauth_callback_error", { errorCode: "recovery_required" });
          router.replace(`/passport?${buildPassportRecoveryQuery({
            message,
            suggestedMode: err.suggestedMode,
            createdAt: new Date().toISOString(),
          })}`);
          return;
        }

        const message = err instanceof PartnerVerifyOAuthCallbackError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Sign-in failed";
        logAuthEvent("oauth_callback_error", {
          errorCode: err instanceof PartnerVerifyOAuthCallbackError
            ? "callback_failed"
            : toAuthErrorCode(message, "callback_failed"),
        });
        setStatus("error");
        setErrorMsg(message);
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
              Securing your session and preparing verification…
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
