"use client";
// FILE: app/passport/page.tsx
// Abraxas Passport — customer-first default view.

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PassportPageTabs } from "@/components/passport/PassportPageTabs";
import { PassportCustomerView } from "@/components/passport/PassportCustomerView";
import { PassportVerifySetupRequired } from "@/components/passport/PassportVerifySetupRequired";
import { passportVerifyNeedsSetup } from "@/lib/passport/passportVerifyAccess";
import { usePartnerFlowHandoff } from "@/lib/passport/partnerFlowHandoff";
import { ConsentCeremony } from "@/components/passport/ConsentCeremony";
import { VerificationSuccessPanel } from "@/components/passport/VerificationSuccessPanel";
import { VeriffDeviceHint } from "@/components/passport/VeriffDeviceHint";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { usePassportVerification } from "@/lib/hooks/usePassportVerification";
import { AbxPageHeader } from "@/components/design/AbxPrimitives";
import { AbxPageShell } from "@/components/design/AbxPageShell";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { computePassportSetupState } from "@/lib/idv/identityVerificationStates";
import { VerifyClient } from "@/app/verify/VerifyClient";
import { PartnerFlowReturnHandler } from "@/components/partner/PartnerFlowReturnHandler";
import {
  PASSPORT_PAGE_EYEBROW,
  PASSPORT_PAGE_HEADLINE,
  PASSPORT_PAGE_SUBHEAD,
} from "@/lib/passport/passportCustomerCopy";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  HOLDER_VERIFY_EYEBROW,
  HOLDER_VERIFY_HEADLINE,
  HOLDER_VERIFY_SUBHEAD,
} from "@/lib/integrate/partnerJourney";

const S = ABRAXAS_FONT_SANS;

export default function PassportPage() {
  return (
    <Suspense fallback={<RedesignPageLoading label="Loading Passport…" compact />}>
      <PassportPageInner />
    </Suspense>
  );
}

function PassportPageInner() {
  const searchParams = useSearchParams();
  const { suiAddress, session, isLoading: authLoading, refreshSession } = useSuiAuth();
  const email = session?.email ?? "";
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerConsentDismissed, setPartnerConsentDismissed] = useState(false);
  const [showSuccessPanel, setShowSuccessPanel] = useState(false);

  const {
    identityStatus,
    via,
    credential,
    isRefreshing,
    isPolling,
    refresh,
    refreshWalletBindingState,
    isLoading: verificationLoading,
    setup: setupFromHook,
    veriffConfigured,
    idvProvider,
    walletBindingL3,
    walletBindingStatus,
    verifyState,
    verifyResult,
    onChain,
    isProvisioning,
    provisionFailed,
    retryProvision,
    isStatusFetchError,
    statusFetchError,
  } = usePassportVerification(suiAddress, email || null);

  const verifyRequestId = searchParams.get("verify_request");
  const policyIdParam = searchParams.get("policy_id");
  const partnerIdParam = searchParams.get("partner_id");
  const returnPathParam = searchParams.get("return");
  const verificationParam = searchParams.get("verification");
  const pageView = searchParams.get("view") === "verify" ? "verify" : "passport";

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

  useEffect(() => {
    if (verifyRequestId && partnerIdParam && returnPathParam && pageView === "passport") {
      const params = new URLSearchParams({
        verify_request: verifyRequestId,
        partner_id: partnerIdParam,
        policy_id: policyIdParam ?? "",
        return: returnPathParam,
      });
      window.location.replace(`/partner/continue?${params.toString()}`);
    }
  }, [verifyRequestId, partnerIdParam, returnPathParam, policyIdParam, pageView]);

  useEffect(() => {
    if (verificationParam === "complete" || verificationParam === "pending") {
      void refresh();
    }
  }, [verificationParam, refresh]);

  useEffect(() => {
    if (identityStatus === "earned" && hasCredential && verificationParam === "complete") {
      setShowSuccessPanel(true);
    }
  }, [identityStatus, hasCredential, verificationParam]);

  const showVeriffHint = idvProvider === "veriff" && (identityStatus === "pending" || starting);
  const verifySetupIncomplete = passportVerifyNeedsSetup(setup);

  const handoff = usePartnerFlowHandoff({
    suiAddress,
    identityStatus,
    hasCredential,
    returnPath: returnPathParam,
    partnerId: partnerIdParam,
    policyId: policyIdParam,
    verificationRequestId: verifyRequestId,
  });

  const loadVeriffScript = (src: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(s);
    });

  async function startIdentityVerification() {
    if (!suiAddress) {
      setError("Sign in with Google first to create your account.");
      return;
    }
    if (idvProvider === "manual") {
      setError(null);
      return;
    }
    if (!email.includes("@")) {
      setError("Your Google account must include an email for ID verification.");
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
      const sessionData = await sessionRes.json() as {
        session_url?: string | null;
        error?: string;
        is_mock?: boolean;
      };

      if (!sessionRes.ok || !sessionData.session_url) {
        const msg = sessionData.is_mock
          ? "Identity verification is not available in this environment."
          : (sessionData.error ?? "Could not start verification. Try again.");
        setError(msg);
        return;
      }

      refresh();
      await loadVeriffScript("https://cdn.veriff.me/incontext/js/v1/veriff.js");
      const w = window as unknown as {
        veriffSDK: { createVeriffFrame: (opts: { url: string }) => void };
      };
      w.veriffSDK.createVeriffFrame({ url: sessionData.session_url });
    } catch {
      setError("Could not load the verification widget. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <AbxPageShell accent="passport" maxWidth={720} contentStyle={{ paddingTop: "clamp(2rem,5vw,3rem)" }}>
      <div id="veriff-root" />
      <VeriffDeviceHint visible={showVeriffHint} />

      <AbxPageHeader
        accent="passport"
        eyebrow={pageView === "verify" ? HOLDER_VERIFY_EYEBROW : PASSPORT_PAGE_EYEBROW}
        title={pageView === "verify" ? HOLDER_VERIFY_HEADLINE : PASSPORT_PAGE_HEADLINE}
        lead={pageView === "verify" ? HOLDER_VERIFY_SUBHEAD : PASSPORT_PAGE_SUBHEAD}
      />

        <Suspense fallback={<RedesignPageLoading label="Loading navigation…" compact />}>
          <PassportPageTabs active={pageView} />
        </Suspense>

        {pageView === "verify" ? (
          <>
            {verifySetupIncomplete && (
              <PassportVerifySetupRequired setup={setup} partnerParams={searchParams} />
            )}
            <Suspense fallback={
              <p style={{ fontFamily: S, fontSize: "0.82rem", color: "var(--text-muted)" }}>Loading verifier…</p>
            }>
              <VerifyClient audience="holder" />
            </Suspense>
          </>
        ) : (
          <>
            {verifyRequestId && !suiAddress && (
              <div style={{ marginBottom: "1.25rem" }}>
                <StatusBanner tone="pending" title="Service verification">
                  A participating service sent you here. Sign in to review what will be shared.
                </StatusBanner>
              </div>
            )}

            <PartnerFlowReturnHandler handoff={handoff} />

            {isStatusFetchError && statusFetchError && (
              <div style={{ marginBottom: "1.25rem" }}>
                <StatusBanner
                  tone="error"
                  title={statusFetchError === "load_failed"
                    ? "Couldn't load your Passport status."
                    : "Couldn't refresh your Passport status."}
                  action={(
                    <Btn size="sm" variant="secondary" onClick={() => void refresh()}>
                      Refresh
                    </Btn>
                  )}
                >
                  Check your connection and tap Refresh.
                </StatusBanner>
              </div>
            )}

            {verifyRequestId && suiAddress && !partnerConsentDismissed && (
              <ConsentCeremony
                requestId={verifyRequestId}
                identityComplete={setup.identityComplete}
                onDismiss={() => setPartnerConsentDismissed(true)}
              />
            )}

            {showSuccessPanel && hasCredential && (
              <VerificationSuccessPanel
                credential={credential}
                onDismiss={() => setShowSuccessPanel(false)}
                onBindWallet={() => setShowSuccessPanel(false)}
              />
            )}

            <PassportCustomerView
              walletDone={walletDone}
              authLoading={authLoading}
              suiAddress={suiAddress}
              email={email}
              setup={setup}
              walletBindingStatus={walletBindingStatus}
              identityStatus={identityStatus}
              credential={credential}
              via={via}
              starting={starting}
              error={error}
              idvProvider={idvProvider}
              veriffConfigured={veriffConfigured}
              onStartIdCheck={startIdentityVerification}
              onRefresh={refresh}
              onWalletBound={refreshWalletBindingState}
              handoff={handoff}
              capturePolicy={{
                verificationRequestId: verifyRequestId,
                policyId: policyIdParam,
                partnerId: partnerIdParam,
              }}
            />

            {!walletDone && !authLoading && verificationLoading && (
              <p style={{ fontFamily: S, fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center" }}>
                Loading passport status…
              </p>
            )}
          </>
        )}
    </AbxPageShell>
  );
}
