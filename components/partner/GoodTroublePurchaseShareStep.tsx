"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { consentVerificationRequest } from "@/lib/api/passport";
import { holderSafeClientMessage } from "@/lib/partner/holderExperience";
import {
  GOOD_TROUBLE_PURCHASE_SHARE_ACTION,
  GOOD_TROUBLE_PURCHASE_SHARE_TITLE,
} from "@/lib/partner/goodTroublePurchaseFlow";
import { HolderDecisionComplete } from "@/components/protocol/HolderDecisionComplete";
import { resolvePartnerDisplayName, resolvePartnerReturnLabel } from "@/lib/partner/partnerVerifyDisplay";
import {
  navigateAgeEligibilityPurchaseReturn,
  postAgeEligibilityPurchaseReturn,
} from "@/lib/passport/ageEligibilityPurchaseReturn";

export function GoodTroublePurchaseShareStep({
  verifyRequestId,
  partnerId,
  policyId,
  returnUrl,
}: {
  verifyRequestId: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
}) {
  const [busy, setBusy] = useState(false);
  const [returnBusy, setReturnBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const partnerName = resolvePartnerDisplayName(partnerId);
  const returnLabel = resolvePartnerReturnLabel(partnerId);

  useEffect(() => {
    setError(null);
  }, [verifyRequestId]);

  async function shareResult() {
    setBusy(true);
    setError(null);
    try {
      const data = await consentVerificationRequest(verifyRequestId);
      if (data.receipt_id) {
        setReceiptId(data.receipt_id);
        return;
      }
      setError("Your 21+ result could not be shared. Try again.");
    } catch {
      setError(holderSafeClientMessage("Could not share your 21+ result. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const returnToPartner = useCallback(async () => {
    if (!receiptId) return;
    setReturnBusy(true);
    setReturnError(null);
    const result = await postAgeEligibilityPurchaseReturn({
      verificationRequestId: verifyRequestId,
      receiptId,
      returnUrl,
    });
    if (result.ok) {
      navigateAgeEligibilityPurchaseReturn(result.redirectUrl);
      return;
    }
    setReturnError(holderSafeClientMessage(result.message));
    setReturnBusy(false);
  }, [receiptId, returnUrl, verifyRequestId]);

  if (receiptId && returnUrl) {
    return (
      <>
        <HolderDecisionComplete
          receiptId={receiptId}
          partnerName={partnerName}
          policyId={policyId}
          returnLabel={returnLabel}
          onReturn={() => void returnToPartner()}
          returnLoading={returnBusy}
          showPassportNotice={false}
        />
        {returnError ? (
          <p role="alert" style={{ margin: "0.75rem 0 0", color: "var(--text-secondary)" }}>
            {returnError}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>{GOOD_TROUBLE_PURCHASE_SHARE_TITLE}</p>
      <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.6 }}>
        Good Trouble will receive:
      </p>
      <div style={{
        padding: "0.85rem 1rem",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface-inset)",
      }}>
        <p style={{ margin: "0 0 0.35rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>21+ eligibility</p>
        <p style={{ margin: 0, fontWeight: 700 }}>Yes</p>
      </div>
      <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.55, color: "var(--text-muted)" }}>
        Not shared: birth date, identity document
      </p>
      <Btn disabled={busy} onClick={() => void shareResult()}>
        {busy ? "Sharing…" : GOOD_TROUBLE_PURCHASE_SHARE_ACTION}
      </Btn>
      {error && (
        <p role="alert" style={{ margin: 0, color: "var(--text-secondary)" }}>{error}</p>
      )}
    </div>
  );
}
