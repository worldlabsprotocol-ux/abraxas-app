"use client";
// FILE: components/partner/PartnerContinueClient.tsx
// Partner evidence step — not the general Passport dashboard.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { ConsentCeremony } from "@/components/passport/ConsentCeremony";
import { PartnerFlowReturnHandler } from "@/components/partner/PartnerFlowReturnHandler";
import { PartnerJourneyLayout } from "@/components/partner/PartnerJourneyLayout";
import { usePartnerFlowHandoff } from "@/lib/passport/partnerFlowHandoff";
import { usePassportVerification } from "@/lib/hooks/usePassportVerification";
import { computePassportSetupState } from "@/lib/idv/identityVerificationStates";
import {
  resolvePartnerContinuationIntro,
  resolvePartnerDisplayName,
  resolvePartnerHomeUrl,
  resolvePartnerReturnLabel,
} from "@/lib/partner/partnerVerifyDisplay";
import { signIntentMessage } from "@/lib/sui/intent/personalMessage";
import { getEphemeralSecretKey } from "@/lib/sui/zklogin/signingSession";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import {
  PASSPORT_SECURE_ACCOUNT_EXPLAINER,
  PASSPORT_SECURE_ACCOUNT_LABEL,
} from "@/lib/passport/passportCustomerCopy";

function PartnerContinueInner() {
  const searchParams = useSearchParams();
  const { suiAddress, session, isLoading: authLoading } = useSuiAuth();
  const email = session?.email ?? "";
  const [consentDismissed, setConsentDismissed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [bindLoading, setBindLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyRequestId = searchParams.get("verify_request");
  const partnerId = searchParams.get("partner_id") ?? "";
  const policyId = searchParams.get("policy_id") ?? "";
  const returnPath = searchParams.get("return");

  const {
    identityStatus,
    credential,
    refresh,
    setup: setupFromHook,
    veriffConfigured,
    idvProvider,
    walletBindingL3,
  } = usePassportVerification(suiAddress, email || null);

  const walletDone = Boolean(suiAddress);
  const hasCredential = Boolean(credential) && identityStatus === "earned";

  const setup = setupFromHook ?? computePassportSetupState({
    walletDone,
    identityStatus: identityStatus === "earned" ? "approved"
      : identityStatus === "pending" ? "in_progress"
      : identityStatus === "resubmission_requested" ? "requires_resubmission"
      : identityStatus === "declined" ? "declined"
      : "not_started",
    credentialStatus: hasCredential ? "active" : "not_issued",
    walletBindingL3,
  });

  const handoff = usePartnerFlowHandoff({
    suiAddress,
    identityStatus,
    hasCredential,
    returnPath,
    partnerId,
    policyId,
    verificationRequestId: verifyRequestId,
  });

  const partnerName = resolvePartnerDisplayName(partnerId);
  const partnerHomeUrl = resolvePartnerHomeUrl(partnerId);
  const returnLabel = resolvePartnerReturnLabel(partnerId);

  useEffect(() => {
    if (!verifyRequestId || !partnerId || !returnPath) {
      window.location.replace("/partner/verify");
    }
  }, [verifyRequestId, partnerId, returnPath]);

  async function bindWallet() {
    if (!suiAddress) return;
    setBindLoading(true);
    setError(null);
    try {
      const secret = getEphemeralSecretKey();
      if (!secret) throw new Error("Sign in again, then try again.");

      const chRes = await fetch("/api/wallet/binding/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_address: suiAddress }),
      });
      const challenge = await chRes.json() as { challenge_id?: string; message?: string; error?: string };
      if (!chRes.ok || !challenge.challenge_id || !challenge.message) {
        throw new Error(challenge.error ?? "Could not start security confirmation.");
      }

      const { signature, publicKey } = await signIntentMessage(challenge.message, secret);
      const confirmRes = await fetch("/api/wallet/binding/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challenge.challenge_id,
          sui_address: suiAddress,
          message: challenge.message,
          signature,
          public_key: publicKey,
        }),
      });
      const result = await confirmRes.json() as { ok?: boolean; error?: string };
      if (!confirmRes.ok) throw new Error(result.error ?? "Security confirmation failed.");
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Security confirmation failed.");
    } finally {
      setBindLoading(false);
    }
  }

  async function startIdentityVerification() {
    if (!suiAddress) return;
    setStarting(true);
    setError(null);
    try {
      const sessionRes = await fetch("/api/idv/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_address: suiAddress, document_type: "PASSPORT" }),
      });
      const sessionData = await sessionRes.json() as { session_url?: string | null; error?: string };
      if (!sessionRes.ok || !sessionData.session_url) {
        setError(sessionData.error ?? "Could not start verification. Try again.");
        return;
      }
      void refresh();
      await new Promise<void>((resolve, reject) => {
        if (document.querySelector('script[src="https://cdn.veriff.me/incontext/js/v1/veriff.js"]')) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.src = "https://cdn.veriff.me/incontext/js/v1/veriff.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("script"));
        document.body.appendChild(s);
      });
      const w = window as unknown as {
        veriffSDK: { createVeriffFrame: (opts: { url: string }) => void };
      };
      w.veriffSDK.createVeriffFrame({ url: sessionData.session_url });
    } catch {
      setError("Could not load verification. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <PartnerJourneyLayout
      partnerName={partnerName}
      intro={resolvePartnerContinuationIntro(partnerId)}
      statusMessage="Complete the step below so we can share the required result with the partner."
      partnerHomeUrl={partnerHomeUrl}
      partnerReturnLabel={returnLabel}
    >
      {authLoading ? (
        <p role="status">Loading…</p>
      ) : !suiAddress ? (
        <StatusBanner tone="pending" title="Sign in required">
          Return to the partner site and start verification again.
        </StatusBanner>
      ) : (
        <>
          <PartnerFlowReturnHandler handoff={handoff} />

          {verifyRequestId && !consentDismissed && (
            <ConsentCeremony
              requestId={verifyRequestId}
              identityComplete={setup.identityComplete}
              onDismiss={() => setConsentDismissed(true)}
            />
          )}

          {walletDone && !setup.walletBound && (
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
                {PASSPORT_SECURE_ACCOUNT_EXPLAINER}
              </p>
              <Btn disabled={bindLoading} onClick={() => void bindWallet()}>
                {bindLoading ? "Confirming…" : PASSPORT_SECURE_ACCOUNT_LABEL}
              </Btn>
            </div>
          )}

          {setup.walletBound && !setup.identityComplete && (
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
                This partner requires identity verification. Signing in does not verify your age by itself.
              </p>
              <Btn disabled={starting} onClick={() => void startIdentityVerification()}>
                {starting ? "Starting…" : idvProvider === "manual" ? "Continue verification" : "Verify identity"}
              </Btn>
              {!veriffConfigured && idvProvider === "veriff" && (
                <p style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Verification is not available in this environment.
                </p>
              )}
            </div>
          )}

          {setup.identityComplete && !handoff.ready && (
            <p role="status">Finishing verification…</p>
          )}

          {error && <p role="alert" style={{ marginTop: "0.75rem", color: "var(--text-secondary)" }}>{error}</p>}
        </>
      )}
    </PartnerJourneyLayout>
  );
}

export function PartnerContinueClient() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <PartnerContinueInner />
    </Suspense>
  );
}
