"use client";
// FILE: components/protocol/HolderDecisionComplete.tsx
// Holder success surface — privacy boundary + live decision receipt + return action.

import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { buildPolicyPresentationFromPolicyId } from "@/lib/partner/launchpad/policyPresentation";
import { normalizeProtectedFields } from "@/lib/protocol/decisionReceiptDisplay";
import { PrivacyBoundary, PrivacyBoundaryLegend } from "@/components/protocol/PrivacyBoundary";
import { LiveDecisionReceiptCard } from "@/components/protocol/LiveDecisionReceiptCard";
import { Btn } from "@/components/redesign/ui";

export interface HolderDecisionCompleteProps {
  receiptId: string;
  partnerName: string;
  policyId: string;
  returnLabel?: string;
  onReturn?: () => void;
  returnLoading?: boolean;
  showPassportNotice?: boolean;
}

export function HolderDecisionComplete({
  receiptId,
  partnerName,
  policyId,
  returnLabel = "Return to partner",
  onReturn,
  returnLoading = false,
  showPassportNotice = true,
}: HolderDecisionCompleteProps) {
  const presentation = buildPolicyPresentationFromPolicyId(policyId);
  const protectedFields = normalizeProtectedFields(policyId);
  const sharedLabel = presentation?.shared_label ?? "Eligibility result";
  const disclosedResult = presentation?.disclosed_result;

  return (
    <section
      className="abx-holder-decision-complete"
      aria-labelledby="holder-decision-complete-heading"
    >
      <header className="abx-holder-decision-complete__header">
        <p className="abx-holder-decision-complete__eyebrow" style={{ fontFamily: ABX_FONT_SANS }}>
          Verification complete
        </p>
        <h2 id="holder-decision-complete-heading" className="abx-holder-decision-complete__title">
          {sharedLabel}
        </h2>
        <p className="abx-holder-decision-complete__subtitle" style={{ fontFamily: ABX_FONT_SANS }}>
          Requested by {partnerName}. Only the approved result was shared.
        </p>
      </header>

      <PrivacyBoundary
        protectedItems={protectedFields}
        disclosedLabel={sharedLabel}
        disclosedResult={disclosedResult}
        signalActive
        compact
      />
      <PrivacyBoundaryLegend>
        Your Passport supported this request. Sensitive evidence stayed inside Abraxas.
      </PrivacyBoundaryLegend>

      <div className="abx-holder-decision-complete__receipt">
        <LiveDecisionReceiptCard receiptId={receiptId} partnerName={partnerName} />
      </div>

      {showPassportNotice && presentation?.reuse_notice ? (
        <p className="abx-holder-decision-complete__reuse" style={{ fontFamily: ABX_FONT_SANS }}>
          {presentation.reuse_notice}
        </p>
      ) : null}

      {onReturn ? (
        <div className="abx-holder-decision-complete__actions">
          <Btn disabled={returnLoading} onClick={onReturn}>
            {returnLoading ? "Returning…" : returnLabel}
          </Btn>
        </div>
      ) : null}
    </section>
  );
}
