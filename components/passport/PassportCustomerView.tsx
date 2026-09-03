"use client";
// FILE: components/passport/PassportCustomerView.tsx
// Default Passport — status, one action, proof summary, activity.

import { useState } from "react";
import Link from "next/link";
import { ZkLoginSignIn } from "@/components/sui/ZkLoginSignIn";
import { Btn } from "@/components/redesign/ui";
import { signIntentMessage } from "@/lib/sui/intent/personalMessage";
import { getEphemeralSecretKey } from "@/lib/sui/zklogin/signingSession";
import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";
import type { IdentityStampStatus } from "@/lib/hooks/usePassportVerification";
import type { StoredCredential } from "@/lib/credentials/storage";
import type { PartnerFlowHandoffController } from "@/lib/passport/partnerFlowHandoff";
import { PartnerReturnCta } from "@/components/passport/PartnerReturnCta";
import { PassportRecentActivity } from "@/components/passport/PassportRecentActivity";
import { AbraxasIdentityCapture } from "@/components/passport/AbraxasIdentityCapture";
import {
  PASSPORT_CRYPTO_DISCLOSURE,
  PASSPORT_SECURE_ACCOUNT_EXPLAINER,
  PASSPORT_SECURE_ACCOUNT_LABEL,
  PASSPORT_ADVANCED_ROUTE,
} from "@/lib/passport/passportCustomerCopy";
import {
  buildPassportProofSummary,
  resolvePassportCustomerStatus,
} from "@/lib/passport/passportCustomerStatus";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";
import type { CapturePolicyContext } from "@/lib/idv/capturePolicyContext";

const FONT = ABRAXAS_FONT_SANS;
const CARD = {
  background: PUBLIC_SURFACE.cardBackground,
  border: PUBLIC_SURFACE.cardBorder,
  borderRadius: PUBLIC_SURFACE.cardRadius,
  padding: PUBLIC_SURFACE.cardPadding,
  marginBottom: "1rem",
} as const;

interface Props {
  walletDone: boolean;
  authLoading?: boolean;
  suiAddress: string | null;
  email: string;
  setup: PassportSetupState;
  identityStatus: IdentityStampStatus;
  credential: StoredCredential | null;
  via: string | null;
  starting: boolean;
  error: string | null;
  idvProvider: "veriff" | "manual";
  veriffConfigured: boolean;
  onStartIdCheck: () => void;
  onRefresh: () => void;
  onWalletBound?: () => void;
  handoff: PartnerFlowHandoffController;
  capturePolicy?: CapturePolicyContext;
}

export function PassportCustomerView({
  walletDone,
  authLoading = false,
  suiAddress,
  email,
  setup,
  identityStatus,
  credential,
  via,
  starting,
  error,
  idvProvider,
  veriffConfigured,
  onStartIdCheck,
  onRefresh,
  onWalletBound,
  handoff,
  capturePolicy,
}: Props) {
  const [bindLoading, setBindLoading] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);

  const hasCredential = Boolean(credential) && identityStatus === "earned";
  const status = resolvePassportCustomerStatus({
    walletDone,
    setup,
    identityStatus,
    hasCredential,
    idvProvider,
    via,
  });
  const proofItems = buildPassportProofSummary({
    walletBound: setup.walletBound,
    identityUi: status.identityUi,
  });

  async function bindWallet() {
    if (!suiAddress) return;
    setBindLoading(true);
    setBindError(null);
    try {
      const secret = getEphemeralSecretKey();
      if (!secret) throw new Error("Sign in again, then try securing your Passport.");

      const chRes = await fetch("/api/wallet/binding/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_address: suiAddress }),
      });
      const challenge = await chRes.json() as { challenge_id?: string; message?: string; error?: string };
      if (!chRes.ok || !challenge.challenge_id || !challenge.message) {
        throw new Error(challenge.error ?? "Could not start security confirmation. Try again.");
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
      if (!confirmRes.ok) throw new Error(result.error ?? "Security confirmation failed.");
      onWalletBound?.();
    } catch (e) {
      setBindError(e instanceof Error ? e.message : "Security confirmation failed.");
    } finally {
      setBindLoading(false);
    }
  }

  if (authLoading) {
    return (
      <section style={CARD} aria-live="polite">
        <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
          Loading your Passport…
        </p>
      </section>
    );
  }

  return (
    <div>
      <section style={CARD} aria-labelledby="passport-status-heading">
        <p style={{
          fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)",
          letterSpacing: "0.04em", textTransform: "uppercase", margin: "0 0 0.35rem",
        }}>
          Passport status
        </p>
        <h2 id="passport-status-heading" style={{
          fontFamily: FONT, fontSize: "1.1rem", fontWeight: 800, margin: "0 0 0.35rem", color: "var(--text-primary)",
        }}>
          {status.label}
        </h2>
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0 }}>
          {status.summary}
        </p>
      </section>

      {!walletDone && (
        <section style={CARD} aria-labelledby="passport-signin-heading">
          <h2 id="passport-signin-heading" style={{
            fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.75rem",
          }}>
            Sign in to continue
          </h2>
          <ZkLoginSignIn />
        </section>
      )}

      {walletDone && !setup.walletBound && (
        <section style={CARD} aria-labelledby="passport-secure-heading">
          <h2 id="passport-secure-heading" style={{
            fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem",
          }}>
            {PASSPORT_SECURE_ACCOUNT_LABEL}
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "0.84rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: "0 0 0.35rem",
          }}>
            {PASSPORT_SECURE_ACCOUNT_EXPLAINER}
          </p>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.55, color: "var(--text-muted)", margin: "0 0 1rem",
          }}>
            {PASSPORT_CRYPTO_DISCLOSURE}
          </p>
          <Btn size="lg" fullWidth loading={bindLoading} onClick={() => void bindWallet()}>
            {bindLoading ? "Waiting for confirmation…" : "Confirm securely →"}
          </Btn>
          {bindError && (
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#EF4444", margin: "0.65rem 0 0" }}>{bindError}</p>
          )}
        </section>
      )}

      {walletDone && setup.walletBound && status.identityUi === "needs_action" && (
        <section style={CARD}>
          {idvProvider === "manual" ? (
            <AbraxasIdentityCapture email={email} suiAddress={suiAddress} onSubmitted={onRefresh} capturePolicy={capturePolicy} />
          ) : (
            <Btn size="lg" fullWidth loading={starting} onClick={onStartIdCheck}>
              Add verified information →
            </Btn>
          )}
          {error && <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#EF4444", margin: "0.65rem 0 0" }}>{error}</p>}
        </section>
      )}

      {walletDone && setup.walletBound && status.identityUi === "not_started" && handoff.isPartnerFlowContext && !setup.identityComplete && (
        <section style={CARD}>
          {idvProvider === "manual" ? (
            <AbraxasIdentityCapture email={email} suiAddress={suiAddress} onSubmitted={onRefresh} capturePolicy={capturePolicy} />
          ) : veriffConfigured ? (
            <Btn size="lg" fullWidth loading={starting} onClick={onStartIdCheck}>
              Add verified information →
            </Btn>
          ) : null}
        </section>
      )}

      {handoff.isPartnerFlowContext && setup.walletBound && (
        <div style={{ marginBottom: "1rem" }}>
          <PartnerReturnCta handoff={handoff} label="Return to service →" />
        </div>
      )}

      {walletDone && (
        <>
          <section style={CARD} aria-labelledby="passport-proof-heading">
            <h2 id="passport-proof-heading" style={{
              fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.65rem",
            }}>
              Your reusable proof
            </h2>
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {proofItems.map((item) => (
                <li key={item} style={{
                  fontFamily: FONT, fontSize: "0.84rem", lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: "0.25rem",
                }}>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <PassportRecentActivity
            suiAddress={suiAddress}
            walletBound={setup.walletBound}
            identityUi={status.identityUi}
          />
        </>
      )}

      <p style={{ fontFamily: FONT, fontSize: "0.8rem", margin: "0 0 2rem" }}>
        <Link href={PASSPORT_ADVANCED_ROUTE} style={{ color: "var(--text-muted)", fontWeight: 600, textDecoration: "none" }}>
          Advanced details →
        </Link>
      </p>
    </div>
  );
}
