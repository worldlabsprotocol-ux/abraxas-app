"use client";
// FILE: app/account/page.tsx
// Read-only account hub. verification status, quick actions, passport progress.

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SuiAuthProvider, useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { Spinner } from "@/components/ui/Spinner";
import { fetchTrustStatus, passportQueryKeys } from "@/lib/api/passport";
import { computePassportCompletion } from "@/lib/passportCompletion";
import type { IdentityStampStatus, CredentialVerifyState } from "@/lib/hooks/usePassportVerification";
import { AddToAppleWallet } from "@/components/passport/AddToAppleWallet";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

function AccountInner() {
  const { suiAddress, session, isAuthenticated, signInWithGoogle } = useSuiAuth();
  const email = session?.email;

  const { data: trust, isLoading } = useQuery({
    queryKey: passportQueryKeys.trust(suiAddress ?? ""),
    queryFn: () => fetchTrustStatus(suiAddress!),
    enabled: Boolean(suiAddress),
  });

  if (!isAuthenticated || !suiAddress) {
    return (
      <RedesignPage maxWidth={720}>
        <PageHeader
          eyebrow="Account"
          title="Your Abraxas account"
          subtitle="Sign in with Google to see verification status, bookings, and passport progress."
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

  const completion = computePassportCompletion({
    walletDone: true,
    identityStatus,
    credentialActive: trust?.credential.active ?? false,
    verifyState,
    onChain: trust?.on_chain
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
    intentProofs: trust?.intent.proofs_count ?? 0,
    stamps: {
      identity: identityStatus === "earned" ? "earned" : identityStatus === "pending" ? "in_progress" : "not_started",
      business: "not_started",
      asset_owner: "not_started",
    },
  });

  return (
    <RedesignPage maxWidth={720}>
      <PageHeader
        eyebrow="Account"
        title="My verified assets"
        subtitle="Your passport, booking activity, and what you can do next. one place."
      />

      {isLoading ? (
        <ContentCard>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Spinner /> <span style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)" }}>Loading account…</span>
          </div>
        </ContentCard>
      ) : (
        <>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem", marginBottom: "1rem",
          }}>
            <Stat label="Completion" value={`${completion.percent}%`} accent />
            <Stat label="Identity" value={trust?.identity.status ?? ", "} />
            <Stat label="Credential" value={trust?.credential.active ? "Active" : "None"} />
            <Stat label="Ready to transact" value={trust?.ready_to_transact ? "Yes" : "Pending"} />
          </div>

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

          <div style={{ marginBottom: "1rem" }}>
            <AddToAppleWallet
              suiAddress={suiAddress}
              verificationLevel={trust?.enhanced_trust ? "Enhanced trust" : "Basic"}
            />
          </div>

          <ContentCard title="Quick actions">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <Btn href="/passport" size="sm">Passport dashboard</Btn>
              <Btn href="/verify" variant="secondary" size="sm">Verify records</Btn>
              <Btn href="/flagship" variant="secondary" size="sm">Book Cielo</Btn>
              <Btn href="/verify" variant="ghost" size="sm">Share credential</Btn>
            </div>
          </ContentCard>

          <ContentCard title="On-chain passport">
            <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              {trust?.on_chain.provisioned
                ? <>Provisioned · object {trust.on_chain.object_id?.slice(0, 12)}…</>
                : "Not yet provisioned on Sui devnet."}
              {" "}
              <Link href="/passport" style={{ color: ACCENT, fontWeight: 600 }}>Manage on passport →</Link>
            </p>
          </ContentCard>
        </>
      )}
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
  return (
    <SuiAuthProvider>
      <AccountInner />
    </SuiAuthProvider>
  );
}
