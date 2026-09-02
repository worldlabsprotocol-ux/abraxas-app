"use client";
// FILE: components/partner/PartnerVerifyClient.tsx
// Abraxas Verify entry — lazy Passport creation, permission or policy routing.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { Btn } from "@/components/redesign/ui";
import { getPermissionDefinition } from "@/lib/verify/permissions";
import { ensureBrowserSession } from "@/lib/auth/ensureBrowserSession";
import { useGoogleSignIn } from "@/lib/hooks/useGoogleSignIn";
import {
  parsePartnerVerifyResumeParams,
  savePartnerVerifyResume,
} from "@/lib/partner/partnerVerifyResume";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "var(--accent)";
const BROWSER_SESSION_AUTH_ERROR = "Sign in required in this browser";
const MAX_AUTH_RETRIES = 3;

interface FlowResult {
  next: string;
  redirect_url?: string;
  passport_url?: string;
  reason_codes?: string[];
  error?: string;
}

type ViewState = "loading" | "invalid_link" | "sign_in" | "evaluating" | "success" | "error";

function describeInvalidLink(input: {
  relyingPartyId: string;
  returnUrl: string;
  policyId: string;
  permission: string;
}): string | null {
  const missing: string[] = [];
  if (!input.relyingPartyId) missing.push("partner identifier (relying_party_id)");
  if (!input.returnUrl) missing.push("return URL (return_url)");
  if (!input.policyId && !input.permission) missing.push("permission or policy to verify");
  if (missing.length === 0) return null;
  if (missing.length === 1) {
    return `This link is missing the ${missing[0]}. Ask the site that sent you here for a fresh Partner Flow link.`;
  }
  return `This link is missing ${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}. Ask the site that sent you here for a fresh Partner Flow link.`;
}

function isBrowserSessionAuthError(message: string): boolean {
  return message === BROWSER_SESSION_AUTH_ERROR
    || message.toLowerCase().includes("sign in again")
    || message.toLowerCase().includes("oauth session expired");
}

function InvalidLinkPanel({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        padding: "1rem 1.1rem",
        borderRadius: 14,
        border: "1px solid rgba(239,68,68,0.35)",
        background: "rgba(239,68,68,0.08)",
      }}
    >
      <h2 style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
        This verification link isn&apos;t valid
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
        {message}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
        <Btn href="/" size="sm">Return home</Btn>
        <Btn href="/docs/partner-flow" variant="secondary" size="sm">Partner Flow docs</Btn>
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", margin: "0.85rem 0 0", lineHeight: 1.55 }}>
        If you followed a link from a partner site, contact that partner&apos;s support — they issue the redirect URL with the required parameters.
      </p>
    </div>
  );
}

export function PartnerVerifyClient() {
  const searchParams = useSearchParams();
  const { suiAddress, isLoading: authLoading } = useSuiAuth();
  const { signIn, busy: signInBusy, configured: signInConfigured, disabled: signInDisabled, error: signInError } = useGoogleSignIn();

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [needsBrowserSession, setNeedsBrowserSession] = useState(false);
  const [authRetryCount, setAuthRetryCount] = useState(0);
  const evaluateInFlightRef = useRef(false);

  const relyingPartyId = searchParams.get("relying_party_id")
    ?? searchParams.get("partner_id")
    ?? "";
  const permission = searchParams.get("permission") ?? "";
  const permissionVersion = searchParams.get("permission_version") ?? "";
  const policyId = searchParams.get("policy_id") ?? "";
  const returnUrl = searchParams.get("return_url") ?? "";

  const invalidLinkMessage = useMemo(
    () => describeInvalidLink({ relyingPartyId, returnUrl, policyId, permission }),
    [relyingPartyId, returnUrl, policyId, permission],
  );

  const permissionLabel = useMemo(() => {
    if (!permission) return null;
    return getPermissionDefinition(permission)?.consentLabel ?? permission;
  }, [permission]);

  useEffect(() => {
    if (invalidLinkMessage) return;
    const resumeParams = parsePartnerVerifyResumeParams(searchParams);
    if (resumeParams) savePartnerVerifyResume(resumeParams);
  }, [invalidLinkMessage, searchParams]);

  const evaluate = useCallback(async (options?: { forceReauth?: boolean }) => {
    if (invalidLinkMessage || evaluateInFlightRef.current) return;

    if (!suiAddress) {
      setNeedsBrowserSession(true);
      setStatusMessage("Sign in to continue with Abraxas.");
      return;
    }

    evaluateInFlightRef.current = true;
    setEvaluating(true);
    setFlowError(null);
    setStatusMessage("Checking your credentials…");

    try {
      const browserSession = await ensureBrowserSession(suiAddress);
      if (!browserSession.ok) {
        setNeedsBrowserSession(true);
        setStatusMessage("Sign in to continue with Abraxas.");
        if (options?.forceReauth) {
          setAuthRetryCount((count) => count + 1);
        }
        return;
      }

      setNeedsBrowserSession(false);

      const res = await fetch("/api/v1/partner-flow/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          relying_party_id: relyingPartyId,
          permission: permission || undefined,
          permission_version: permissionVersion || undefined,
          policy_id: policyId || undefined,
          return_url: returnUrl,
        }),
      });
      const data = await res.json() as FlowResult;

      if (!res.ok) {
        const message = data.error ?? "Evaluation failed";
        if (res.status === 401 && isBrowserSessionAuthError(message)) {
          setNeedsBrowserSession(true);
          setStatusMessage("Sign in to continue with Abraxas.");
          if (options?.forceReauth) {
            setAuthRetryCount((count) => count + 1);
          }
          return;
        }
        throw new Error(message);
      }

      if (data.next === "enter" && data.redirect_url) {
        setStatusMessage("Verified — returning…");
        window.location.href = data.redirect_url;
        return;
      }
      if (data.next === "passport" && data.passport_url) {
        setStatusMessage("Completing verification…");
        window.location.href = data.passport_url;
        return;
      }
      if (data.next === "pending_review") {
        setStatusMessage("Your verification is under review. Check back after approval.");
        return;
      }
      if (data.next === "denied") {
        setFlowError(`Access denied${data.reason_codes?.length ? `: ${data.reason_codes.join(", ")}` : "."}`);
        return;
      }
      setStatusMessage(`Next step: ${data.next}`);
    } catch (e) {
      setFlowError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setEvaluating(false);
      evaluateInFlightRef.current = false;
    }
  }, [
    invalidLinkMessage,
    suiAddress,
    relyingPartyId,
    permission,
    permissionVersion,
    policyId,
    returnUrl,
  ]);

  useEffect(() => {
    if (authLoading || invalidLinkMessage) return;
    if (!suiAddress) {
      setNeedsBrowserSession(true);
      setStatusMessage("Sign in to continue with Abraxas.");
      return;
    }
    void evaluate();
  }, [authLoading, invalidLinkMessage, suiAddress, evaluate]);

  const handleSignIn = useCallback(() => {
    const resumeParams = parsePartnerVerifyResumeParams(searchParams);
    if (resumeParams) savePartnerVerifyResume(resumeParams);
    void signIn();
  }, [searchParams, signIn]);

  const handleTryAgain = useCallback(() => {
    if (needsBrowserSession) {
      if (authRetryCount >= MAX_AUTH_RETRIES) {
        setFlowError("Sign-in could not be confirmed in this browser. Use Sign in with Google below, then return here.");
        return;
      }
      void evaluate({ forceReauth: true });
      return;
    }
    void evaluate();
  }, [needsBrowserSession, authRetryCount, evaluate]);

  let view: ViewState = "loading";
  if (!authLoading) {
    if (invalidLinkMessage) view = "invalid_link";
    else if (!suiAddress || needsBrowserSession) view = "sign_in";
    else if (evaluating) view = "evaluating";
    else if (flowError) view = "error";
    else view = "success";
  }

  return (
    <div style={{
      maxWidth: 520, margin: "3rem auto", padding: "1.5rem",
      fontFamily: FONT, color: "var(--text-primary)",
      background: "var(--surface-raised)", borderRadius: 16,
      border: "1px solid var(--border-strong)",
    }}>
      <div style={{ fontSize: "0.7rem", color: "#a78bfa", letterSpacing: "0.1em", marginBottom: 8 }}>
        ABRAXAS VERIFY
      </div>

      {view === "loading" && (
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-muted)", margin: 0 }}>
          Preparing verification…
        </p>
      )}

      {view === "invalid_link" && invalidLinkMessage && (
        <InvalidLinkPanel message={invalidLinkMessage} />
      )}

      {view !== "loading" && view !== "invalid_link" && (
        <>
          <h1 style={{ fontSize: "1.15rem", margin: "0 0 0.75rem", fontWeight: 800 }}>
            Continue with Abraxas
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 1rem" }}>
            {permissionLabel
              ? <>Verifying: <strong>{permissionLabel}</strong></>
              : policyId
                ? <>Policy <strong>{policyId}</strong></>
                : "Partner verification request"}
          </p>

          {view === "sign_in" && (
            <div style={{ marginBottom: "1rem" }}>
              {signInConfigured ? (
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={signInDisabled}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.55rem 1rem",
                    borderRadius: 999,
                    border: "none",
                    background: "#10B981",
                    color: "#000",
                    fontFamily: FONT,
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: signInBusy ? "wait" : "pointer",
                    opacity: signInBusy ? 0.75 : 1,
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>G</span>
                  {signInBusy ? "Redirecting…" : "Sign in with Google"}
                </button>
              ) : (
                <Btn href="/passport" size="sm">Sign in</Btn>
              )}
              {signInError && (
                <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: "0.5rem 0 0", lineHeight: 1.45 }}>
                  {signInError}
                </p>
              )}
            </div>
          )}

          {(view === "evaluating" || view === "success") && statusMessage && (
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>{statusMessage}</p>
          )}

          {view === "error" && flowError && (
            <div role="alert">
              <p style={{ fontSize: "0.84rem", color: "#EF4444", margin: "0 0 1rem", lineHeight: 1.55 }}>
                {flowError}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
                <Btn onClick={handleTryAgain} disabled={evaluating || authRetryCount >= MAX_AUTH_RETRIES} size="sm">
                  {evaluating ? "Retrying…" : "Try again"}
                </Btn>
                <Btn href="/" variant="secondary" size="sm">Return home</Btn>
                <Btn href="/docs/partner-flow" variant="ghost" size="sm">Partner Flow docs</Btn>
              </div>
            </div>
          )}
        </>
      )}

      {view === "sign_in" && statusMessage && (
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0.75rem 0 0" }}>{statusMessage}</p>
      )}

      {view !== "invalid_link" && view !== "loading" && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "1rem 0 0", lineHeight: 1.5 }}>
          Questions about this request?{" "}
          <Link href="/docs/partner-flow" style={{ color: ACCENT, textDecoration: "none", fontWeight: 600 }}>
            Read Partner Flow docs
          </Link>
        </p>
      )}
    </div>
  );
}
