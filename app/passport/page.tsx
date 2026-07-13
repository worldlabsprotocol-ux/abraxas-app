"use client";
// FILE: app/passport/page.tsx
// Abraxas Passport — wallet dashboard + verify tab.

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PassportPageTabs } from "@/components/passport/PassportPageTabs";
import { PassportDashboard } from "@/components/passport/PassportDashboard";
import { ConsentCeremony } from "@/components/passport/ConsentCeremony";
import { VerificationSuccessPanel } from "@/components/passport/VerificationSuccessPanel";
import { VeriffDeviceHint } from "@/components/passport/VeriffDeviceHint";
import { SuiAuthProvider, useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { usePassportVerification } from "@/lib/hooks/usePassportVerification";
import { AmbientGlow } from "@/components/redesign/AmbientGlow";
import { RedesignNav } from "@/components/redesign/RedesignNav";
import { RedesignFooter } from "@/components/redesign/RedesignFooter";
import { DeveloperDetails } from "@/components/redesign/DeveloperDetails";
import { Btn } from "@/components/redesign/ui";
import { computePassportSetupState } from "@/lib/idv/identityVerificationStates";
import { VerifyClient } from "@/app/verify/VerifyClient";
import { SuiIntegrationsPanel } from "@/components/sui/SuiIntegrationsPanel";
import { SuiDevnetPassportPanel } from "@/components/passport/SuiDevnetPassportPanel";

const S = "'Inter',system-ui,-apple-system,sans-serif";

export default function PassportPage() {
  return (
    <SuiAuthProvider>
      <Suspense fallback={null}>
        <PassportPageInner />
      </Suspense>
    </SuiAuthProvider>
  );
}

function PassportPageInner() {
  const searchParams = useSearchParams();
  const { suiAddress, session } = useSuiAuth();
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
    isLoading: verificationLoading,
    setup: setupFromHook,
    veriffConfigured,
    idvProvider,
    walletBindingL3,
    onChain,
  } = usePassportVerification(suiAddress, email || null);

  const verifyRequestId = searchParams.get("verify_request");
  const verificationParam = searchParams.get("verification");
  const pageView = searchParams.get("view") === "verify" ? "verify" : "passport";

  const walletDone = Boolean(suiAddress);
  const hasCredential = Boolean(credential) && identityStatus === "earned";

  const setup = setupFromHook ?? computePassportSetupState({
    walletDone,
    identityStatus: identityStatus === "earned" ? "approved"
      : identityStatus === "pending" ? "in_progress"
      : identityStatus === "declined" ? "declined"
      : "not_started",
    credentialStatus: hasCredential ? "active" : "not_issued",
    walletBindingL3,
  });

  useEffect(() => {
    document.getElementById("passport-seo-fallback")?.remove();
  }, []);

  useEffect(() => {
    if (searchParams.get("signed_in") === "1") refresh();
  }, [searchParams, refresh]);

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
        body: JSON.stringify({
          sui_address: suiAddress,
          document_type: "PASSPORT",
        }),
      });
      const sessionData = await sessionRes.json() as {
        session_url?: string | null;
        session_id?: string;
        error?: string;
        is_mock?: boolean;
      };

      if (!sessionRes.ok || !sessionData.session_url) {
        const msg = sessionData.is_mock
          ? "Identity verification is not available in this environment. Use manual upload instead."
          : (sessionData.error ?? "Could not start ID verification. Try again in a moment.");
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
    <div data-theme="dark" className="abx-institutional-shell">
      <AmbientGlow />
      <div id="veriff-root" />
      <VeriffDeviceHint visible={showVeriffHint} />
      <RedesignNav />

      <div style={{
        position: "relative", zIndex: 1, maxWidth: 960, margin: "0 auto",
        padding: "clamp(2rem,5vw,3rem) clamp(1rem,4vw,2.5rem)",
      }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <div className="abx-eyebrow-violet" style={{ marginBottom: "0.625rem" }}>
            Abraxas Passport
          </div>
          <h1 style={{
            fontFamily: S, fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)", fontWeight: 800,
            lineHeight: 1.15, color: "var(--text-primary)", letterSpacing: "-0.03em", margin: "0 0 0.65rem",
          }}>
            {pageView === "verify" ? (
              <>Verify a <span className="abx-gradient-text">record</span></>
            ) : (
              <>Your <span className="abx-gradient-text">Passport</span></>
            )}
          </h1>
          <p style={{
            fontFamily: S, fontSize: "0.85rem", color: "var(--text-secondary)",
            lineHeight: 1.65, maxWidth: 560, margin: 0,
          }}>
            {pageView === "verify"
              ? "Look up a public record — scope and status only."
              : "Get verified once. Approve Trust Requests when partners need proof."}
          </p>
        </div>

        <Suspense fallback={null}>
          <PassportPageTabs active={pageView} />
        </Suspense>

        {pageView === "verify" ? (
          <Suspense fallback={
            <p style={{ fontFamily: S, fontSize: "0.82rem", color: "var(--text-muted)" }}>Loading verifier…</p>
          }>
            <VerifyClient />
          </Suspense>
        ) : (
          <>
            {verifyRequestId && suiAddress && !partnerConsentDismissed && (
              <ConsentCeremony
                requestId={verifyRequestId}
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

            <PassportDashboard
              walletDone={walletDone}
              suiAddress={suiAddress}
              email={email}
              setup={setup}
              identityStatus={identityStatus}
              credential={credential}
              via={via}
              isRefreshing={isRefreshing || isPolling}
              starting={starting}
              error={error}
              idvProvider={idvProvider}
              veriffConfigured={veriffConfigured}
              walletBindingL3={walletBindingL3}
              onStartIdCheck={startIdentityVerification}
              onRefresh={refresh}
              onWalletBound={refresh}
              returnPath={searchParams.get("return")}
            />

            {!walletDone && verificationLoading && (
              <p style={{ fontFamily: S, fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center" }}>
                Loading passport status…
              </p>
            )}

            {searchParams.get("details") === "1" && setup.profileComplete && (
              <DeveloperDetails
              title="Technical details"
              summary="Built with zkLogin, W3C-compatible credentials, wallet binding, consent receipts, and Sui-based verification states."
            >
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
                gap: "0.75rem", marginBottom: "1rem",
              }}>
                {[
                  { title: "Wallet", body: "Google OAuth → zkLogin → deterministic Sui address. No seed phrase." },
                  { title: "Issuance", body: "W3C Verifiable Credential v2.0, Ed25519 signed by Abraxas. Outcome only — never raw documents." },
                  { title: "On-chain anchor", body: "Stamp bitmask on Sui Move Passport object after approval." },
                  { title: "Portability", body: "Third parties verify via W3C credential or GET /api/sui/passport." },
                ].map(c => (
                  <div key={c.title} style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 10, padding: "1rem",
                  }}>
                    <div style={{ fontFamily: S, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.375rem" }}>
                      {c.title}
                    </div>
                    <p style={{ fontFamily: S, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                      {c.body}
                    </p>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                <Link href="/docs/sui" style={{
                  padding: "0.6rem 1.1rem", borderRadius: 999,
                  background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)",
                  fontFamily: S, fontSize: "0.82rem", fontWeight: 700, textDecoration: "none",
                  boxShadow: "var(--shadow-glow)",
                }}>
                  Sui integration hub →
                </Link>
                <Link href="/docs/passport-spec" style={{
                  padding: "0.6rem 1.1rem", borderRadius: 999,
                  border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)",
                  fontFamily: S, fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
                }}>
                  Passport spec →
                </Link>
              </div>
              <SuiIntegrationsPanel showSetup />
              <div style={{ marginTop: "1.25rem" }}>
                <SuiDevnetPassportPanel
                  compact
                  ownerAddress={onChain?.provisioned ? suiAddress : undefined}
                  objectId={onChain?.object_id ?? undefined}
                />
              </div>
            </DeveloperDetails>
            )}
          </>
        )}
      </div>
      <RedesignFooter />
    </div>
  );
}
