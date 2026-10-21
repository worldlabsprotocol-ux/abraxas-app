"use client";
// FILE: components/partner/PartnerWalletControlContinueFlow.tsx
// Wallet-native wallet_control continuation — connect, prove control, consent, partner result.

import { useCallback, useEffect, useState } from "react";
import { HolderWalletAuthPanel } from "@/components/passport/HolderWalletAuthPanel";
import { ConsentCeremony } from "@/components/passport/ConsentCeremony";
import { PartnerFlowReturnHandler } from "@/components/partner/PartnerFlowReturnHandler";
import { Btn } from "@/components/redesign/ui";
import { PASSPORT_WALLET_ACTIONS } from "@/lib/auth/passportWalletAuth/contract";
import {
  ensureBrowserSessionReadyForWalletAuth,
  probeBrowserSessionDetails,
} from "@/lib/auth/ensureBrowserSession";
import type { PartnerFlowHandoffController } from "@/lib/passport/partnerFlowHandoff";
import { HolderDecisionComplete } from "@/components/protocol/HolderDecisionComplete";
import { HolderRecoveryCard } from "@/components/partner/HolderRecoveryCard";
import {
  holderSafeClientMessage,
  resolveHolderRecovery,
} from "@/lib/partner/holderExperience";
import { describeHolderAuthErrorCode } from "@/lib/auth/holderAuthErrorCopy";
import { bindEvmWalletToPassport } from "@/lib/walletAuthority/client/bindEvmWallet";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function PartnerWalletControlContinueFlow({
  partnerId,
  partnerName,
  policyId,
  verifyRequestId,
  returnUrl,
  returnLabel,
  handoff,
  onSessionEstablished,
}: {
  partnerId: string;
  partnerName: string;
  policyId: string;
  verifyRequestId: string;
  returnUrl: string;
  returnLabel: string;
  handoff: PartnerFlowHandoffController;
  onSessionEstablished: () => void;
}) {
  const [walletSessionReady, setWalletSessionReady] = useState(false);
  const [methodQualified, setMethodQualified] = useState(false);
  const [qualifyBusy, setQualifyBusy] = useState(false);
  const [consentDismissed, setConsentDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncWalletSession = useCallback(async () => {
    const probe = await probeBrowserSessionDetails();
    if (probe.ok && (probe.holderSubjectId || probe.authMethod === "solana_wallet" || probe.authMethod === "evm_wallet" || probe.authMethod === "wallet")) {
      setWalletSessionReady(true);
      return true;
    }
    setWalletSessionReady(false);
    return false;
  }, []);

  useEffect(() => {
    void syncWalletSession();
    const onSession = () => {
      void syncWalletSession();
    };
    window.addEventListener("abraxas:holder-session", onSession);
    return () => window.removeEventListener("abraxas:holder-session", onSession);
  }, [syncWalletSession]);

  useEffect(() => {
    if (!verifyRequestId || !walletSessionReady) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/v1/partner-verify/method-qualification?verify_request=${encodeURIComponent(verifyRequestId)}`,
          { credentials: "include" },
        );
        const data = await res.json() as { method_qualified?: boolean };
        if (!cancelled) setMethodQualified(res.ok && data.method_qualified === true);
      } catch {
        if (!cancelled) setMethodQualified(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [verifyRequestId, walletSessionReady]);

  async function postWalletControlQualification(): Promise<boolean> {
    const res = await fetch("/api/v1/partner-verify/method-qualification", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        verify_request: verifyRequestId,
        method_id: "wallet_control",
        partner_id: partnerId,
        policy_id: policyId,
      }),
    });
    const data = await res.json() as { ok?: boolean; method_qualified?: boolean; code?: string };
    return res.ok && data.ok === true && data.method_qualified === true;
  }

  async function qualifyWalletControl() {
    setQualifyBusy(true);
    setError(null);
    try {
      const sessionReady = await ensureBrowserSessionReadyForWalletAuth();
      if (!sessionReady.ok) {
        setError(holderSafeClientMessage(sessionReady.error));
        return;
      }
      if (await postWalletControlQualification()) {
        setMethodQualified(true);
        return;
      }
      try {
        await bindEvmWalletToPassport();
      } catch (bindError) {
        const message = bindError instanceof Error ? bindError.message : "wallet_control_not_ready";
        setError(describeHolderAuthErrorCode(message));
        setMethodQualified(false);
        return;
      }
      if (await postWalletControlQualification()) {
        setMethodQualified(true);
        return;
      }
      setError(describeHolderAuthErrorCode("method_not_qualified"));
      setMethodQualified(false);
    } catch {
      setError(holderSafeClientMessage());
    } finally {
      setQualifyBusy(false);
    }
  }

  const showConsent = methodQualified && !consentDismissed && !handoff.ready;

  if (!walletSessionReady) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: 12,
            padding: "1rem 1.1rem",
            background: "var(--surface-raised)",
          }}
        >
          <p style={{ margin: "0 0 0.35rem", fontWeight: 700, fontSize: "0.95rem" }}>
            Connect wallet to continue
          </p>
          <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
            Connect a supported wallet and sign a fresh control proof for this request. No Google account or email is required for wallet control.
          </p>
        </div>
        <HolderWalletAuthPanel
          intendedAction={PASSPORT_WALLET_ACTIONS.partnerVerify}
          onSuccess={() => {
            void (async () => {
              await ensureBrowserSessionReadyForWalletAuth();
              await syncWalletSession();
              onSessionEstablished();
            })();
          }}
        />
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
          Wallet approval is message-only — no token transfer or spending permission. Sign-in to Abraxas Passport with Google remains optional for other policies.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <PartnerFlowReturnHandler handoff={handoff} />

      {!methodQualified ? (
        <div>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Review wallet verification, then confirm wallet control for {partnerName}. If you already proved control in Passport, Abraxas will reuse fresh binding evidence when eligible.
          </p>
          <Btn disabled={qualifyBusy} onClick={() => void qualifyWalletControl()}>
            {qualifyBusy ? "Checking wallet control…" : "Sign to verify wallet control"}
          </Btn>
          {error ? (
            <p role="alert" style={{ marginTop: "0.75rem", color: "var(--text-secondary)", fontSize: "0.84rem" }}>
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {showConsent && (
        <ConsentCeremony
          requestId={verifyRequestId}
          identityComplete
          onDismiss={() => setConsentDismissed(true)}
        />
      )}

      {methodQualified && consentDismissed && !handoff.ready && (
        <p role="status" style={{ fontSize: "0.86rem" }}>Preparing partner result…</p>
      )}

      {handoff.phase === "completed" && handoff.receiptId && returnUrl ? (
        <HolderDecisionComplete
          receiptId={handoff.receiptId}
          partnerName={partnerName}
          policyId={policyId}
          returnLabel={returnLabel}
          onReturn={() => handoff.navigateToPartner()}
          returnLoading={handoff.inFlight}
        />
      ) : null}

      {handoff.phase === "failed" ? (
        <HolderRecoveryCard recovery={resolveHolderRecovery("invalid_binding", partnerName, null)} />
      ) : null}
    </div>
  );
}
