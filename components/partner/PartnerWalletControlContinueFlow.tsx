"use client";
// FILE: components/partner/PartnerWalletControlContinueFlow.tsx
// Wallet-native wallet_control continuation — connect, prove control, consent, partner result.

import { useCallback, useEffect, useState } from "react";
import { WalletVerifyControlPanel } from "@/components/wallet/WalletVerifyControlPanel";
import { ConsentCeremony } from "@/components/passport/ConsentCeremony";
import { PartnerFlowReturnHandler } from "@/components/partner/PartnerFlowReturnHandler";
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
  const [methodQualified, setMethodQualified] = useState(false);
  const [qualifyBusy, setQualifyBusy] = useState(false);
  const [consentDismissed, setConsentDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMethodQualification = useCallback(async (): Promise<boolean> => {
    if (!verifyRequestId) return false;
    try {
      const res = await fetch(
        `/api/v1/partner-verify/method-qualification?verify_request=${encodeURIComponent(verifyRequestId)}`,
        { credentials: "include" },
      );
      const data = await res.json() as { method_qualified?: boolean };
      const qualified = res.ok && data.method_qualified === true;
      setMethodQualified(qualified);
      return qualified;
    } catch {
      setMethodQualified(false);
      return false;
    }
  }, [verifyRequestId]);

  useEffect(() => {
    void refreshMethodQualification();
  }, [refreshMethodQualification]);

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

  async function afterWalletVerified() {
    setQualifyBusy(true);
    setError(null);
    try {
      const sessionReady = await ensureBrowserSessionReadyForWalletAuth();
      if (!sessionReady.ok) {
        setError(holderSafeClientMessage(sessionReady.error));
        return;
      }
      onSessionEstablished();
      if (await postWalletControlQualification()) {
        setMethodQualified(true);
        return;
      }
      if (await refreshMethodQualification()) return;
      setError(describeHolderAuthErrorCode("method_not_qualified"));
    } catch {
      setError(holderSafeClientMessage());
    } finally {
      setQualifyBusy(false);
    }
  }

  const showConsent = methodQualified && !consentDismissed && !handoff.ready;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <PartnerFlowReturnHandler handoff={handoff} />

      {!methodQualified ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <WalletVerifyControlPanel onSuccess={() => void afterWalletVerified()} />
          {qualifyBusy ? (
            <p role="status" style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-secondary)" }}>
              Confirming wallet control for {partnerName}…
            </p>
          ) : null}
          {error ? (
            <p role="alert" style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.84rem" }}>
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <p role="status" style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.6 }}>
          Wallet control confirmed. Review partner authorization below.
        </p>
      )}

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

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
        Wallet approval is message-only — no token transfer or spending permission. Sign-in to Abraxas Passport with Google remains optional for other policies.
      </p>
    </div>
  );
}
