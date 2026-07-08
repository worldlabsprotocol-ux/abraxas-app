"use client";
// FILE: components/passport/PassportDashboard.tsx
// State-driven Passport control center — tier status, one identity card, credentials.

import { useState } from "react";
import Link from "next/link";
import { ZkLoginSignIn } from "@/components/sui/ZkLoginSignIn";
import { truncateSuiAddress } from "@/components/sui/SuiAuthProvider";
import { signIntentMessage } from "@/lib/sui/intent/personalMessage";
import { getEphemeralSecretKey } from "@/lib/sui/zklogin/signingSession";
import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";
import type { IdentityStampStatus } from "@/lib/hooks/usePassportVerification";
import type { StoredCredential } from "@/lib/credentials/storage";
import { Btn } from "@/components/redesign/ui";
import { DocumentUpload } from "@/components/passport/DocumentUpload";
import { PassportShareHistoryCard } from "@/components/passport/PassportShareHistoryCard";
import { PassportIntentCard } from "@/components/passport/PassportIntentCard";
import {
  resolvePassportTier,
  TIER_LABELS,
  tierCapabilities,
  type PassportTier,
} from "@/lib/passport/passportTiers";
import {
  resolveIdentityUiState,
  IDENTITY_UI_LABELS,
  type IdentityUiState,
} from "@/lib/passport/identityUiState";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
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
  suiAddress: string | null;
  email: string;
  setup: PassportSetupState;
  identityStatus: IdentityStampStatus;
  credential: StoredCredential | null;
  via: string | null;
  isRefreshing: boolean;
  starting: boolean;
  error: string | null;
  idvProvider: "veriff" | "manual";
  veriffConfigured: boolean;
  walletBindingL3: boolean;
  onStartIdCheck: () => void;
  onRefresh: () => void;
  onWalletBound?: () => void;
  returnPath?: string | null;
}

export function PassportDashboard({
  walletDone,
  suiAddress,
  email,
  setup,
  identityStatus,
  credential,
  via,
  isRefreshing,
  starting,
  error,
  idvProvider,
  veriffConfigured,
  walletBindingL3,
  onStartIdCheck,
  onRefresh,
  onWalletBound,
  returnPath,
}: Props) {
  const [identityExpanded, setIdentityExpanded] = useState(false);
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

  async function bindWallet() {
    if (!suiAddress) return;
    try {
      const secret = getEphemeralSecretKey();
      if (!secret) throw new Error("Sign in again to enable wallet signing.");

      const chRes = await fetch("/api/wallet/binding/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_address: suiAddress }),
      });
      const challenge = await chRes.json() as { challenge_id?: string; message?: string; error?: string };
      if (!chRes.ok || !challenge.challenge_id || !challenge.message) {
        throw new Error(challenge.error ?? "Challenge failed");
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
      if (!confirmRes.ok) throw new Error(result.error ?? "Confirm failed");
      onWalletBound?.();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div>
      {!walletDone && (
        <section style={CARD} aria-labelledby="passport-signin-heading">
          <h2 id="passport-signin-heading" style={{
            fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800,
            color: "var(--text-primary)", margin: "0 0 0.5rem",
          }}>
            Create your Passport
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
            lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 520,
          }}>
            Sign in with Google. Bind a wallet when you&apos;re ready. Identity verification only appears when it unlocks a specific action.
          </p>
          <ZkLoginSignIn />
        </section>
      )}

      {walletDone && !setup.walletBound && (
        <section style={CARD} aria-labelledby="passport-bind-heading">
          <h2 id="passport-bind-heading" style={{
            fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800,
            color: "var(--text-primary)", margin: "0 0 0.5rem",
          }}>
            Bind your wallet
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
            lineHeight: 1.65, margin: "0 0 1rem",
          }}>
            One signature proves wallet control. No funds move. This unlocks Tier 1 pilots like Cielo verified rate.
          </p>
          {suiAddress && (
            <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "0.85rem" }}>
              {truncateSuiAddress(suiAddress, 8, 6)}
            </div>
          )}
          <Btn size="lg" fullWidth onClick={() => void bindWallet()}>
            Sign to bind wallet →
          </Btn>
        </section>
      )}

      {setup.profileComplete && (
        <>
          <PassportStatusCard
            tier={tier}
            suiAddress={suiAddress}
            walletBindingL3={walletBindingL3}
            identityUi={identityUi}
            assuranceLabel={assuranceLabel}
            availableNow={availableNow}
            returnPath={returnPath}
          />

          {identityUi !== "verified" && (
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
            />
          )}

          <CredentialsSection
            walletBindingL3={walletBindingL3}
            identityUi={identityUi}
            assuranceLabel={assuranceLabel}
            manualMode={manualMode}
            credential={credential}
          />

          <PartnerAccessSection suiAddress={suiAddress} />

          <section style={CARD} aria-labelledby="passport-security-heading">
            <div style={{
              fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: ACCENT, marginBottom: "0.45rem",
            }}>
              Security
            </div>
            <h2 id="passport-security-heading" style={{
              fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
              color: "var(--text-primary)", margin: "0 0 0.35rem",
            }}>
              Confirm wallet control
            </h2>
            <p style={{
              fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
              lineHeight: 1.6, margin: "0 0 0.85rem",
            }}>
              Optional session security check. Signs a message proving you control your connected wallet — not an identity check.
            </p>
            <PassportIntentCard suiAddress={suiAddress} />
          </section>

          <section style={{ ...CARD, marginBottom: "1.5rem" }} aria-labelledby="passport-business-heading">
            <div style={{
              fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: ACCENT, marginBottom: "0.45rem",
            }}>
              For businesses and asset owners
            </div>
            <h2 id="passport-business-heading" style={{
              fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
              color: "var(--text-primary)", margin: "0 0 0.85rem",
            }}>
              Need a business credential, asset-owner proof, or issuer attestation?
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <Btn href="/passport#stamps" variant="secondary" size="sm">Stamp a credential →</Btn>
              <Btn href="/build" variant="ghost" size="sm">Submit an asset →</Btn>
            </div>
          </section>
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
  returnPath,
}: {
  tier: PassportTier;
  suiAddress: string | null;
  walletBindingL3: boolean;
  identityUi: IdentityUiState;
  assuranceLabel: string;
  availableNow: { label: string }[];
  returnPath?: string | null;
}) {
  return (
    <section style={{
      ...CARD,
      border: "2px solid rgba(16,185,129,0.28)",
      background: "rgba(16,185,129,0.04)",
    }} aria-labelledby="passport-status-heading">
      <div style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.45rem",
      }}>
        Passport status
      </div>
      <h2 id="passport-status-heading" style={{
        fontFamily: FONT, fontSize: "1.15rem", fontWeight: 800,
        color: "var(--text-primary)", margin: "0 0 0.25rem",
      }}>
        {TIER_LABELS[tier]}
      </h2>
      <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: ACCENT, marginBottom: "0.65rem" }}>
        Tier {tier} · Active
      </div>
      <p style={{
        fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 560,
      }}>
        Your account and wallet are ready for Abraxas applications that accept wallet-bound access.
      </p>

      {suiAddress && (
        <div style={{
          padding: "0.65rem 0.75rem", borderRadius: 10,
          background: "var(--surface-inset)", border: "1px solid var(--border)",
          marginBottom: "0.85rem",
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Wallet
          </div>
          <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-secondary)" }}>
            {truncateSuiAddress(suiAddress, 8, 6)}
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: walletBindingL3 ? ACCENT : "var(--text-muted)", marginTop: 4 }}>
            Control proof: {walletBindingL3 ? "Active" : "zkLogin session"}
          </div>
        </div>
      )}

      <div style={{
        padding: "0.65rem 0.75rem", borderRadius: 10,
        background: "var(--surface-inset)", border: "1px solid var(--border)",
        marginBottom: "1rem",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          Identity credential
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: identityUi === "verified" ? ACCENT : "var(--text-secondary)" }}>
          {IDENTITY_UI_LABELS[identityUi]}
          {identityUi === "verified" && ` · Assurance ${assuranceLabel}`}
        </div>
        {identityUi !== "verified" && (
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
            Optional until required by a specific partner or transaction.
          </div>
        )}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          color: "var(--text-muted)", marginBottom: "0.45rem",
        }}>
          What you can do now
        </div>
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          {availableNow.slice(0, 5).map(c => (
            <li key={c.label} style={{
              fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
              lineHeight: 1.6, marginBottom: 4,
            }}>
              {c.label}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {returnPath ? (
          <Btn href={decodeURIComponent(returnPath)} size="sm">Return to flow →</Btn>
        ) : (
          <Btn href="/cielo/verified-rate" size="sm">Try Cielo verified rate →</Btn>
        )}
        <Btn href="/#registry" variant="secondary" size="sm">Browse registry →</Btn>
        <Btn href="/passport?view=verify" variant="ghost" size="sm">Verify a record →</Btn>
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
            ? "Our team is reviewing your uploaded ID. You can continue using your Passport while you wait."
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
          <DocumentUpload
            email={email}
            suiAddress={suiAddress}
            stampId="identity"
            color={ACCENT}
            onUploaded={onRefresh}
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
          Identity verification is not required to use your Passport. Some actions may require enhanced trust — Abraxas asks only for the claims needed for that action.
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
          <DocumentUpload
            email={email}
            suiAddress={suiAddress}
            stampId="identity"
            color={ACCENT}
            onUploaded={onRefresh}
          />
          <p style={{
            fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
            margin: "0.65rem 0 0", lineHeight: 1.55,
          }}>
            Pilot manual review · Assurance L2. Abraxas uses the verification outcome, not your documents, as the reusable credential.
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
}: {
  walletBindingL3: boolean;
  identityUi: IdentityUiState;
  assuranceLabel: string;
  manualMode: boolean;
  credential: StoredCredential | null;
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
        Time-bound proofs — not one generic KYC badge
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
        lineHeight: 1.55, margin: "0 0 1rem",
      }}>
        Credentials are separate, time-bound proofs issued by approved authorities.
      </p>

      <CredentialRow
        title="Wallet binding"
        issuer="Abraxas"
        assurance={walletBindingL3 ? "L3" : "L2"}
        status={walletBindingL3 ? "Active" : "Session"}
        refresh="Every 30 days or before high-value actions"
      />
      <CredentialRow
        title="Identity verification"
        issuer={identityUi === "verified" ? (manualMode ? "Abraxas pilot review" : "Approved identity provider") : "—"}
        assurance={identityUi === "verified" ? assuranceLabel : "—"}
        status={IDENTITY_UI_LABELS[identityUi]}
        refresh={identityUi === "verified" && credential?.expires_at
          ? `Expires ${new Date(credential.expires_at).toLocaleDateString()}`
          : "Only when a partner policy requires it"}
      />

      <Link href="/passport?view=verify&mode=credential" style={{
        display: "inline-block", marginTop: "0.65rem",
        fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
      }}>
        View all credentials →
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
}: {
  title: string;
  issuer: string;
  assurance: string;
  status: string;
  refresh: string;
}) {
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
        {[
          ["Issuer", issuer],
          ["Assurance", assurance],
          ["Status", status],
          ["Refresh", refresh],
        ].map(([k, v]) => (
          <div key={k} style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--text-muted)" }}>{k}: </span>{v}
          </div>
        ))}
      </div>
    </div>
  );
}

function PartnerAccessSection({ suiAddress }: { suiAddress: string | null }) {
  return (
    <section style={{ marginBottom: "1.25rem" }} aria-labelledby="partner-access-heading">
      <div style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.45rem",
      }}>
        Partner access
      </div>
      <h2 id="partner-access-heading" style={{
        fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
        color: "var(--text-primary)", margin: "0 0 0.5rem",
      }}>
        Partners never receive your raw documents by default
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 0.85rem",
      }}>
        When a partner requests eligibility, you see which claims they need, why, how long approval is valid, and what action the decision unlocks.
      </p>
      <PassportShareHistoryCard suiAddress={suiAddress} />
    </section>
  );
}
