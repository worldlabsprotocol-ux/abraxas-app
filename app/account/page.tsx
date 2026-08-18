"use client";
// FILE: app/account/page.tsx
// Read-only account hub — wallet, trust summary, shortcuts to Passport tools.

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { fetchTrustStatus, passportQueryKeys } from "@/lib/api/passport";
import { computePassportCompletion } from "@/lib/passportCompletion";
import type { IdentityStampStatus, CredentialVerifyState } from "@/lib/hooks/usePassportVerification";
import { AddToAppleWallet } from "@/components/passport/AddToAppleWallet";
import {
  HOLDER_ACCOUNT_EYEBROW,
  HOLDER_ACCOUNT_ERROR_BODY,
  HOLDER_ACCOUNT_ERROR_TITLE,
  HOLDER_ACCOUNT_SIGNED_OUT_SUBHEAD,
  HOLDER_ACCOUNT_SIGNED_OUT_TITLE,
  HOLDER_ACCOUNT_SUBHEAD,
  HOLDER_ACCOUNT_TITLE,
  HOLDER_VERIFY_CREDENTIAL_PATH,
  HOLDER_VERIFY_DEFAULT_PATH,
} from "@/lib/integrate/partnerJourney";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

function formatIdentityStatus(status: string | undefined): string {
  if (!status) return "Not started";
  return status.replace(/_/g, " ");
}

function AccountInner() {
  const { suiAddress, session, isAuthenticated, signInWithGoogle } = useSuiAuth();
  const email = session?.email;

  const {
    data: trust,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: passportQueryKeys.trust(suiAddress ?? ""),
    queryFn: () => fetchTrustStatus(suiAddress!),
    enabled: Boolean(suiAddress),
  });

  if (!isAuthenticated || !suiAddress) {
    return (
      <RedesignPage maxWidth={720}>
        <PageHeader
          eyebrow={HOLDER_ACCOUNT_EYEBROW}
          title={HOLDER_ACCOUNT_SIGNED_OUT_TITLE}
          subtitle={HOLDER_ACCOUNT_SIGNED_OUT_SUBHEAD}
        />
        <ContentCard>
          <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1rem" }}>
            No wallet to manage. zkLogin creates your Sui address from Google OAuth.
          </p>
          <Btn onClick={() => signInWithGoogle()} size="lg">Sign in with Google →</Btn>
        </ContentCard>
      </RedesignPage>
    );
  }

  const identityStatus: IdentityStampStatus =
    trust?.identity.status === "approved" || trust?.identity.status === "earned" ? "earned"
    : trust?.identity.status === "pending" ? "pending"
    : "not_started";

  const verifyState: CredentialVerifyState =
    trust?.credential.active ? "valid" : "idle";

  const completion = trust
    ? computePassportCompletion({
        walletDone: true,
        identityStatus,
        credentialActive: trust.credential.active ?? false,
        verifyState,
        onChain: trust.on_chain
          ? {
              provisioned: trust.on_chain.provisioned,
              object_id: trust.on_chain.object_id,
              stamp_bitmask: 0,
              stamp_ids: [],
              stamps_complete: trust.on_chain.stamps_complete,
              issuer_configured: true,
              explorer_object: null,
              create_tx_digest: null,
              stamps_tx_digest: null,
            }
          : null,
        intentProofs: trust.intent.proofs_count ?? 0,
        stamps: {
          identity: identityStatus === "earned" ? "earned" : identityStatus === "pending" ? "in_progress" : "not_started",
          business: "not_started",
          asset_owner: "not_started",
        },
      })
    : null;

  return (
    <RedesignPage maxWidth={720}>
      <PageHeader
        eyebrow={HOLDER_ACCOUNT_EYEBROW}
        title={HOLDER_ACCOUNT_TITLE}
        subtitle={HOLDER_ACCOUNT_SUBHEAD}
      />

      <ContentCard title="Wallet">
        <code style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-secondary)", wordBreak: "break-all" }}>
          {suiAddress}
        </code>
        {email && (
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", margin: "0.5rem 0 0" }}>
            {email}
          </p>
        )}
      </ContentCard>

      {isLoading ? (
        <ContentCard>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Spinner />
            <span style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Loading Passport status…
            </span>
          </div>
        </ContentCard>
      ) : isError ? (
        <div style={{ marginBottom: "1rem" }}>
          <StatusBanner
            tone="error"
            title={HOLDER_ACCOUNT_ERROR_TITLE}
            action={(
              <Btn size="sm" variant="secondary" loading={isFetching} onClick={() => void refetch()}>
                Try again
              </Btn>
            )}
          >
            {HOLDER_ACCOUNT_ERROR_BODY}
          </StatusBanner>
        </div>
      ) : trust ? (
        <>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem", marginBottom: "1rem",
          }}>
            <Stat label="Setup progress" value={`${completion?.percent ?? 0}%`} accent />
            <Stat label="Identity review" value={formatIdentityStatus(trust.identity.status)} />
            <Stat label="Credential" value={trust.credential.active ? "Active" : "None"} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <AddToAppleWallet
              suiAddress={suiAddress}
              verificationLevel={trust.enhanced_trust ? "Enhanced trust" : "Basic"}
            />
          </div>

          <ContentCard title="Available actions">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <Btn href="/passport" size="sm">Open Passport →</Btn>
              <Btn href={HOLDER_VERIFY_DEFAULT_PATH} variant="secondary" size="sm">
                My records &amp; credentials
              </Btn>
              <Btn href={HOLDER_VERIFY_CREDENTIAL_PATH} variant="secondary" size="sm">
                Test credential JWT
              </Btn>
              <Btn href="/flagship" variant="ghost" size="sm">Book Cielo</Btn>
            </div>
          </ContentCard>

          <ContentCard title="On-chain passport (devnet)">
            <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              {trust.on_chain.provisioned
                ? <>Provisioned · object {trust.on_chain.object_id?.slice(0, 12)}…</>
                : "Not yet provisioned on Sui devnet."}
              {" "}
              <Link href="/passport" style={{ color: ACCENT, fontWeight: 600 }}>Manage on Passport →</Link>
            </p>
          </ContentCard>
        </>
      ) : null}
    </RedesignPage>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      padding: "1rem", borderRadius: 14,
      background: "var(--surface)", border: "1px solid var(--border)",
    }}>
      <div style={{
        fontFamily: FONT, fontSize: "1.25rem", fontWeight: 800,
        color: accent ? ACCENT : "var(--text-primary)",
      }}>
        {value}
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function AccountPage() {
  return <AccountInner />;
}
