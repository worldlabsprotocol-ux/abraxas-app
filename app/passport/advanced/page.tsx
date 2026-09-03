"use client";
// FILE: app/passport/advanced/page.tsx
// Advanced Passport details — intentionally separate from default customer view.

import { Suspense } from "react";
import Link from "next/link";
import { DocumentUpload } from "@/components/passport/DocumentUpload";
import { PassportDashboard } from "@/components/passport/PassportDashboard";
import { SuiIntegrationsPanel } from "@/components/sui/SuiIntegrationsPanel";
import { SuiDevnetPassportPanel } from "@/components/passport/SuiDevnetPassportPanel";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { usePassportVerification } from "@/lib/hooks/usePassportVerification";
import { AmbientGlow } from "@/components/redesign/AmbientGlow";
import { RedesignNav } from "@/components/redesign/RedesignNav";
import { RedesignFooter } from "@/components/redesign/RedesignFooter";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { computePassportSetupState } from "@/lib/idv/identityVerificationStates";
import { PASSPORT_ADVANCED_DETAILS_TITLE } from "@/lib/passport/passportCustomerCopy";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const S = ABRAXAS_FONT_SANS;

export default function PassportAdvancedPage() {
  return (
    <Suspense fallback={<RedesignPageLoading label="Loading…" compact />}>
      <PassportAdvancedInner />
    </Suspense>
  );
}

function PassportAdvancedInner() {
  const { suiAddress, session, isLoading: authLoading } = useSuiAuth();
  const email = session?.email ?? "";

  const {
    identityStatus,
    via,
    credential,
    isRefreshing,
    isPolling,
    refresh,
    setup: setupFromHook,
    veriffConfigured,
    idvProvider,
    walletBindingL3,
    onChain,
    verifyState,
    verifyResult,
    isProvisioning,
    provisionFailed,
    retryProvision,
  } = usePassportVerification(suiAddress, email || null);

  const walletDone = Boolean(suiAddress);
  const hasCredential = Boolean(credential) && identityStatus === "earned";
  const setup = setupFromHook ?? computePassportSetupState({
    walletDone,
    identityStatus: identityStatus === "earned" ? "approved" : "not_started",
    credentialStatus: hasCredential ? "active" : "not_issued",
    walletBindingL3,
  });

  return (
    <div data-theme="dark" style={{
      background: "var(--bg)", minHeight: "100vh", color: "var(--text-primary)", position: "relative", overflowX: "hidden",
    }}>
      <AmbientGlow />
      <RedesignNav />
      <div style={{
        position: "relative", zIndex: 1, maxWidth: 960, margin: "0 auto",
        padding: "clamp(2rem,5vw,3rem) clamp(1rem,4vw,2.5rem)",
      }}>
        <p style={{ margin: "0 0 1rem" }}>
          <Link href="/passport" style={{ fontFamily: S, fontSize: "0.8rem", color: "var(--text-muted)", textDecoration: "none" }}>
            ← Back to Passport
          </Link>
        </p>
        <h1 style={{
          fontFamily: S, fontSize: "clamp(1.2rem, 3vw, 1.6rem)", fontWeight: 800, margin: "0 0 0.5rem",
        }}>
          {PASSPORT_ADVANCED_DETAILS_TITLE}
        </h1>
        <p style={{
          fontFamily: S, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 560, margin: "0 0 1.5rem",
        }}>
          Account, protocol, and developer information for your Passport.
        </p>

        <PassportDashboard
          walletDone={walletDone}
          authLoading={authLoading}
          suiAddress={suiAddress}
          email={email}
          setup={setup}
          identityStatus={identityStatus}
          credential={credential}
          via={via}
          isRefreshing={isRefreshing || isPolling}
          isPolling={isPolling}
          starting={false}
          error={null}
          idvProvider={idvProvider}
          veriffConfigured={veriffConfigured}
          walletBindingL3={walletBindingL3}
          onStartIdCheck={() => {}}
          onRefresh={refresh}
          onWalletBound={refresh}
          guidedOnboarding={false}
          verifyState={verifyState}
          verifyResult={verifyResult}
          onChain={onChain}
          isProvisioning={isProvisioning}
          provisionFailed={provisionFailed}
          onRetryProvision={() => void retryProvision()}
        />

        {walletDone && (
          <details id="stamps" style={{ marginBottom: "1.5rem" }}>
            <summary style={{ fontFamily: S, fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", cursor: "pointer" }}>
              Business & asset-owner stamps
            </summary>
            <div style={{
              marginTop: "0.75rem", padding: "1rem 1.15rem", borderRadius: 16,
              background: "var(--surface-raised)", border: "1px solid var(--border)",
            }}>
              <DocumentUpload email={email || suiAddress || ""} suiAddress={suiAddress} stampId="business" color="#3B82F6" />
            </div>
          </details>
        )}

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
          gap: "0.75rem", marginBottom: "1rem",
        }}>
          {[
            { title: "Wallet", body: "Google OAuth → zkLogin → deterministic Sui address. No seed phrase." },
            { title: "Issuance", body: "Signed credentials with outcome-only claims — not raw documents." },
            { title: "On-chain anchor", body: "Optional stamp on Sui after approval." },
            { title: "Portability", body: "Services verify signed results on their servers." },
          ].map((c) => (
            <div key={c.title} style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "1rem",
            }}>
              <div style={{ fontFamily: S, fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.375rem" }}>{c.title}</div>
              <p style={{ fontFamily: S, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>{c.body}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <Link href="/docs/partner-flow" style={{
            padding: "0.6rem 1.1rem", borderRadius: 999, background: "var(--accent)", color: "#000",
            fontFamily: S, fontSize: "0.82rem", fontWeight: 700, textDecoration: "none",
          }}>
            Integration docs →
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
        <div style={{ marginTop: "1.25rem", paddingBottom: "2rem" }}>
          <SuiDevnetPassportPanel
            compact
            ownerAddress={onChain?.provisioned ? suiAddress : undefined}
            objectId={onChain?.object_id ?? undefined}
          />
        </div>
      </div>
      <RedesignFooter />
    </div>
  );
}
