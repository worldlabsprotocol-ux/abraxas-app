"use client";
// FILE: components/partner/PartnerWalletControlContinueFlow.tsx
// Wallet-native wallet_control continuation — connect, prove control, consent, partner result.

import { useCallback, useEffect, useState } from "react";
import { WalletVerifyControlPanel } from "@/components/wallet/WalletVerifyControlPanel";
import { WalletControlPartnerConsent } from "@/components/partner/WalletControlPartnerConsent";
import { PartnerFlowReturnHandler } from "@/components/partner/PartnerFlowReturnHandler";
import {
  ensureBrowserSessionReadyForWalletAuth,
} from "@/lib/auth/ensureBrowserSession";
import type { PartnerFlowHandoffController } from "@/lib/passport/partnerFlowHandoff";
import { HolderDecisionComplete } from "@/components/protocol/HolderDecisionComplete";
import { HolderRecoveryCard } from "@/components/partner/HolderRecoveryCard";
import {
  holderSafeClientMessage,
  resolveHolderRecovery,
} from "@/lib/partner/holderExperience";
import { describeHolderAuthErrorCode } from "@/lib/auth/holderAuthErrorCopy";
import { isNavigablePartnerHandoffRedirectUrl } from "@/lib/partner/partnerClientNavigation";
import { HolderVerificationStepNav } from "@/components/partner/HolderVerificationStepNav";
import { resolveWalletControlPresentationStage } from "@/lib/partner/holderExperience/holderPresentationStage";
import { HolderVerificationChrome } from "@/components/partner/HolderVerificationChrome";
import { HolderWalletControlReviewPanel } from "@/components/partner/HolderWalletControlReviewPanel";
import { ProtocolLoadingState } from "@/components/protocol/ProtocolLoadingState";

export function PartnerWalletControlContinueFlow({
  partnerId,
  partnerName,
  policyId,
  verifyRequestId,
  returnUrl,
  returnLabel,
  handoff,
  onSessionEstablished,
  onMethodQualifiedChange,
  environment = "sandbox",
}: {
  partnerId: string;
  partnerName: string;
  policyId: string;
  verifyRequestId: string;
  returnUrl: string;
  returnLabel: string;
  handoff: PartnerFlowHandoffController;
  onSessionEstablished: () => void;
  onMethodQualifiedChange?: (qualified: boolean) => void;
  environment?: "sandbox" | "production";
}) {
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);
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
      onMethodQualifiedChange?.(qualified);
      return qualified;
    } catch {
      setMethodQualified(false);
      return false;
    }
  }, [verifyRequestId, onMethodQualifiedChange]);

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
        onMethodQualifiedChange?.(true);
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

  const showConsent = methodQualified && !consentDismissed && handoff.phase !== "completed";
  const flowComplete = handoff.phase === "completed" && Boolean(handoff.receiptId);
  const returnEnabled = handoff.redirectUrl
    ? isNavigablePartnerHandoffRedirectUrl(handoff.redirectUrl)
    : false;

  const activeStage = resolveWalletControlPresentationStage({
    reviewAcknowledged,
    methodQualified,
    showConsent,
    flowComplete,
  });

  const approveStage = activeStage === "authorization" || activeStage === "decision";

  return (
    <div className="abx-holder-verification-focused" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <PartnerFlowReturnHandler handoff={handoff} autoCompleteWhenReady={false} />
      <HolderVerificationChrome environment={environment} />
      <HolderVerificationStepNav activeStage={activeStage} />

      <div className="abx-holder-verification-focused__stage" aria-live="polite">
        {activeStage === "review" && !flowComplete ? (
          <HolderWalletControlReviewPanel
            partnerName={partnerName}
            environment={environment}
            onContinue={() => setReviewAcknowledged(true)}
          />
        ) : null}

        {activeStage === "wallet" && !flowComplete ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>Verify wallet</h2>
            <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
              Connect your wallet and sign the challenge. This proves control only — not approval to share with {partnerName}.
            </p>
            <WalletVerifyControlPanel onSuccess={() => void afterWalletVerified()} />
            {qualifyBusy ? (
              <p role="status" style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                Confirming wallet control…
              </p>
            ) : null}
            {error ? (
              <p role="alert" style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.84rem" }}>
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {approveStage && !flowComplete ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>Approve sharing</h2>
            {activeStage === "decision" && showConsent ? (
              <WalletControlPartnerConsent
                partnerName={partnerName}
                partnerId={partnerId}
                policyId={policyId}
                verifyRequestId={verifyRequestId}
                handoff={handoff}
                onDeclined={() => setConsentDismissed(true)}
              />
            ) : consentDismissed ? (
              <p role="status" style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.55 }}>
                You declined sharing. Approve above when you want to continue — your wallet signature alone does not share anything.
              </p>
            ) : (
              <ProtocolLoadingState kind="preparing_request" detail={partnerName} />
            )}
          </div>
        ) : null}

        {activeStage === "outcome" && flowComplete ? (
          <HolderDecisionComplete
            receiptId={handoff.receiptId!}
            partnerName={partnerName}
            policyId={policyId}
            returnLabel={returnLabel}
            onReturn={() => handoff.navigateToPartner()}
            returnLoading={handoff.inFlight}
            surface="wallet_control"
            showPassportNotice={false}
            returnEnabled={returnEnabled}
          />
        ) : null}

        {handoff.phase === "failed" ? (
          <HolderRecoveryCard recovery={resolveHolderRecovery("invalid_binding", partnerName, null)} />
        ) : null}
      </div>
    </div>
  );
}
