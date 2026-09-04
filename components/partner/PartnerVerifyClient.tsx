"use client";
// FILE: components/partner/PartnerVerifyClient.tsx
// Partner verify orchestration — auth/session gating and institutional shell.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { ensureBrowserSessionReady } from "@/lib/auth/ensureBrowserSession";
import { useGoogleSignIn } from "@/lib/hooks/useGoogleSignIn";
import {
  createPartnerVerifyCorrelationId,
  logPartnerVerifyAuthEvent,
} from "@/lib/partner/partnerVerifyAuthDebug";
import {
  resolvePartnerDisplayName,
  resolvePartnerHomeUrl,
  resolvePartnerReturnLabel,
  resolvePolicyRequirement,
} from "@/lib/partner/partnerVerifyDisplay";
import {
  PARTNER_AUTH_READY_QUERY,
  PARTNER_AUTH_READY_VALUE,
  parsePartnerVerifyResumeParams,
  savePartnerVerifyResume,
} from "@/lib/partner/partnerVerifyResume";
import { clearLoginInFlight, clearStaleLoginInFlight, isLoginInFlight } from "@/lib/sui/zklogin/loginInFlight";
import {
  mapFlowNextStepToJourneyState,
  resolvePartnerJourneyPresentation,
} from "@/lib/partner/partnerJourneyStateMachine";
import { PartnerVerifyShell, type PartnerVerifyPhase } from "./PartnerVerifyShell";

interface FlowResult {
  next: string;
  redirect_url?: string;
  passport_url?: string;
  reason_codes?: string[];
  error?: string;
  journey_state?: string;
  customer_message?: string;
}

const BROWSER_SESSION_AUTH_ERROR = "Sign in required in this browser";

function describeInvalidLink(input: {
  relyingPartyId: string;
  returnUrl: string;
  policyId: string;
  permission: string;
}): string | null {
  const missing: string[] = [];
  if (!input.relyingPartyId) missing.push("partner identifier");
  if (!input.returnUrl) missing.push("return URL");
  if (!input.policyId && !input.permission) missing.push("policy or permission");
  if (missing.length === 0) return null;
  return `This verification link is missing required parameters (${missing.join(", ")}). Ask the partner site for a fresh Partner Flow link.`;
}

function isBrowserSessionAuthError(message: string): boolean {
  return message === BROWSER_SESSION_AUTH_ERROR
    || message.toLowerCase().includes("sign in again")
    || message.toLowerCase().includes("oauth session expired");
}

function stripPartnerAuthReadyFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get(PARTNER_AUTH_READY_QUERY) !== PARTNER_AUTH_READY_VALUE) return false;
  params.delete(PARTNER_AUTH_READY_QUERY);
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
  window.history.replaceState(null, "", next);
  return true;
}

interface PartnerVerifyClientProps {
  previewPhase?: PartnerVerifyPhase | null;
  previewSignInConfigured?: boolean;
}

export function PartnerVerifyClient({
  previewPhase = null,
  previewSignInConfigured = false,
}: PartnerVerifyClientProps) {
  const searchParams = useSearchParams();
  const { suiAddress, isLoading: authLoading, signInWithGoogle } = useSuiAuth();
  const { signIn, busy: signInBusy, configured: signInConfigured } = useGoogleSignIn();

  const [phase, setPhase] = useState<PartnerVerifyPhase>(previewPhase ?? "loading");
  const [statusMessage, setStatusMessage] = useState("Preparing verification…");
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [oauthReturnReady, setOauthReturnReady] = useState(false);

  const evaluateOnceRef = useRef(false);
  const signInOnceRef = useRef(false);
  const correlationRef = useRef<string | null>(null);

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

  const partnerName = resolvePartnerDisplayName(relyingPartyId);
  const partnerReturnLabel = resolvePartnerReturnLabel(relyingPartyId);
  const partnerHomeUrl = resolvePartnerHomeUrl(relyingPartyId);
  const policyRequirement = resolvePolicyRequirement(policyId, permission || null);

  useEffect(() => {
    clearStaleLoginInFlight();
    if (stripPartnerAuthReadyFromUrl()) {
      clearLoginInFlight();
      setOauthReturnReady(true);
      evaluateOnceRef.current = false;
      signInOnceRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (previewPhase) setPhase(previewPhase);
  }, [previewPhase]);

  useEffect(() => {
    if (invalidLinkMessage) return;
    const resumeParams = parsePartnerVerifyResumeParams(searchParams);
    if (resumeParams) savePartnerVerifyResume(resumeParams);
  }, [invalidLinkMessage, searchParams]);

  useEffect(() => {
    if (suiAddress) clearLoginInFlight();
  }, [suiAddress]);

  const runEvaluate = useCallback(async () => {
    if (invalidLinkMessage || !suiAddress) return;
    if (evaluateOnceRef.current) return;
    evaluateOnceRef.current = true;

    const cid = correlationRef.current ?? createPartnerVerifyCorrelationId();
    correlationRef.current = cid;
    setCorrelationId(cid);

    setPhase("preparing");
    setStatusMessage("Preparing secure verification…");
    logPartnerVerifyAuthEvent("partner_evaluate_started", { correlationId: cid });

    try {
      const browserSession = await ensureBrowserSessionReady(suiAddress);
      if (!browserSession.ok) {
        logPartnerVerifyAuthEvent("partner_evaluate_result", {
          correlationId: cid,
          outcome: "browser_session_missing",
          errorCode: "browser_session",
        });
        evaluateOnceRef.current = false;
        setPhase("sign_in");
        setStatusMessage("Sign in to continue with Abraxas.");
        return;
      }

      setPhase("verifying");
      setStatusMessage("Verifying policy…");

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
          logPartnerVerifyAuthEvent("partner_evaluate_result", {
            correlationId: cid,
            outcome: "auth_required",
            errorCode: "401",
          });
          evaluateOnceRef.current = false;
          setPhase("sign_in");
          setStatusMessage("Sign in to continue with Abraxas.");
          return;
        }
        throw new Error("verification_failed");
      }

      logPartnerVerifyAuthEvent("partner_evaluate_result", {
        correlationId: cid,
        outcome: data.next,
      });

      if (data.next === "enter" && data.redirect_url) {
        setPhase("returning");
        setStatusMessage(data.customer_message ?? "Returning to partner…");
        try {
          window.location.assign(data.redirect_url);
        } catch {
          setPhase("return_failed");
          setStatusMessage("We could not return you automatically. Use the button below.");
        }
        return;
      }
      if (data.next === "passport" && data.passport_url) {
        setPhase("returning");
        setStatusMessage(data.customer_message ?? "Continuing verification…");
        window.location.assign(data.passport_url);
        return;
      }
      if (data.next === "pending_review") {
        setPhase("pending_review");
        const journey = data.journey_state
          ? resolvePartnerJourneyPresentation(mapFlowNextStepToJourneyState("pending_review"))
          : null;
        setStatusMessage(data.customer_message ?? journey?.customer_message ?? "Your verification is under review.");
        return;
      }
      if (data.next === "denied") {
        setPhase("denied");
        const journey = resolvePartnerJourneyPresentation(mapFlowNextStepToJourneyState("denied"));
        setStatusMessage(data.customer_message ?? journey.customer_message);
        return;
      }
      setPhase("verifying");
      setStatusMessage("Verification ready.");
    } catch {
      logPartnerVerifyAuthEvent("partner_evaluate_result", {
        correlationId: cid,
        outcome: "error",
        errorCode: "evaluate_failed",
      });
      evaluateOnceRef.current = false;
      setPhase("error");
      setStatusMessage("Verification could not be completed.");
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
    if (authLoading) {
      if (previewPhase) return;
      setPhase("loading");
      return;
    }
    if (previewPhase) return;
    if (invalidLinkMessage) {
      setPhase("invalid_link");
      return;
    }
    if (!suiAddress) {
      setPhase("sign_in");
      setStatusMessage("Sign in to continue with Abraxas.");
      return;
    }
    if (oauthReturnReady || !evaluateOnceRef.current) {
      void runEvaluate();
    }
  }, [authLoading, invalidLinkMessage, suiAddress, oauthReturnReady, runEvaluate, previewPhase]);

  const handleSignIn = useCallback(async () => {
    if (signInOnceRef.current || signInBusy || isLoginInFlight()) return;
    signInOnceRef.current = true;

    const resumeParams = parsePartnerVerifyResumeParams(searchParams);
    if (resumeParams) savePartnerVerifyResume(resumeParams);

    clearStaleLoginInFlight();
    if (isLoginInFlight()) clearLoginInFlight();

    const cid = createPartnerVerifyCorrelationId();
    correlationRef.current = cid;
    setCorrelationId(cid);
    logPartnerVerifyAuthEvent("auth_start", { correlationId: cid });

    setPhase("signing_in");
    setStatusMessage("Signing you in…");

    const redirected = signInWithGoogle
      ? await signInWithGoogle()
      : await signIn();

    if (!redirected) {
      signInOnceRef.current = false;
      clearLoginInFlight();
      setPhase("sign_in");
      setStatusMessage("Sign in to continue with Abraxas.");
    }
  }, [searchParams, signIn, signInBusy, signInWithGoogle]);

  const handleTryAgain = useCallback(() => {
    evaluateOnceRef.current = false;
    signInOnceRef.current = false;
    clearLoginInFlight();
    clearStaleLoginInFlight();
    if (suiAddress) {
      void runEvaluate();
      return;
    }
    setPhase("sign_in");
  }, [runEvaluate, suiAddress]);

  return (
    <PartnerVerifyShell
      phase={phase}
      partnerId={relyingPartyId}
      partnerName={partnerName}
      policyRequirement={policyRequirement}
      statusMessage={statusMessage}
      signInConfigured={signInConfigured || previewSignInConfigured}
      primaryDisabled={signInBusy || phase === "signing_in"}
      onSignIn={() => { void handleSignIn(); }}
      onTryAgain={handleTryAgain}
      invalidLinkMessage={invalidLinkMessage}
      partnerReturnLabel={partnerReturnLabel}
      partnerHomeUrl={partnerHomeUrl}
    />
  );
}
