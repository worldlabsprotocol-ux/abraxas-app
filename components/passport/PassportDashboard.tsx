"use client";
// FILE: components/passport/PassportDashboard.tsx
// Profile-first Passport — Overview, Wallets, Verifications, Activity.

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ZkLoginSignIn } from "@/components/sui/ZkLoginSignIn";
import { signIntentMessage } from "@/lib/sui/intent/personalMessage";
import { getEphemeralSecretKey } from "@/lib/sui/zklogin/signingSession";
import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";
import type { IdentityStampStatus } from "@/lib/hooks/usePassportVerification";
import type { StoredCredential } from "@/lib/credentials/storage";
import { Btn } from "@/components/redesign/ui";
import { DocumentUpload } from "@/components/passport/DocumentUpload";
import { PassportShareHistoryCard } from "@/components/passport/PassportShareHistoryCard";
import { PassportIntentCard } from "@/components/passport/PassportIntentCard";
import { TransactionEligibilitySection } from "@/components/passport/TransactionEligibilitySection";
import { UnifiedWalletBindingsPanel } from "@/components/passport/UnifiedWalletBindingsPanel";
import { PassportProfileHeader } from "@/components/passport/PassportProfileHeader";
import { PassportSubTabs, parsePassportSubTab } from "@/components/passport/PassportSubTabs";
import { PassportEditProfilePanel } from "@/components/passport/PassportEditProfilePanel";
import { buildPassportProgress } from "@/lib/passport/passportProgress";
import type { PassportTierInput } from "@/lib/passport/passportTiers";
import {
  resolveIdentityUiState,
  IDENTITY_UI_LABELS,
  type IdentityUiState,
} from "@/lib/passport/identityUiState";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
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

export function PassportDashboard(props: Props) {
  const searchParams = useSearchParams();
  const tab = parsePassportSubTab(searchParams.get("tab"));
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [identityExpanded, setIdentityExpanded] = useState(false);
  const [suiBindBusy, setSuiBindBusy] = useState(false);

  const tierInput: PassportTierInput = {
    accountActive: props.setup.accountComplete,
    profileComplete: props.setup.profileComplete,
    walletBound: props.setup.walletBound,
    walletBindingFresh: props.setup.walletBound,
    identityCredentialActive: props.setup.identityComplete,
  };
  const progress = buildPassportProgress(tierInput);
  const manualMode = props.idvProvider === "manual";
  const hasCredential = Boolean(props.credential) && props.identityStatus === "earned";
  const assuranceLabel = manualMode ? "L2" : "L3";
  const identityUi = resolveIdentityUiState({
    identityStatus: props.identityStatus,
    hasCredential,
    idvProvider: props.idvProvider,
    via: props.via,
  });

  async function bindWallet() {
    if (!props.suiAddress) return;
    setSuiBindBusy(true);
    try {
      const secret = getEphemeralSecretKey();
      if (!secret) throw new Error("Sign in again to enable wallet signing.");

      const chRes = await fetch("/api/wallet/binding/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_address: props.suiAddress }),
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
          sui_address: props.suiAddress,
          message: challenge.message,
          signature,
          public_key: publicKey,
        }),
      });
      const result = await confirmRes.json() as { ok?: boolean; error?: string };
      if (!confirmRes.ok) throw new Error(result.error ?? "Confirm failed");
      props.onWalletBound?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSuiBindBusy(false);
    }
  }

  return (
    <div>
      <PassportProfileHeader
        email={props.email}
        signedIn={props.walletDone}
        tierInput={tierInput}
        returnPath={props.returnPath}
        onEditProfile={() => setEditProfileOpen(true)}
      />

      {editProfileOpen && props.walletDone && (
        <PassportEditProfilePanel onClose={() => setEditProfileOpen(false)} />
      )}

      {!props.walletDone ? (
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
            Sign in with Google. Add a wallet when you&apos;re ready. Verify identity only when something needs it.
          </p>
          <p style={{
            fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
            margin: "0 0 1rem", lineHeight: 1.55,
          }}>
            Pilot access for approved partners and verified use cases.
          </p>
          <ZkLoginSignIn returnPath={props.returnPath ? decodeURIComponent(props.returnPath) : undefined} />
        </section>
      ) : (
        <>
          <PassportSubTabs active={tab} />

          {tab === "overview" && (
            <OverviewTab
              progress={progress}
              returnPath={props.returnPath}
              profileComplete={props.setup.profileComplete}
              walletBound={props.setup.walletBound}
            />
          )}

          {tab === "wallets" && (
            <>
              <UnifiedWalletBindingsPanel
                suiAddress={props.suiAddress}
                onSuiBind={!props.setup.walletBound ? () => void bindWallet() : undefined}
                suiBindBusy={suiBindBusy}
              />
              <section style={CARD}>
                <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.35rem" }}>
                  Confirm wallet control
                </h2>
                <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.85rem" }}>
                  Optional check — sign a message to prove you still control this wallet.
                </p>
                <PassportIntentCard suiAddress={props.suiAddress} />
              </section>
            </>
          )}

          {tab === "approvals" && (
            <>
              {props.setup.profileComplete ? (
                <>
                  {identityUi !== "verified" && (
                    <IdentityUnlockSection
                      identityUi={identityUi}
                      manualMode={manualMode}
                      veriffConfigured={props.veriffConfigured}
                      expanded={identityExpanded}
                      onExpand={() => setIdentityExpanded(true)}
                      onDismiss={() => setIdentityExpanded(false)}
                      email={props.email}
                      suiAddress={props.suiAddress}
                      starting={props.starting}
                      isRefreshing={props.isRefreshing}
                      error={props.error}
                      onStartIdCheck={props.onStartIdCheck}
                      onRefresh={props.onRefresh}
                    />
                  )}
                  <CredentialsSection
                    walletBindingL3={props.walletBindingL3}
                    identityUi={identityUi}
                    assuranceLabel={assuranceLabel}
                    manualMode={manualMode}
                    credential={props.credential}
                  />
                  <TransactionEligibilitySection enabled={props.setup.profileComplete} />
                  <section style={CARD} id="stamps">
                    <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
                      Business & asset-owner stamps
                    </h2>
                    <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
                      For business verification or asset-owner attestation — requires document review.
                    </p>
                    <DocumentUpload
                      email={props.email || props.suiAddress || ""}
                      suiAddress={props.suiAddress}
                      stampId="business"
                      color="#3B82F6"
                    />
                  </section>
                </>
              ) : (
                <EmptyState
                  title="Connect a wallet first"
                  body="Verification items appear after your wallet is bound."
                  actionHref="/passport?tab=wallets"
                  actionLabel="Go to Wallets"
                />
              )}
            </>
          )}

          {tab === "activity" && (
            <>
              {props.setup.profileComplete ? (
                <PartnerAccessSection suiAddress={props.suiAddress} />
              ) : (
                <EmptyState
                  title="No activity yet"
                  body="Partner requests, consent history, and receipts show up here after wallet setup."
                  actionHref="/passport?tab=wallets"
                  actionLabel="Add wallet"
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function OverviewTab({
  progress,
  returnPath,
  profileComplete,
  walletBound,
}: {
  progress: ReturnType<typeof buildPassportProgress>;
  returnPath?: string | null;
  profileComplete: boolean;
  walletBound: boolean;
}) {
  return (
    <>
      {!walletBound && (
        <section style={{
          ...CARD,
          border: "2px solid rgba(16,185,129,0.35)",
          background: "rgba(16,185,129,0.06)",
        }}>
          <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.35rem" }}>
            Add a wallet when you&apos;re ready
          </h2>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
            A wallet is optional until an action needs it — like a verified booking rate or partner request. One signature proves control; no funds move.
          </p>
          <Btn href="/passport?tab=wallets" size="lg">Add wallet →</Btn>
        </section>
      )}

      <section style={CARD}>
        <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.5rem" }}>
          What you can do
        </h2>
        {progress.unlockedSummary.length > 0 ? (
          <ul style={{ margin: "0 0 1rem", paddingLeft: "1.1rem" }}>
            {progress.unlockedSummary.map(label => (
              <li key={label} style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 4 }}>
                {label}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
            Sign in and connect a wallet to unlock pilot actions.
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {returnPath ? (
            <Btn href={decodeURIComponent(returnPath)} size="sm">Return to flow →</Btn>
          ) : profileComplete ? (
            <Btn href="/cielo/verified-rate" size="sm">Try Cielo pilot →</Btn>
          ) : (
            <Btn href="/passport?tab=wallets" size="sm">Add wallet →</Btn>
          )}
          <Btn href="/#registry" variant="secondary" size="sm">Browse registry →</Btn>
          <Btn href="/passport?view=verify" variant="ghost" size="sm">Verify a record →</Btn>
        </div>
      </section>

      <section style={{ ...CARD, background: "var(--surface-inset)" }}>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.65, margin: 0 }}>
          Abraxas lets you prove what a platform needs — without repeatedly handing over everything else.
          {" "}
          <Link href="/docs/why-verification" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
            How verification works →
          </Link>
        </p>
      </section>
    </>
  );
}

function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <section style={CARD}>
      <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.35rem" }}>{title}</h2>
      <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>{body}</p>
      <Btn href={actionHref} size="sm">{actionLabel} →</Btn>
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
      <section style={CARD}>
        <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: AMBER, margin: "0 0 0.5rem" }}>
          Identity review in progress
        </h2>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
          {manualMode
            ? "Our team is reviewing your ID. Your Passport stays active meanwhile."
            : "Your identity provider is reviewing your submission."}
        </p>
        <Btn variant="secondary" size="sm" loading={isRefreshing} onClick={onRefresh}>
          Check status
        </Btn>
      </section>
    );
  }

  if (identityUi === "needs_action") {
    return (
      <section style={{ ...CARD, border: `1px solid ${RED}40`, background: "rgba(239,68,68,0.06)" }}>
        <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: RED, margin: "0 0 0.5rem" }}>
          Identity needs action
        </h2>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
          Your last submission was not approved. Try again or contact support.
        </p>
        {manualMode ? (
          <DocumentUpload email={email} suiAddress={suiAddress} stampId="identity" color={ACCENT} onUploaded={onRefresh} />
        ) : (
          <Btn size="sm" loading={starting} onClick={onStartIdCheck}>Retry verification →</Btn>
        )}
      </section>
    );
  }

  if (!expanded) {
    return (
      <section style={CARD}>
        <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
          Identity verification
        </h2>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
          Optional until a partner or action requires it. Abraxas asks only for what that policy needs.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn size="sm" onClick={onExpand}>Start verification →</Btn>
          <Btn variant="ghost" size="sm" href="/cielo/verified-rate">Not now</Btn>
        </div>
      </section>
    );
  }

  return (
    <section style={CARD}>
      <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
        Add identity verification
      </h2>
      {manualMode ? (
        <>
          <DocumentUpload email={email} suiAddress={suiAddress} stampId="identity" color={ACCENT} onUploaded={onRefresh} />
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.65rem 0 0", lineHeight: 1.55 }}>
            Pilot manual review. Abraxas stores the outcome, not your documents, as the reusable proof.
          </p>
        </>
      ) : veriffConfigured ? (
        <Btn size="lg" fullWidth loading={starting} onClick={onStartIdCheck}>
          Start identity verification →
        </Btn>
      ) : (
        <>
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: AMBER, margin: "0 0 0.65rem" }}>
            Automated ID check is not configured. Upload for pilot manual review below.
          </p>
          <DocumentUpload email={email} suiAddress={suiAddress} stampId="identity" color={ACCENT} onUploaded={onRefresh} />
        </>
      )}
      {error && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: RED, margin: "0.65rem 0 0" }}>{error}</p>}
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
    <section style={CARD}>
      <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.35rem" }}>
        Your verifications
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 1rem" }}>
        Separate proofs with clear expiry — not one generic badge.
      </p>
      <CredentialRow
        title="Wallet binding"
        status={walletBindingL3 ? "Active" : "Session"}
        detail={walletBindingL3 ? "Signed proof on file" : "Complete binding in Wallets tab"}
      />
      <CredentialRow
        title="Identity"
        status={IDENTITY_UI_LABELS[identityUi]}
        detail={identityUi === "verified"
          ? `${manualMode ? "Pilot review" : "Approved provider"} · ${assuranceLabel}${credential?.expires_at ? ` · expires ${new Date(credential.expires_at).toLocaleDateString()}` : ""}`
          : "Only when a policy requires it"}
      />
      <Link href="/passport?view=verify&mode=credential" style={{
        display: "inline-block", marginTop: "0.65rem",
        fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
      }}>
        Verify a credential →
      </Link>
    </section>
  );
}

function CredentialRow({ title, status, detail }: { title: string; status: string; detail: string }) {
  return (
    <div style={{
      padding: "0.75rem 0.85rem", borderRadius: 10,
      background: "var(--surface-inset)", border: "1px solid var(--border)",
      marginBottom: "0.5rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
        <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>{title}</div>
        <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: ACCENT }}>{status}</div>
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 4 }}>{detail}</div>
    </div>
  );
}

function PartnerAccessSection({ suiAddress }: { suiAddress: string | null }) {
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
    <section style={{ marginBottom: "1.25rem" }}>
      <section style={CARD}>
        <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
          Partner requests & consent
        </h2>
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
          When a partner asks for proof, you see what they need, why, and what unlocks if you approve.
        </p>
        {suiAddress && (
          <>
            <Btn size="sm" variant="secondary" loading={demoBusy} onClick={() => void startDemoRequest()}>
              Try demo partner request →
            </Btn>
            {demoError && (
              <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: RED, margin: "0.45rem 0 0" }}>{demoError}</p>
            )}
            <p style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", margin: "0.45rem 0 0", lineHeight: 1.5 }}>
              Pilot demo — simulates a partner consent flow.
            </p>
          </>
        )}
      </section>
      <PassportShareHistoryCard suiAddress={suiAddress} />
    </section>
  );
}
