"use client";
// FILE: app/passport/PassportPageClient.tsx
// Abraxas Passport — customer-first default view.

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PassportPageTabs } from "@/components/passport/PassportPageTabs";
import { PassportCustomerView } from "@/components/passport/PassportCustomerView";
import { PassportVerifySetupRequired } from "@/components/passport/PassportVerifySetupRequired";
import { PassportPrivacyCenter } from "@/components/passport/PassportPrivacyCenter";
import { PassportSupportCenter } from "@/components/passport/PassportSupportCenter";
import { PassportActivityCenter } from "@/components/passport/PassportActivityCenter";
import { PassportRequestInbox } from "@/components/passport/PassportRequestInbox";
import { passportVerifyNeedsSetup } from "@/lib/passport/passportVerifyAccess";
import { resolvePassportPageView } from "@/lib/passport/passportPrivacyNavigation";
import { usePartnerFlowHandoff } from "@/lib/passport/partnerFlowHandoff";
import { ConsentCeremony } from "@/components/passport/ConsentCeremony";
import { VerificationSuccessPanel } from "@/components/passport/VerificationSuccessPanel";
import { VeriffDeviceHint } from "@/components/passport/VeriffDeviceHint";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { HolderSignInPanel } from "@/components/auth/HolderSignInPanel";
import { useHolderSession } from "@/lib/hooks/useHolderSession";
import { isSolanaNativeProductEnabledClient } from "@/lib/auth/solanaNative/clientFeatureFlag";
import { usePassportVerification } from "@/lib/hooks/usePassportVerification";
import { AbxPageHeader } from "@/components/design/AbxPrimitives";
import { AbxPageShell } from "@/components/design/AbxPageShell";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { computePassportSetupState } from "@/lib/idv/identityVerificationStates";
import { VerifyClient } from "@/app/verify/VerifyClient";
import { PartnerFlowReturnHandler } from "@/components/partner/PartnerFlowReturnHandler";
import { PartnerVerificationResumeCta } from "@/components/passport/PartnerVerificationResumeCta";
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

export function PassportPageClient() {
  return <PassportPageInner />;
}

function PassportPageInner() {
  const searchParams = useSearchParams();
  const solanaNative = isSolanaNativeProductEnabledClient();
  const { suiAddress: zkSui, session, isLoading: authLoading, refreshSession } = useSuiAuth();
  const { session: holderSession, loading: holderSessionLoading } = useHolderSession(solanaNative);
  const passportSubjectKey: string | null = solanaNative && holderSession?.claimsSubjectKey
    ? holderSession.claimsSubjectKey
    : (zkSui ?? null);
  const suiAddress = passportSubjectKey;
  const email = solanaNative ? "" : (session?.email ?? "");
  const signedIn = solanaNative
    ? Boolean(holderSession?.passportSubjectReady)
    : Boolean(zkSui);
  const authLoadingCombined = solanaNative ? holderSessionLoading : authLoading;
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
  const pageView = resolvePassportPageView(searchParams.get("view"));

  const walletDone = signedIn;
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
    if (verifyRequestId && pageView === "passport") {
      window.location.replace(`/partner/continue?verify_request=${encodeURIComponent(verifyRequestId)}`);
    }
  }, [verifyRequestId, pageView]);

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
    verifyRequestRef: verifyRequestId,
    walletBound: setup.walletBound,
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
    if (!signedIn) {
      setError(solanaNative
        ? "Sign in with Phantom to start identity verification."
        : "Sign in with Google first to create your account.");
      return;
    }
    if (idvProvider === "manual") {
      setError(null);
      return;
    }
    if (!solanaNative && !email.includes("@")) {
      setError("Your Google account must include an email for ID verification.");
      return;
    }
    setStarting(true);
    setError(null);

    try {
      const sessionRes = await fetch("/api/idv/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...(suiAddress ? { sui_address: suiAddress } : {}),
          document_type: "PASSPORT",
        }),
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
        eyebrow={pageView === "verify" ? HOLDER_VERIFY_EYEBROW : pageView === "requests" ? "Passport · Requests" : pageView === "activity" ? "Passport · Activity" : pageView === "privacy" ? "Passport · Privacy" : pageView === "support" ? "Passport · Help" : PASSPORT_PAGE_EYEBROW}
        title={pageView === "verify" ? HOLDER_VERIFY_HEADLINE : pageView === "requests" ? "Requests waiting for you" : pageView === "activity" ? "Your Passport activity" : pageView === "privacy" ? "Your data, your controls" : pageView === "support" ? "Help and account safety" : PASSPORT_PAGE_HEADLINE}
        lead={pageView === "verify" ? HOLDER_VERIFY_SUBHEAD : pageView === "requests" ? "Review who is asking, why they need a result, and what would be shared before you decide." : pageView === "activity" ? "See verification use, privacy requests, and help progress in plain language." : pageView === "privacy" ? "See what Abraxas holds, request an export, or ask us to delete your account data." : pageView === "support" ? "Get help in plain language and manage the session on this device." : PASSPORT_PAGE_SUBHEAD}
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
        ) : pageView === "requests" ? (
          <>
            {!signedIn && !authLoadingCombined ? (
              <section style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-strong)",
                borderRadius: 16,
                padding: "1.25rem",
                marginBottom: "2rem",
              }}>
                <h2 style={{ fontFamily: S, fontSize: "1rem", margin: "0 0 0.5rem" }}>
                  Sign in to review requests
                </h2>
                <p style={{
                  fontFamily: S,
                  fontSize: "0.82rem",
                  lineHeight: 1.6,
                  color: "var(--text-secondary)",
                  margin: "0 0 1rem",
                }}>
                  Requests are private and connected to your signed-in Passport account.
                </p>
                <HolderSignInPanel />
              </section>
            ) : authLoadingCombined ? (
              <RedesignPageLoading label="Loading your requests…" compact />
            ) : (
              <PassportRequestInbox showEmpty />
            )}
          </>
        ) : pageView === "activity" ? (
          <>
            {!signedIn && !authLoadingCombined ? (
              <section style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-strong)",
                borderRadius: 16,
                padding: "1.25rem",
                marginBottom: "2rem",
              }}>
                <h2 style={{ fontFamily: S, fontSize: "1rem", margin: "0 0 0.5rem" }}>
                  Sign in to see your activity
                </h2>
                <p style={{
                  fontFamily: S,
                  fontSize: "0.82rem",
                  lineHeight: 1.6,
                  color: "var(--text-secondary)",
                  margin: "0 0 1rem",
                }}>
                  Your activity is private and connected to your signed-in Passport account.
                </p>
                <HolderSignInPanel />
              </section>
            ) : authLoadingCombined ? (
              <RedesignPageLoading label="Loading your activity…" compact />
            ) : (
              <PassportActivityCenter />
            )}
          </>
        ) : pageView === "support" ? (
          <>
            {!signedIn && !authLoadingCombined ? (
              <section style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-strong)",
                borderRadius: 16,
                padding: "1.25rem",
                marginBottom: "2rem",
              }}>
                <h2 style={{ fontFamily: S, fontSize: "1rem", margin: "0 0 0.5rem" }}>
                  Sign in to get account help
                </h2>
                <p style={{
                  fontFamily: S,
                  fontSize: "0.82rem",
                  lineHeight: 1.6,
                  color: "var(--text-secondary)",
                  margin: "0 0 1rem",
                }}>
                  Signing in connects your request to the right Passport account without asking you to copy account IDs.
                </p>
                <HolderSignInPanel />
              </section>
            ) : authLoadingCombined ? (
              <RedesignPageLoading label="Loading help and safety…" compact />
            ) : (
              <PassportSupportCenter />
            )}
          </>
        ) : pageView === "privacy" ? (
          <>
            {!signedIn && !authLoadingCombined ? (
              <section style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-strong)",
                borderRadius: 16,
                padding: "1.25rem",
                marginBottom: "2rem",
              }}>
                <h2 style={{ fontFamily: S, fontSize: "1rem", margin: "0 0 0.5rem" }}>
                  Sign in to manage your data
                </h2>
                <p style={{
                  fontFamily: S,
                  fontSize: "0.82rem",
                  lineHeight: 1.6,
                  color: "var(--text-secondary)",
                  margin: "0 0 1rem",
                }}>
                  Privacy requests are tied to your Passport account. Sign in to view stored data categories and request an export or deletion.
                </p>
                <HolderSignInPanel />
              </section>
            ) : authLoadingCombined ? (
              <RedesignPageLoading label="Loading privacy controls…" compact />
            ) : (
              <PassportPrivacyCenter suiAddress={suiAddress} />
            )}
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
            <PartnerVerificationResumeCta />

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
