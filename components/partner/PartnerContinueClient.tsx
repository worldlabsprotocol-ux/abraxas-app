"use client";
// FILE: components/partner/PartnerContinueClient.tsx
// Partner evidence step — not the general Passport dashboard.

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { AbraxasIdentityCapture } from "@/components/passport/AbraxasIdentityCapture";
import { ConsentCeremony } from "@/components/passport/ConsentCeremony";
import { PartnerFlowReturnHandler } from "@/components/partner/PartnerFlowReturnHandler";
import { AgeAssuranceMethodChooser } from "@/components/partner/AgeAssuranceMethodChooser";
import { SelfAttestationBrowseForm } from "@/components/partner/SelfAttestationBrowseForm";
import { PartnerJourneyLayout } from "@/components/partner/PartnerJourneyLayout";
import { usePartnerFlowHandoff } from "@/lib/passport/partnerFlowHandoff";
import { usePassportVerification } from "@/lib/hooks/usePassportVerification";
import { computePassportSetupState } from "@/lib/idv/identityVerificationStates";
import {
  resolvePartnerContinuationIntro,
  resolvePartnerContinuationStatus,
  resolvePartnerDisplayName,
  resolvePartnerHomeUrl,
  resolvePartnerReturnLabel,
} from "@/lib/partner/partnerVerifyDisplay";
import {
  GOOD_TROUBLE_BROWSE_EYEBROW,
  GOOD_TROUBLE_BROWSE_HEADING,
  GOOD_TROUBLE_BROWSE_SUPPORTING,
} from "@/lib/partner/goodTroubleBrowseFlow";
import {
  resolvePartnerHolderPresentation,
  type PartnerHolderState,
} from "@/lib/partner/partnerHolderCopy";
import { GOOD_TROUBLE_RETAIL_POLICY_ID, GOOD_TROUBLE_BROWSE_POLICY_ID } from "@/lib/goodTrouble/constants";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import {
  PASSPORT_SECURE_ACCOUNT_EXPLAINER,
  PASSPORT_SECURE_ACCOUNT_LABEL,
} from "@/lib/passport/passportCustomerCopy";
import { shouldShowPartnerConsent } from "@/lib/partner/partnerConsentVisibility";
import { resolvePartnerSetupVisibility } from "@/lib/partner/partnerSetupVisibility";
import {
  inferPolicyPackFromPolicyId,
  policyPackRequiresIdentityEvidence,
} from "@/lib/partner/launchpad/policyPacks";
import {
  resolvePartnerContinueContext,
  type ResolvedPartnerContinueContext,
} from "@/lib/partner/resolvePartnerContinueContext";
import { partnerVerifyMissingRequiredParametersMessage } from "@/lib/partner/normalizePartnerVerifyInput";
import { sanitizePartnerContinueBrowserSearch } from "@/lib/partner/partnerFlowContinuation";

function resolveMinimumAge(policyId: string): number | null {
  if (policyId === GOOD_TROUBLE_RETAIL_POLICY_ID) return 21;
  return null;
}

function PartnerContinueInner() {
  const searchParams = useSearchParams();
  const { suiAddress, session, isLoading: authLoading } = useSuiAuth();
  const email = session?.email ?? "";
  const [consentDismissed, setConsentDismissed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [bindLoading, setBindLoading] = useState(false);
  const [captureStarted, setCaptureStarted] = useState(false);
  const [showIdFallback, setShowIdFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [flowContext, setFlowContext] = useState<ResolvedPartnerContinueContext | null>(null);
  const [boundReturnUrl, setBoundReturnUrl] = useState("");
  const [methodSatisfied, setMethodSatisfied] = useState(false);

  const verifyRequestId = searchParams.get("verify_request");
  const urlPartnerId = searchParams.get("partner_id") ?? "";
  const urlPolicyId = searchParams.get("policy_id") ?? "";
  const urlPurpose = searchParams.get("purpose");
  const ageAssuranceStatus = searchParams.get("age_assurance");
  const decodedReturnUrl = boundReturnUrl;

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      const urlContext = {
        partnerId: urlPartnerId,
        policyId: urlPolicyId,
        purpose: urlPurpose,
        returnUrl: decodedReturnUrl,
        verifyRequestId,
      };

      if (!verifyRequestId) {
        if (!cancelled) {
          setFlowContext(resolvePartnerContinueContext(urlContext));
          setContextLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/v1/verification-requests/${verifyRequestId}`, {
          credentials: "include",
        });
        if (res.ok) {
          const preview = await res.json() as {
            partner_id?: string;
            policy_id?: string;
            purpose?: string | null;
          };
          let bindingReturnUrl = "";
          try {
            const bindingRes = await fetch(
              `/api/v1/partner-verify/continue-binding?verify_request=${encodeURIComponent(verifyRequestId)}`,
              { credentials: "include" },
            );
            if (bindingRes.ok) {
              const binding = await bindingRes.json() as { return_url?: string };
              if (typeof binding.return_url === "string") bindingReturnUrl = binding.return_url;
            }
          } catch {
            // Continue with preview when the binding cookie is absent (evaluate-created flows).
          }
          if (!cancelled) {
            if (bindingReturnUrl) setBoundReturnUrl(bindingReturnUrl);
            setFlowContext(resolvePartnerContinueContext({
              ...urlContext,
              returnUrl: bindingReturnUrl || urlContext.returnUrl,
            }, {
              partnerId: preview.partner_id ?? "",
              policyId: preview.policy_id ?? "",
              purpose: preview.purpose ?? null,
            }));
            setContextLoading(false);
          }
          return;
        }
      } catch {
        // Fall back to URL params when preview is unavailable.
      }

      if (!cancelled) {
        setFlowContext(resolvePartnerContinueContext(urlContext));
        setContextLoading(false);
      }
    }

    void loadContext();
    return () => {
      cancelled = true;
    };
  }, [verifyRequestId, urlPartnerId, urlPolicyId, urlPurpose, decodedReturnUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sanitized = sanitizePartnerContinueBrowserSearch(searchParams);
    if (!sanitized.strippedUntrusted) return;
    const next = sanitized.search ? `/partner/continue?${sanitized.search}` : "/partner/continue";
    window.history.replaceState(null, "", next);
  }, [searchParams]);

  const partnerId = flowContext?.partnerId ?? urlPartnerId;
  const policyId = flowContext?.policyId ?? urlPolicyId;
  const purposeParam = flowContext?.purpose ?? urlPurpose;
  const provisionalBrowse = resolvePartnerContinueContext({
    partnerId: urlPartnerId,
    policyId: urlPolicyId,
    purpose: urlPurpose,
    returnUrl: decodedReturnUrl,
    verifyRequestId,
  }).isDobFirstBrowse;
  const isDobFirstBrowse = flowContext?.isDobFirstBrowse ?? provisionalBrowse;
  const flowTier: "browse" | "checkout" = isDobFirstBrowse ? "browse" : "checkout";

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
  const minimumAge = resolveMinimumAge(policyId);

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
    returnPath: decodedReturnUrl,
    partnerId,
    policyId,
    verificationRequestId: verifyRequestId,
    walletBound: setup.walletBound,
  });

  const partnerName = resolvePartnerDisplayName(partnerId);
  const partnerHomeUrl = resolvePartnerHomeUrl(partnerId);
  const returnLabel = resolvePartnerReturnLabel(partnerId);

  const holderState: PartnerHolderState = useMemo(() => {
    if (!suiAddress) return "confirm_account";
    if (credential && new Date(credential.expires_at) < new Date()) return "verification_expired";
    if (identityStatus === "pending") return "under_review";
    if (handoff.ready) return "age_confirmed";
    if (ageAssuranceStatus === "failed") return "verification_could_not_confirm";
    if (showIdFallback) return "id_upload_fallback";
    if (setup.walletBound && !setup.identityComplete) return "verify_age";
    if (decodedReturnUrl && handoff.ready) return "return_to_partner";
    return "verify_age";
  }, [suiAddress, credential, identityStatus, handoff.ready, decodedReturnUrl, setup, ageAssuranceStatus, showIdFallback]);

  const holderCopy = resolvePartnerHolderPresentation(holderState, partnerName);
  const selectedPack = inferPolicyPackFromPolicyId(policyId);
  const requiresIdentityEvidence = selectedPack
    ? policyPackRequiresIdentityEvidence(selectedPack)
    : true;
  const qualifyingMethodSucceeded = methodSatisfied
    || (requiresIdentityEvidence && setup.identityComplete);
  const showPartnerConsent = shouldShowPartnerConsent({
    verificationRequestId: verifyRequestId,
    consentDismissed,
    evidenceComplete: qualifyingMethodSucceeded,
    identityComplete: setup.identityComplete,
    qualifyingMethodSucceeded,
    underReview: holderState === "under_review",
    handoffReady: handoff.ready,
  });
  const setupVisibility = resolvePartnerSetupVisibility({
    partnerId,
    policyId,
    purpose: purposeParam,
    walletReady: walletDone,
    walletBound: setup.walletBound,
    identityComplete: setup.identityComplete,
    underReview: holderState === "under_review",
  });

  const continueContextIncomplete = !verifyRequestId || !partnerId;

  async function bindWallet() {
    if (!suiAddress) return;
    setBindLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet-authority/repair", {
        method: "POST",
        credentials: "include",
      });
      const result = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !result.ok) {
        throw new Error(result.error ?? "Wallet binding repair failed.");
      }
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet binding repair failed.");
    } finally {
      setBindLoading(false);
    }
  }

  async function startIdentityVerification() {
    if (!suiAddress) return;
    if (idvProvider === "manual") {
      setCaptureStarted(true);
      setShowIdFallback(true);
      return;
    }
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

  if (!authLoading && !contextLoading && continueContextIncomplete) {
    const missing: string[] = [];
    if (!verifyRequestId) missing.push("verification request");
    if (!partnerId) missing.push("partner identifier");
    const invalidLinkMessage = partnerVerifyMissingRequiredParametersMessage(missing);
    return (
      <PartnerJourneyLayout
        partnerName={partnerName}
        intro="This Partner Flow link cannot continue."
        statusMessage={invalidLinkMessage}
        hideStatus={false}
      >
        <StatusBanner tone="info" title="Verification could not continue">
          {invalidLinkMessage}
        </StatusBanner>
      </PartnerJourneyLayout>
    );
  }

  if (isDobFirstBrowse) {
    return (
      <PartnerJourneyLayout
        partnerName={partnerName}
        intro={GOOD_TROUBLE_BROWSE_SUPPORTING}
        statusMessage=""
        eyebrow={GOOD_TROUBLE_BROWSE_EYEBROW}
        title={GOOD_TROUBLE_BROWSE_HEADING}
        hideStatus
        showAccountFooter={false}
      >
        {authLoading || contextLoading ? (
          <p role="status">Loading…</p>
        ) : !suiAddress ? (
          <p role="status">Return to the partner site and sign in again.</p>
        ) : (
          <SelfAttestationBrowseForm
            partnerId={partnerId}
            policyId={GOOD_TROUBLE_BROWSE_POLICY_ID}
            partnerName={partnerName}
            returnUrl={decodedReturnUrl}
            partnerHomeUrl={partnerHomeUrl}
          />
        )}
      </PartnerJourneyLayout>
    );
  }

  const statusMessage = holderState === "under_review"
    ? holderCopy.message
    : holderState === "age_confirmed"
      ? holderCopy.message
      : resolvePartnerContinuationStatus(partnerId, { policyId, purpose: purposeParam });

  return (
    <PartnerJourneyLayout
      partnerName={partnerName}
      intro={resolvePartnerContinuationIntro(partnerId, { policyId, purpose: purposeParam })}
      statusMessage={statusMessage}
      partnerHomeUrl={partnerHomeUrl}
      partnerReturnLabel={returnLabel}
    >
      {authLoading || contextLoading ? (
        <p role="status">Loading…</p>
      ) : !suiAddress ? (
        <StatusBanner tone="pending" title={holderCopy.title}>
          Return to the partner site and start verification again.
        </StatusBanner>
      ) : (
        <>
          <PartnerFlowReturnHandler handoff={handoff} />

          {holderState === "under_review" && (
            <StatusBanner tone="pending" title={holderCopy.title}>
              {holderCopy.message}
            </StatusBanner>
          )}

          {holderState === "verification_expired" && (
            <StatusBanner tone="info" title={holderCopy.title}>
              {holderCopy.message}
            </StatusBanner>
          )}

          {setupVisibility.showWalletBinding && (
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
                {PASSPORT_SECURE_ACCOUNT_EXPLAINER}
              </p>
              <Btn disabled={bindLoading} onClick={() => void bindWallet()}>
                {bindLoading ? "Confirming…" : PASSPORT_SECURE_ACCOUNT_LABEL}
              </Btn>
            </div>
          )}

          {setupVisibility.showIdentityVerification && (
            <div style={{ marginBottom: "1rem" }}>
              {!showIdFallback ? (
                <AgeAssuranceMethodChooser
                  partnerId={partnerId}
                  policyId={policyId}
                  partnerName={partnerName}
                  returnUrl={decodedReturnUrl}
                  verifyRequestId={verifyRequestId}
                  minimumAge={minimumAge}
                  ageAssuranceStatus={ageAssuranceStatus}
                  flowTier={flowTier}
                  browsePolicyId={GOOD_TROUBLE_BROWSE_POLICY_ID}
                  compactCheckout={false}
                  onFallbackId={() => setShowIdFallback(true)}
                  onMethodSatisfied={() => setMethodSatisfied(true)}
                  onTraditionalReturn={() => {
                    if (partnerHomeUrl) window.location.assign(partnerHomeUrl);
                  }}
                />
              ) : (
                <>
                  <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", lineHeight: 1.6, fontWeight: 600 }}>
                    {holderCopy.title}
                  </p>
                  <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
                    {holderCopy.message}
                  </p>
                  {idvProvider === "manual" && captureStarted ? (
                    <AbraxasIdentityCapture
                      email={email}
                      suiAddress={suiAddress}
                      pendingReview={identityStatus === "pending"}
                      capturePolicy={{
                        verificationRequestId: verifyRequestId,
                        policyId,
                        partnerId,
                        minimumAge,
                      }}
                      onSubmitted={() => void refresh()}
                    />
                  ) : (
                    <Btn disabled={starting} onClick={() => void startIdentityVerification()}>
                      {starting ? "Starting…" : holderCopy.action_label ?? "Continue verification"}
                    </Btn>
                  )}
                  {!veriffConfigured && idvProvider === "veriff" && (
                    <p style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      Verification is not available in this environment.
                    </p>
                  )}
                  <div style={{ marginTop: "0.75rem" }}>
                    <Btn
                      variant="secondary"
                      onClick={() => setShowIdFallback(false)}
                    >
                      Back to verification options
                    </Btn>
                  </div>
                </>
              )}
            </div>
          )}

          {showPartnerConsent && verifyRequestId && (
            <div style={{ marginTop: "1rem" }}>
              <ConsentCeremony
                requestId={verifyRequestId}
                identityComplete
                onDismiss={() => setConsentDismissed(true)}
              />
            </div>
          )}

          {setup.identityComplete && !handoff.ready && (
            <p role="status">{holderCopy.title}…</p>
          )}

          {decodedReturnUrl && handoff.ready && (
            <div style={{ marginTop: "1rem" }}>
              <Btn
                variant="secondary"
                disabled={handoff.inFlight}
                onClick={() => { void handoff.complete(); }}
              >
                {returnLabel}
              </Btn>
            </div>
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
