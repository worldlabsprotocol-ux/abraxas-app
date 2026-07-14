"use client";
// FILE: components/passport/PassportDashboard.tsx
// Four canonical sections: Profile · Verification · Wallets · Access.

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
import { UnifiedWalletBindingsPanel } from "@/components/passport/UnifiedWalletBindingsPanel";
import { PassportProfileHeader } from "@/components/passport/PassportProfileHeader";
import { PassportSubTabs, parsePassportSubTab } from "@/components/passport/PassportSubTabs";
import { PassportEditProfilePanel } from "@/components/passport/PassportEditProfilePanel";
import { PassportStepPurpose } from "@/components/passport/PassportStepPurpose";
import { PASSPORT_STEPS } from "@/lib/passport/passportStepCopy";
import { buildPassportProgress } from "@/lib/passport/passportProgress";
import { usePassportCanonicalState } from "@/lib/hooks/usePassportCanonicalState";
import type { PassportTierInput } from "@/lib/passport/passportTiers";
import {
  resolveIdentityUiState,
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

  const manualMode = props.idvProvider === "manual";
  const hasCredential = Boolean(props.credential) && props.identityStatus === "earned";
  const identityUi = resolveIdentityUiState({
    identityStatus: props.identityStatus,
    hasCredential,
    idvProvider: props.idvProvider,
    via: props.via,
  });

  const { state: canonical, refetch: refetchCanonical } = usePassportCanonicalState({
    suiAddress: props.suiAddress,
    identityUi,
    credentialExpiresAt: props.credential?.expires_at,
    idvProvider: props.idvProvider,
  });

  const tierInput: PassportTierInput = {
    accountActive: props.setup.accountComplete,
    profileComplete: props.setup.profileComplete,
    walletBound: props.setup.walletBound,
    walletBindingFresh: props.setup.walletBound,
    identityCredentialActive: props.setup.identityComplete,
  };
  const progress = buildPassportProgress(tierInput);

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
      await refetchCanonical();
    } catch (e) {
      console.error(e);
    } finally {
      setSuiBindBusy(false);
    }
  }

  return (
    <div>
      {props.walletDone && (
        <PassportProfileHeader
          email={props.email}
          signedIn={props.walletDone}
          canonical={canonical}
          onEditProfile={() => setEditProfileOpen(true)}
        />
      )}

      {editProfileOpen && props.walletDone && (
        <PassportEditProfilePanel onClose={() => setEditProfileOpen(false)} />
      )}

      {!props.walletDone ? (
        <section style={CARD}>
          <PassportStepPurpose title={PASSPORT_STEPS.create.title} purpose={PASSPORT_STEPS.create.purpose} />
          <ZkLoginSignIn returnPath={props.returnPath ? decodeURIComponent(props.returnPath) : undefined} />
        </section>
      ) : (
        <>
          <PassportSubTabs active={tab} />

          {tab === "profile" && (
            <ProfileTab
              progress={progress}
              canonical={canonical}
              returnPath={props.returnPath}
              walletBound={props.setup.walletBound}
            />
          )}

          {tab === "wallets" && (
            <WalletsTab
              canonical={canonical}
              progress={progress}
              walletBound={props.setup.walletBound}
              suiAddress={props.suiAddress}
              onSuiBind={!props.setup.walletBound ? () => void bindWallet() : undefined}
              suiBindBusy={suiBindBusy}
            />
          )}

          {tab === "verification" && (
            <VerificationTab
              identityUi={identityUi}
              canonical={canonical}
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
              profileComplete={props.setup.profileComplete}
            />
          )}

          {tab === "access" && (
            <AccessTab suiAddress={props.suiAddress} profileComplete={props.setup.profileComplete} />
          )}
        </>
      )}
    </div>
  );
}

function WalletsTab({
  canonical,
  progress,
  walletBound,
  suiAddress,
  onSuiBind,
  suiBindBusy,
}: {
  canonical: ReturnType<typeof usePassportCanonicalState>["state"];
  progress: ReturnType<typeof buildPassportProgress>;
  walletBound: boolean;
  suiAddress: string | null;
  onSuiBind?: () => void;
  suiBindBusy?: boolean;
}) {
  const suiCount = canonical?.wallets.activeCount ?? 0;
  const evmCount = canonical?.wallets.bindings.filter(w => w.chain === "evm" && w.status === "active").length ?? 0;

  return (
    <>
      <section className="abx-glass-panel" style={{ ...CARD, marginBottom: "1rem" }}>
        <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.75rem" }}>
          Wallet dashboard
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.65rem" }}>
          {[
            { label: "Sui wallet", value: walletBound ? "Connected" : "Not linked" },
            { label: "Active bindings", value: walletBound ? String(suiCount || 1) : "0" },
            { label: "EVM wallets", value: String(evmCount) },
            { label: "Passport tier", value: progress.statusLabel },
          ].map(row => (
            <div key={row.label} style={{
              padding: "0.65rem 0.75rem", borderRadius: 12,
              border: "1px solid var(--border)", background: "var(--surface)",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {row.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
        {walletBound && (
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, fontWeight: 600, margin: "0.85rem 0 0", lineHeight: 1.55 }}>
            Your Sui wallet is linked. Partners can verify ownership without moving funds.
          </p>
        )}
      </section>

      <UnifiedWalletBindingsPanel
        suiAddress={suiAddress}
        onSuiBind={onSuiBind}
        suiBindBusy={suiBindBusy}
      />

      {walletBound && (
        <section style={CARD}>
          <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem" }}>Registry access</h2>
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
            Your wallet unlocks diligence packs and partner flows on live assets.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Btn href="/#registry" size="sm">Browse registry →</Btn>
            <Btn href="/flagship" variant="secondary" size="sm">Cielo Sunrise →</Btn>
            <Btn href="/case-studies/chickasaw-project" variant="secondary" size="sm">Chickasaw Project →</Btn>
          </div>
        </section>
      )}
    </>
  );
}

function ProfileTab({
  progress,
  canonical,
  returnPath,
  walletBound,
}: {
  progress: ReturnType<typeof buildPassportProgress>;
  canonical: ReturnType<typeof usePassportCanonicalState>["state"];
  returnPath?: string | null;
  walletBound: boolean;
}) {
  const walletCount = canonical?.wallets.activeCount ?? 0;
  const verificationLabel = canonical?.verification.label ?? "Not started";
  const shareCount = canonical?.access.shares.filter(s => !s.revoked).length ?? 0;

  return (
    <>
      <section className="abx-glass-panel" style={{ ...CARD, marginBottom: "1rem" }}>
        <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.75rem" }}>
          Your account
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.65rem" }}>
          {[
            { label: "Passport tier", value: progress.statusLabel },
            { label: "Wallets linked", value: walletBound ? String(walletCount || 1) : "0" },
            { label: "Identity", value: verificationLabel },
            { label: "Active shares", value: String(shareCount) },
          ].map(row => (
            <div key={row.label} style={{
              padding: "0.65rem 0.75rem", borderRadius: 12,
              border: "1px solid var(--border)", background: "var(--surface)",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {row.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {!walletBound && (
        <section style={{ ...CARD, border: "2px solid var(--accent-border)", background: "var(--accent-faint)" }}>
          <PassportStepPurpose title={PASSPORT_STEPS.addWallet.title} purpose={PASSPORT_STEPS.addWallet.purpose} />
          <Btn href="/passport?tab=wallets" size="lg">Connect wallet →</Btn>
        </section>
      )}

      <section style={CARD}>
        <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem" }}>Unlocked for you</h2>
        {progress.unlockedSummary.length > 0 ? (
          <ul style={{ margin: "0 0 1rem", paddingLeft: "1.1rem" }}>
            {progress.unlockedSummary.map(label => (
              <li key={label} style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 4 }}>
                {label}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 1rem" }}>
            Connect a wallet to unlock registry actions and partner flows.
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {returnPath ? (
            <Btn href={decodeURIComponent(returnPath)} size="sm">Return to request →</Btn>
          ) : (
            <>
              <Btn href="/#registry" size="sm">Browse registry →</Btn>
              {walletBound && (
                <Btn href="/cielo/verified-rate" variant="secondary" size="sm">Cielo booking →</Btn>
              )}
            </>
          )}
        </div>
      </section>

      {canonical && canonical.access.shares.length > 0 && (
        <section style={CARD}>
          <h2 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem" }}>Recent shares</h2>
          {canonical.access.shares.slice(0, 3).map(s => (
            <div key={s.id} style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", marginBottom: 6 }}>
              {s.partnerId}: {s.proofLabel}{s.revoked ? " (revoked)" : ""}
            </div>
          ))}
          <Link href="/passport?tab=access" style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
            View all access →
          </Link>
        </section>
      )}
    </>
  );
}

function VerificationTab({
  identityUi,
  canonical,
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
  profileComplete,
}: {
  identityUi: IdentityUiState;
  canonical: ReturnType<typeof usePassportCanonicalState>["state"];
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
  profileComplete: boolean;
}) {
  if (!profileComplete) {
    return (
      <EmptyState
        title="Add a wallet first"
        body="Identity verification is optional and lives here. Connect a wallet in the Wallets tab first."
        actionHref="/passport?tab=wallets"
        actionLabel="Add wallet"
      />
    );
  }

  const v = canonical?.verification;

  return (
    <>
      <section style={CARD}>
        <PassportStepPurpose title={PASSPORT_STEPS.verifyIdentity.title} purpose={PASSPORT_STEPS.verifyIdentity.purpose} />
        <div style={{ display: "grid", gap: "0.35rem", marginBottom: "0.85rem" }}>
          <Row label="Status" value={v?.label ?? "Ready to verify"} />
          {v?.issuer && <Row label="Issuer" value={v.issuer} />}
          {v?.verifiedAt && <Row label="Verified" value={new Date(v.verifiedAt).toLocaleDateString()} />}
          {v?.expiresAt && <Row label="Expires" value={new Date(v.expiresAt).toLocaleDateString()} />}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 0.85rem", lineHeight: 1.55 }}>
          Wallet proof is managed in{" "}
          <Link href="/passport?tab=wallets" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>Wallets</Link>
          {" "}in Wallets, not here.
        </p>
      </section>

      {identityUi !== "verified" && (
        <IdentityActions
          identityUi={identityUi}
          manualMode={manualMode}
          veriffConfigured={veriffConfigured}
          expanded={expanded}
          onExpand={onExpand}
          onDismiss={onDismiss}
          email={email}
          suiAddress={suiAddress}
          starting={starting}
          isRefreshing={isRefreshing}
          error={error}
          onStartIdCheck={onStartIdCheck}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}: </span>{value}
    </div>
  );
}

function IdentityActions(props: {
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
  const {
    identityUi, manualMode, veriffConfigured, expanded, onExpand, onDismiss,
    email, suiAddress, starting, isRefreshing, error, onStartIdCheck, onRefresh,
  } = props;

  if (identityUi === "under_review") {
    return (
      <section style={CARD}>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: AMBER, margin: "0 0 0.85rem" }}>In review. Your Passport stays active.</p>
        <Btn variant="secondary" size="sm" loading={isRefreshing} onClick={onRefresh}>Check status</Btn>
      </section>
    );
  }

  if (identityUi === "needs_action") {
    return (
      <section style={{ ...CARD, border: `1px solid ${RED}40` }}>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", margin: "0 0 0.85rem" }}>Verification needs action. Try again.</p>
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
        <Btn size="sm" onClick={onExpand}>Verify identity →</Btn>
        <Btn variant="ghost" size="sm" href="/passport?tab=profile" style={{ marginLeft: "0.5rem" }}>Not now</Btn>
      </section>
    );
  }

  return (
    <section style={CARD}>
      {manualMode ? (
        <DocumentUpload email={email} suiAddress={suiAddress} stampId="identity" color={ACCENT} onUploaded={onRefresh} />
      ) : veriffConfigured ? (
        <Btn size="lg" fullWidth loading={starting} onClick={onStartIdCheck}>Verify identity →</Btn>
      ) : (
        <DocumentUpload email={email} suiAddress={suiAddress} stampId="identity" color={ACCENT} onUploaded={onRefresh} />
      )}
      {error && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: RED, margin: "0.65rem 0 0" }}>{error}</p>}
      <div style={{ marginTop: "0.85rem" }}>
        <Btn variant="ghost" size="sm" onClick={onDismiss}>Not now</Btn>
      </div>
    </section>
  );
}

function AccessTab({ suiAddress, profileComplete }: { suiAddress: string | null; profileComplete: boolean }) {
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

  if (!profileComplete) {
    return (
      <EmptyState
        title="No access yet"
        body="Partner permissions appear here after you connect a wallet and approve a request."
        actionHref="/passport?tab=wallets"
        actionLabel="Add wallet"
      />
    );
  }

  return (
    <>
      <section style={CARD}>
        <PassportStepPurpose title={PASSPORT_STEPS.chooseShare.title} purpose={PASSPORT_STEPS.chooseShare.purpose} />
        <Btn size="sm" variant="secondary" loading={demoBusy} onClick={() => void startDemoRequest()}>
          Try demo partner request →
        </Btn>
        {demoError && <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: RED, margin: "0.45rem 0 0" }}>{demoError}</p>}
      </section>
      <PassportShareHistoryCard suiAddress={suiAddress} showTimeline />
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
