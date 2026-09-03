"use client";
// FILE: components/passport/PassportDashboard.tsx
// State-driven Passport control center. tier status, one identity card, credentials.

import { useState } from "react";
import Link from "next/link";
import { truncateSuiAddress } from "@/components/sui/SuiAuthProvider";
import { signIntentMessage } from "@/lib/sui/intent/personalMessage";
import { getEphemeralSecretKey } from "@/lib/sui/zklogin/signingSession";
import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";
import type { IdentityStampStatus, CredentialVerifyState, OnChainPassportStatus } from "@/lib/hooks/usePassportVerification";
import type { StoredCredential } from "@/lib/credentials/storage";
import type { VerificationResult } from "@/lib/credentials/types";
import { Btn } from "@/components/redesign/ui";
import { DocumentUpload } from "@/components/passport/DocumentUpload";
import { AbraxasIdentityCapture } from "@/components/passport/AbraxasIdentityCapture";
import { IndependentBiometricStatusCard } from "@/components/passport/IndependentBiometricStatusCard";
import { PassportShareHistoryCard } from "@/components/passport/PassportShareHistoryCard";
import { PassportPrivacyCenter } from "@/components/passport/PassportPrivacyCenter";
import { PassportCredentialBanner } from "@/components/passport/PassportCredentialBanner";
import { PassportIntentCard } from "@/components/passport/PassportIntentCard";
import { TransactionEligibilitySection } from "@/components/passport/TransactionEligibilitySection";
import {
  resolvePassportTier,
  TIER_LABELS,
  tierCapabilities,
  type PassportTier,
} from "@/lib/passport/passportTiers";
import type { CapturePolicyContext } from "@/lib/idv/capturePolicyContext";
import {
  resolveIdentityUiState,
  IDENTITY_UI_LABELS,
  type IdentityUiState,
} from "@/lib/passport/identityUiState";
import { shouldShowVerifiedHero } from "@/lib/passport/verifiedHero";
import { PassportVerifiedHero } from "@/components/passport/PassportVerifiedHero";
import { PartnerReturnCta } from "@/components/passport/PartnerReturnCta";
import type { PartnerFlowHandoffController } from "@/lib/passport/partnerFlowHandoff";
import { IDLE_PARTNER_FLOW_HANDOFF } from "@/lib/passport/partnerFlowHandoff";
import { PassportSignInRecoveryPanel } from "@/components/passport/PassportSignInRecoveryPanel";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";
import { ZkLoginSignIn } from "@/components/sui/ZkLoginSignIn";
import { HOLDER_VERIFY_DEFAULT_PATH } from "@/lib/integrate/partnerJourney";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  PASSPORT_ADVANCED_DETAILS_TITLE,
  PASSPORT_SECURE_ACCOUNT_EXPLAINER,
  PASSPORT_SECURE_ACCOUNT_LABEL,
} from "@/lib/passport/passportCustomerCopy";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const ACCENT = "#10B981";
const AMBER = "#F59E0B";
const RED = "#EF4444";

const CARD: React.CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border-strong)",
  borderRadius: 16,
  padding: "1.15rem 1.25rem",
  marginBottom: "1.25rem",
};

const IDENTITY_UNLOCKS = [
  "Enhanced payment and settlement flows",
  "Verified asset submissions",
  "Partner policies requiring identity assurance",
  "Investor, business, or sanctions-gated workflows",
];

interface Props {
  walletDone: boolean;
  authLoading?: boolean;
  suiAddress: string | null;
  email: string;
  setup: PassportSetupState;
  identityStatus: IdentityStampStatus;
  credential: StoredCredential | null;
  via: string | null;
  isRefreshing: boolean;
  isPolling?: boolean;
  starting: boolean;
  error: string | null;
  idvProvider: "veriff" | "manual";
  veriffConfigured: boolean;
  walletBindingL3: boolean;
  onStartIdCheck: () => void;
  onRefresh: () => void;
  onWalletBound?: () => void;
  handoff?: PartnerFlowHandoffController;
  guidedOnboarding?: boolean;
  capturePolicy?: CapturePolicyContext;
  verifyState?: CredentialVerifyState;
  verifyResult?: VerificationResult | null;
  onChain?: OnChainPassportStatus | null;
  isProvisioning?: boolean;
  provisionFailed?: boolean;
  onRetryProvision?: () => void;
}

export function PassportDashboard({
  walletDone,
  authLoading = false,
  suiAddress,
  email,
  setup,
  identityStatus,
  credential,
  via,
  isRefreshing,
  isPolling = false,
  starting,
  error,
  idvProvider,
  veriffConfigured,
  walletBindingL3,
  onStartIdCheck,
  onRefresh,
  onWalletBound,
  handoff = IDLE_PARTNER_FLOW_HANDOFF,
  guidedOnboarding = false,
  capturePolicy,
  verifyState = "idle",
  verifyResult = null,
  onChain = null,
  isProvisioning = false,
  provisionFailed = false,
  onRetryProvision,
}: Props) {
  const auth = useSuiAuthOptional();
  const signInRecovery = auth?.signInRecovery ?? null;
  const dismissSignInRecovery = auth?.dismissSignInRecovery;
  const [identityExpanded, setIdentityExpanded] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);
  const [bindLoading, setBindLoading] = useState(false);
  const [bindSuccess, setBindSuccess] = useState(false);
  const manualMode = idvProvider === "manual";
  const hasCredential = Boolean(credential) && identityStatus === "earned";
  const assuranceLabel = manualMode ? "L2" : "L3";

  const tierInput = {
    accountActive: setup.accountComplete,
    profileComplete: setup.profileComplete,
    walletBound: setup.walletBound,
    walletBindingFresh: setup.walletBound,
    identityCredentialActive: setup.identityComplete,
  };
  const tier = resolvePassportTier(tierInput);
  const availableNow = tier >= 1
    ? [
        "Browse the public registry",
        "Save your profile and manage your wallet",
        "Use the Cielo verified-rate pilot",
        "Access partner flows that require wallet binding only",
      ]
    : tierCapabilities(tierInput).filter(c => c.unlocked).map(c => c.label);

  const identityUi = resolveIdentityUiState({
    identityStatus,
    hasCredential,
    idvProvider,
    via,
  });
  const showVerifiedHero = shouldShowVerifiedHero(identityUi, hasCredential);

  const showCredentialBanner = walletDone && (
    identityStatus === "pending"
    || identityStatus === "resubmission_requested"
    || identityStatus === "declined"
    || isPolling
    || (identityStatus === "earned" && Boolean(credential))
  );

  const credentialBanner = showCredentialBanner ? (
    <PassportCredentialBanner
      identityStatus={identityStatus}
      via={via}
      credential={credential}
      verifyState={verifyState}
      verifyResult={verifyResult}
      onChain={onChain}
      isProvisioning={isProvisioning}
      provisionFailed={provisionFailed}
      onRetryProvision={onRetryProvision ?? (() => {})}
      isRefreshing={isRefreshing}
      isPolling={isPolling}
      onRefresh={onRefresh}
      manualMode={manualMode}
    />
  ) : null;

  async function bindWallet() {
    if (!suiAddress) {
      setBindError("Sign in first to create your Abraxas wallet.");
      return;
    }
    setBindLoading(true);
    setBindError(null);
    setBindSuccess(false);
    try {
      const secret = getEphemeralSecretKey();
      if (!secret) {
        throw new Error("Wallet signing key missing. Sign out and sign in once — your Passport stays the same.");
      }

      const chRes = await fetch("/api/wallet/binding/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_address: suiAddress }),
      });
      const challenge = await chRes.json() as {
        challenge_id?: string;
        message?: string;
        error?: string;
        code?: string;
      };
      if (!chRes.ok || !challenge.challenge_id || !challenge.message) {
        if (chRes.status === 503 || challenge.code === "WALLET_BINDING_SCHEMA_INCOMPATIBLE") {
          throw new Error(
            challenge.error
              ?? "Wallet binding is temporarily unavailable. Your verified identity still works without it.",
          );
        }
        throw new Error(challenge.error ?? "Could not start wallet bind. Try again.");
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
      if (!confirmRes.ok) throw new Error(result.error ?? "Wallet bind failed. Try again.");
      setBindSuccess(true);
      onWalletBound?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Wallet bind failed";
      setBindError(msg);
      console.error(e);
    } finally {
      setBindLoading(false);
    }
  }

  return (
    <div>
      {authLoading && (
        <section style={CARD} aria-live="polite">
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
            lineHeight: 1.65, margin: 0,
          }}>
            Loading your Passport session…
          </p>
        </section>
      )}

      {!authLoading && !walletDone && signInRecovery && (
        <PassportSignInRecoveryPanel
          recovery={signInRecovery}
          onDismiss={() => dismissSignInRecovery?.()}
        />
      )}

      {!authLoading && !walletDone && !guidedOnboarding && (
        <section style={CARD} aria-labelledby="passport-signin-heading">
          <h2 id="passport-signin-heading" style={{
            fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800,
            color: "var(--text-primary)", margin: "0 0 0.5rem",
          }}>
            Sign in to your Passport
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
            lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 520,
          }}>
            Google sign-in creates your Abraxas account and Sui wallet — no seed phrase.
          </p>
          <ZkLoginSignIn />
        </section>
      )}

      {!authLoading && walletDone && !guidedOnboarding && (
        <>
          {showVerifiedHero && (
            <PassportVerifiedHero
              assuranceLevel={assuranceLabel}
              expiresAt={credential?.expires_at}
              handoff={handoff}
            />
          )}

          {credentialBanner}

          {!showVerifiedHero && (
            <PassportStatusCard
              tier={tier}
              suiAddress={suiAddress}
              walletBindingL3={walletBindingL3}
              identityUi={identityUi}
              assuranceLabel={assuranceLabel}
              availableNow={availableNow}
              handoff={handoff}
            />
          )}

          {walletDone && !setup.walletBound && (
            <section style={CARD} aria-labelledby="passport-bind-heading">
              <h2 id="passport-bind-heading" style={{
                fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800,
                color: "var(--text-primary)", margin: "0 0 0.5rem",
              }}>
                {PASSPORT_SECURE_ACCOUNT_LABEL}
              </h2>
              <p style={{
                fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
                lineHeight: 1.65, margin: "0 0 1rem",
              }}>
                {PASSPORT_SECURE_ACCOUNT_EXPLAINER}
              </p>
              <Btn size="lg" fullWidth loading={bindLoading} onClick={() => void bindWallet()}>
                {bindLoading ? "Waiting for confirmation…" : "Confirm securely →"}
              </Btn>
              {bindSuccess && (
                <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, margin: "0.65rem 0 0" }}>
                  Wallet bound successfully.
                </p>
              )}
              {bindError && (
                <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: RED, margin: "0.65rem 0 0", lineHeight: 1.55 }}>
                  {bindError}
                </p>
              )}
            </section>
          )}

          {!setup.identityComplete && identityUi !== "under_review" && (
            <section style={{ ...CARD, border: "2px solid rgba(16,185,129,0.28)" }}>
              <h2 style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.5rem" }}>
                Add verified information when required
              </h2>
              <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
                Optional until a partner policy requires it. Partners only see yes/no — not your documents.
              </p>
              {manualMode ? (
                <AbraxasIdentityCapture
                  email={email}
                  suiAddress={suiAddress}
                  onSubmitted={onRefresh}
                  capturePolicy={capturePolicy}
                />
              ) : (
                <Btn size="lg" fullWidth loading={starting} onClick={onStartIdCheck}>Add verified information →</Btn>
              )}
            </section>
          )}

          {identityUi !== "verified" && (!manualMode || identityUi === "under_review" || identityUi === "needs_action") && (
            <IdentityUnlockSection
              identityUi={identityUi}
              manualMode={manualMode}
              veriffConfigured={veriffConfigured}
              expanded={identityExpanded}
              onExpand={() => setIdentityExpanded(true)}
              onDismiss={() => setIdentityExpanded(false)}
              email={email}
              suiAddress={suiAddress}
              starting={starting}
              isRefreshing={isRefreshing}
              error={error}
              onStartIdCheck={onStartIdCheck}
              onRefresh={onRefresh}
              capturePolicy={capturePolicy}
            />
          )}

          <CredentialsSection
            walletBindingL3={walletBindingL3}
            identityUi={identityUi}
            assuranceLabel={assuranceLabel}
            manualMode={manualMode}
            credential={credential}
            verifiedView={showVerifiedHero}
          />

          <PartnerAccessSection suiAddress={suiAddress} verifiedView={showVerifiedHero} />

          {showVerifiedHero ? (
            <PassportVerifiedDetails
              tier={tier}
              suiAddress={suiAddress}
              walletBindingL3={walletBindingL3}
              manualMode={manualMode}
              isPolling={isPolling}
            />
          ) : (
            <PassportCustomerAdvancedDetails
              suiAddress={suiAddress}
              tier={tier}
              walletBindingL3={walletBindingL3}
              manualMode={manualMode}
              isPolling={isPolling}
              identityUi={identityUi}
              assuranceLabel={assuranceLabel}
            />
          )}
        </>
      )}

      {!authLoading && walletDone && guidedOnboarding && (
        <>
          {!showVerifiedHero && setup.walletBound && (
            <PassportStatusCard
              tier={tier}
              suiAddress={suiAddress}
              walletBindingL3={walletBindingL3}
              identityUi={identityUi}
              assuranceLabel={assuranceLabel}
              availableNow={availableNow}
              handoff={handoff}
            />
          )}

          {credentialBanner}

          <CredentialsSection
            walletBindingL3={walletBindingL3}
            identityUi={identityUi}
            assuranceLabel={assuranceLabel}
            manualMode={manualMode}
            credential={credential}
            verifiedView={false}
          />

          <PartnerAccessSection suiAddress={suiAddress} verifiedView={false} />

          <TransactionEligibilitySection enabled={walletDone} />

          <details style={{ ...CARD, marginBottom: "1.5rem" }}>
            <summary style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
              color: "var(--text-muted)", cursor: "pointer",
            }}>
              Advanced security & business stamps
            </summary>
            <div style={{ marginTop: "0.85rem" }}>
              <PassportIntentCard suiAddress={suiAddress} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
                <Btn href="/passport#stamps" variant="secondary" size="sm">Business stamps →</Btn>
                <Btn href="/build" variant="ghost" size="sm">Submit an asset →</Btn>
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function PassportStatusCard({
  tier,
  suiAddress,
  walletBindingL3,
  identityUi,
  assuranceLabel,
  availableNow,
  handoff,
}: {
  tier: PassportTier;
  suiAddress: string | null;
  walletBindingL3: boolean;
  identityUi: IdentityUiState;
  assuranceLabel: string;
  availableNow: string[];
  handoff: PartnerFlowHandoffController;
}) {
  const readyHeadline = identityUi === "verified"
    ? "Your Passport is ready to use"
    : walletBindingL3
      ? "Your account is connected"
      : "Finish securing your Passport";

  return (
    <section style={{
      ...CARD,
      border: "2px solid rgba(16,185,129,0.28)",
      background: "rgba(16,185,129,0.04)",
    }} aria-labelledby="passport-status-heading">
      <h2 id="passport-status-heading" style={{
        fontFamily: FONT, fontSize: "1.15rem", fontWeight: 800,
        color: "var(--text-primary)", margin: "0 0 0.35rem",
      }}>
        {readyHeadline}
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 560,
      }}>
        {identityUi === "verified"
          ? "You can reuse private proof when participating services request it."
          : "Complete the next step below when you are ready. Verified information is only required when a service asks for it."}
      </p>

      <div style={{
        padding: "0.65rem 0.75rem", borderRadius: 10,
        background: "var(--surface-inset)", border: "1px solid var(--border)",
        marginBottom: "1rem",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          Verified information
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: identityUi === "verified" ? ACCENT : "var(--text-secondary)" }}>
          {IDENTITY_UI_LABELS[identityUi]}
        </div>
        {identityUi !== "verified" && (
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
            Optional until required by a specific service.
          </div>
        )}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
          color: "var(--text-primary)", marginBottom: "0.45rem",
        }}>
          What you can do now
        </div>
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          {availableNow.slice(0, 4).map(label => (
            <li key={label} style={{
              fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
              lineHeight: 1.6, marginBottom: 4,
            }}>
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {handoff.isPartnerFlowContext ? (
          <PartnerReturnCta handoff={handoff} label="Return to service →" />
        ) : (
          <Btn href="/integrate" size="sm">Learn about compatible services →</Btn>
        )}
      </div>
    </section>
  );
}

function IdentityUnlockSection({
  identityUi,
  manualMode,
  veriffConfigured,
  expanded,
  onExpand,
  onDismiss,
  email,
  suiAddress,
  starting,
  isRefreshing,
  error,
  onStartIdCheck,
  onRefresh,
  capturePolicy,
}: {
  identityUi: IdentityUiState;
  manualMode: boolean;
  veriffConfigured: boolean;
  expanded: boolean;
  onExpand: () => void;
  onDismiss: () => void;
  email: string;
  suiAddress: string | null;
  starting: boolean;
  isRefreshing: boolean;
  error: string | null;
  onStartIdCheck: () => void;
  onRefresh: () => void;
  capturePolicy?: CapturePolicyContext;
}) {
  if (identityUi === "under_review") {
    return (
      <section style={CARD} aria-labelledby="identity-review-heading">
        <h2 id="identity-review-heading" style={{
          fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
          color: AMBER, margin: "0 0 0.5rem",
        }}>
          Identity review in progress
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)",
          lineHeight: 1.65, margin: "0 0 0.85rem",
        }}>
          {manualMode
            ? "Your name, ID photo, and selfie are in the Abraxas review queue. You can keep using your Passport while you wait."
            : "Your identity provider is reviewing your submission. Your Passport stays active."}
        </p>
        <Btn variant="secondary" size="sm" loading={isRefreshing} onClick={onRefresh}>
          Check status now
        </Btn>
      </section>
    );
  }

  if (identityUi === "needs_action") {
    return (
      <section style={{
        ...CARD,
        border: `1px solid ${RED}40`,
        background: "rgba(239,68,68,0.06)",
      }} aria-labelledby="identity-action-heading">
        <h2 id="identity-action-heading" style={{
          fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
          color: RED, margin: "0 0 0.5rem",
        }}>
          Identity verification needs action
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)",
          lineHeight: 1.65, margin: "0 0 0.85rem",
        }}>
          Your last submission was not approved. Try again with a different document or contact support.
        </p>
        {manualMode ? (
          <AbraxasIdentityCapture
            email={email}
            suiAddress={suiAddress}
            onSubmitted={onRefresh}
            capturePolicy={capturePolicy}
          />
        ) : (
          <Btn size="sm" loading={starting} onClick={onStartIdCheck}>
            Retry identity verification →
          </Btn>
        )}
      </section>
    );
  }

  if (!expanded) {
    return (
      <section style={CARD} aria-labelledby="identity-unlock-heading">
        <div style={{
          fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.45rem",
        }}>
          Your next unlock
        </div>
        <h2 id="identity-unlock-heading" style={{
          fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
          color: "var(--text-primary)", margin: "0 0 0.5rem",
        }}>
          Add identity verification when you need it
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)",
          lineHeight: 1.65, margin: "0 0 0.85rem",
        }}>
          Identity verification is not required to use your Passport. Some actions may require enhanced trust. Abraxas asks only for the claims needed for that action.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn size="sm" onClick={onExpand}>Add identity verification →</Btn>
          <Btn variant="ghost" size="sm" href="/cielo/verified-rate">Not now</Btn>
        </div>
      </section>
    );
  }

  return (
    <section style={CARD} aria-labelledby="identity-add-heading">
      <div style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.45rem",
      }}>
        Your next unlock
      </div>
      <h2 id="identity-add-heading" style={{
        fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
        color: "var(--text-primary)", margin: "0 0 0.5rem",
      }}>
        Add identity verification
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 0.85rem",
      }}>
        When required, identity verification can unlock:
      </p>
      <ul style={{ margin: "0 0 1rem", paddingLeft: "1.1rem" }}>
        {IDENTITY_UNLOCKS.map(u => (
          <li key={u} style={{
            fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)",
            lineHeight: 1.6, marginBottom: 4,
          }}>
            {u}
          </li>
        ))}
      </ul>

      {manualMode ? (
        <>
          <AbraxasIdentityCapture
            email={email}
            suiAddress={suiAddress}
            onSubmitted={onRefresh}
            capturePolicy={capturePolicy}
          />
          <p style={{
            fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
            margin: "0.65rem 0 0", lineHeight: 1.55,
          }}>
            Pilot Abraxas verify · Assurance L2. Partners receive the verification outcome, not your document images.
          </p>
        </>
      ) : veriffConfigured ? (
        <Btn size="lg" fullWidth loading={starting} onClick={onStartIdCheck}>
          Start identity verification →
        </Btn>
      ) : (
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: AMBER, margin: "0 0 0.65rem" }}>
          Automated ID check is not configured. Upload for pilot manual review below.
        </p>
      )}

      {!manualMode && !veriffConfigured && (
        <DocumentUpload
          email={email}
          suiAddress={suiAddress}
          stampId="identity"
          color={ACCENT}
          onUploaded={onRefresh}
        />
      )}

      {error && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: RED, margin: "0.65rem 0 0" }}>{error}</p>
      )}

      <div style={{ marginTop: "0.85rem" }}>
        <Btn variant="ghost" size="sm" onClick={onDismiss}>Not now</Btn>
      </div>
    </section>
  );
}

function CredentialsSection({
  walletBindingL3,
  identityUi,
  assuranceLabel,
  manualMode,
  credential,
  verifiedView = false,
}: {
  walletBindingL3: boolean;
  identityUi: IdentityUiState;
  assuranceLabel: string;
  manualMode: boolean;
  credential: StoredCredential | null;
  verifiedView?: boolean;
}) {
  return (
    <section style={CARD} aria-labelledby="credentials-heading">
      <div style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.45rem",
      }}>
        Credentials
      </div>
      <h2 id="credentials-heading" style={{
        fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
        color: "var(--text-primary)", margin: "0 0 0.35rem",
      }}>
        {verifiedView
          ? "Your active proofs"
          : "Time-bound yes/no proofs — not a folder of your documents"}
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
        lineHeight: 1.55, margin: "0 0 0.75rem",
      }}>
        {verifiedView
          ? "Partners check these proofs against their policy — they never receive your ID photos or selfie files."
          : "Think of a credential like a tamper-proof badge. Partners check the badge — they don't get your ID photos."}
      </p>

      {!verifiedView && (
        <details style={{ marginBottom: "1rem" }}>
          <summary style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: ACCENT, cursor: "pointer" }}>
            What is a JWT? (plain English)
          </summary>
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0.5rem 0 0" }}>
            A JWT is a signed string that says &quot;this person passed check X until date Y.&quot;
            Abraxas issues it after review. Apps verify the signature — they don&apos;t store your documents.
          </p>
        </details>
      )}

      <CredentialRow
        title="Account security"
        issuer="Abraxas"
        assurance={walletBindingL3 ? "Confirmed" : "Session"}
        status={walletBindingL3 ? "Connected" : "Sign-in session"}
        refresh="Reconfirm when a service requires it"
        compact={verifiedView}
        customerView
      />
      <CredentialRow
        title="Verified information"
        issuer={identityUi === "verified" ? (manualMode ? "Abraxas review" : "Approved identity provider") : "—"}
        assurance={identityUi === "verified" ? "On file" : "—"}
        status={IDENTITY_UI_LABELS[identityUi]}
        refresh={identityUi === "verified" && credential?.expires_at
          ? `Valid through ${new Date(credential.expires_at).toLocaleDateString()}`
          : "Only when a service requires it"}
        compact={verifiedView}
        customerView
      />

      <Link href="/passport?view=verify&mode=credential" style={{
        display: "inline-block", marginTop: "0.65rem",
        fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
      }}>
        Review what you have shared →
      </Link>
    </section>
  );
}

function CredentialRow({
  title,
  issuer,
  assurance,
  status,
  refresh,
  compact = false,
  customerView = false,
}: {
  title: string;
  issuer: string;
  assurance: string;
  status: string;
  refresh: string;
  compact?: boolean;
  customerView?: boolean;
}) {
  const rows = customerView
    ? [
        ["Status", status],
        ["Valid through", refresh.replace(/^(Expires |Valid through )/, "")],
      ]
    : compact
      ? [
          ["Status", status],
          ["Assurance", assurance],
          ["Valid through", refresh.replace(/^(Expires |Valid through )/, "")],
        ]
      : [
          ["Issuer", issuer],
          ["Assurance", assurance],
          ["Status", status],
          ["Refresh", refresh],
        ];

  return (
    <div style={{
      padding: "0.75rem 0.85rem", borderRadius: 10,
      background: "var(--surface-inset)", border: "1px solid var(--border)",
      marginBottom: "0.5rem",
    }}>
      <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: "0.2rem" }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--text-muted)" }}>{k}: </span>{v}
          </div>
        ))}
      </div>
    </div>
  );
}

function PartnerAccessSection({
  suiAddress,
  verifiedView = false,
}: {
  suiAddress: string | null;
  verifiedView?: boolean;
}) {
  return (
    <section style={{ marginBottom: "1.25rem" }} aria-labelledby="partner-access-heading">
      <h2 id="partner-access-heading" style={{
        fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
        color: "var(--text-primary)", margin: "0 0 0.5rem",
      }}>
        {verifiedView ? "Where your proof was used" : "What you share stays private"}
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 0.85rem",
      }}>
        {verifiedView
          ? "When you approve a service request, the consent record appears here. Each service sees only what its policy requires."
          : "When a service requests eligibility, you see what information is needed, why, and what access it unlocks."}
      </p>
      <PassportShareHistoryCard suiAddress={suiAddress} verifiedView={verifiedView} />
      <PassportPrivacyCenter suiAddress={suiAddress} />
    </section>
  );
}

function PassportCustomerAdvancedDetails({
  suiAddress,
  tier,
  walletBindingL3,
  manualMode,
  isPolling,
  identityUi,
  assuranceLabel,
}: {
  suiAddress: string | null;
  tier: PassportTier;
  walletBindingL3: boolean;
  manualMode: boolean;
  isPolling: boolean;
  identityUi: IdentityUiState;
  assuranceLabel: string;
}) {
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  async function startDemoRequest() {
    setDemoBusy(true);
    setDemoError(null);
    try {
      const res = await fetch("/api/passport/demo-partner-request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_id: "abraxas-core-v1" }),
      });
      const data = await res.json() as { consent_url?: string; error?: string };
      if (!res.ok || !data.consent_url) throw new Error(data.error ?? "Demo request failed");
      window.location.href = data.consent_url;
    } catch (e) {
      setDemoError(e instanceof Error ? e.message : "Demo request failed");
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <details style={{ ...CARD, marginBottom: "1.5rem" }}>
      <summary style={{
        fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
        color: "var(--text-secondary)", cursor: "pointer",
      }}>
        {PASSPORT_ADVANCED_DETAILS_TITLE}
      </summary>
      <div style={{ marginTop: "1rem" }}>
        <p style={{
          fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
          lineHeight: 1.6, margin: "0 0 0.85rem",
        }}>
          {TIER_LABELS[tier]} · Wallet control: {walletBindingL3 ? "signed proof" : "zkLogin session"}
          {identityUi === "verified" ? ` · Assurance ${assuranceLabel}` : ""}
          {suiAddress ? ` · ${truncateSuiAddress(suiAddress, 6, 4)}` : ""}
        </p>

        <IndependentBiometricStatusCard manualMode={manualMode} isPolling={isPolling} />

        <TransactionEligibilitySection enabled />

        <section style={{ marginTop: "1rem", marginBottom: "1rem" }} aria-labelledby="passport-security-heading">
          <h3 id="passport-security-heading" style={{
            fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800,
            color: "var(--text-primary)", margin: "0 0 0.35rem",
          }}>
            Confirm wallet control
          </h3>
          <p style={{
            fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)",
            lineHeight: 1.6, margin: "0 0 0.75rem",
          }}>
            Optional session security check — not an identity check.
          </p>
          <PassportIntentCard suiAddress={suiAddress} />
        </section>

        {suiAddress && (
          <div style={{ marginBottom: "1rem" }}>
            <Btn size="sm" variant="secondary" loading={demoBusy} onClick={() => void startDemoRequest()}>
              Test portable reuse loop →
            </Btn>
            {demoError && (
              <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: RED, margin: "0.45rem 0 0" }}>{demoError}</p>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href={HOLDER_VERIFY_DEFAULT_PATH} variant="secondary" size="sm">Developer receipt tester →</Btn>
          <Btn href="/passport#stamps" variant="secondary" size="sm">Business stamps →</Btn>
          <Btn href="/build" variant="ghost" size="sm">Submit an asset →</Btn>
        </div>
      </div>
    </details>
  );
}

function PassportVerifiedDetails({
  tier,
  suiAddress,
  walletBindingL3,
  manualMode,
  isPolling,
}: {
  tier: PassportTier;
  suiAddress: string | null;
  walletBindingL3: boolean;
  manualMode: boolean;
  isPolling: boolean;
}) {
  return (
    <details style={{ ...CARD, marginBottom: "1.5rem" }}>
      <summary style={{
        fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
        color: "var(--text-secondary)", cursor: "pointer",
      }}>
        {PASSPORT_ADVANCED_DETAILS_TITLE}
      </summary>
      <div style={{ marginTop: "1rem" }}>
        <p style={{
          fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
          lineHeight: 1.6, margin: "0 0 0.85rem",
        }}>
          Passport tier {tier} · Wallet control: {walletBindingL3 ? "signed proof" : "zkLogin session"}
          {suiAddress ? ` · ${truncateSuiAddress(suiAddress, 6, 4)}` : ""}
        </p>

        <IndependentBiometricStatusCard manualMode={manualMode} isPolling={isPolling} />

        <details style={{ marginBottom: "1rem" }}>
          <summary style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: ACCENT, cursor: "pointer" }}>
            Technical credential notes
          </summary>
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0.5rem 0 0" }}>
            Credentials are signed JWTs (W3C Verifiable Credentials). Partners verify the signature — they do not receive document images or biometric scores.
          </p>
        </details>

        <section style={{ marginBottom: "1rem" }} aria-labelledby="passport-security-details-heading">
          <h3 id="passport-security-details-heading" style={{
            fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800,
            color: "var(--text-primary)", margin: "0 0 0.35rem",
          }}>
            Confirm wallet control
          </h3>
          <p style={{
            fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)",
            lineHeight: 1.6, margin: "0 0 0.75rem",
          }}>
            Optional session security check — not an identity check.
          </p>
          <PassportIntentCard suiAddress={suiAddress} />
        </section>

        <TransactionEligibilitySection enabled />

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <Btn href="/passport#stamps" variant="secondary" size="sm">Business stamps →</Btn>
          <Btn href="/build" variant="ghost" size="sm">Submit an asset →</Btn>
        </div>
      </div>
    </details>
  );
}
