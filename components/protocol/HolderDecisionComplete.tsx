"use client";
// FILE: components/protocol/HolderDecisionComplete.tsx
// Holder success surface — partner outcome, privacy boundary, optional return action.

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionDuration } from "@/lib/design/abraxasMotion";
import { buildHolderRequestPresentation } from "@/lib/product/holderRequestPresentation";
import { PrivacyDisclosureCard } from "@/components/product/PrivacyDisclosureCard";
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
  const [showDetails, setShowDetails] = useState(false);
  const reduceMotion = useReducedMotion();
  const copy = buildHolderRequestPresentation(partnerName, policyId);
  const duration = reduceMotion ? 0 : abxMotionDuration("protocol") / 1000;

  return (
    <section
      className="abx-holder-decision-complete"
      aria-labelledby="holder-decision-complete-heading"
    >
      <motion.header
        className="abx-holder-decision-complete__header"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="abx-holder-decision-complete__eyebrow" style={{ fontFamily: ABX_FONT_SANS }}>
          Verification complete
        </p>
        <h2 id="holder-decision-complete-heading" className="abx-holder-decision-complete__title">
          {copy.completionHeadline}
        </h2>
        <p className="abx-holder-decision-complete__subtitle" style={{ fontFamily: ABX_FONT_SANS }}>
          Only the approved result was shared. Sensitive evidence stayed inside Abraxas.
        </p>
      </motion.header>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration, delay: reduceMotion ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
      <PrivacyDisclosureCard
        compact
        requester={partnerName}
        requestReason={copy.requestReason}
        requested={copy.requested}
        shared={copy.sharedResult}
        withheld={copy.withheld}
      />
      </motion.div>

      {onReturn ? (
        <div className="abx-holder-decision-complete__actions">
          <Btn disabled={returnLoading} onClick={onReturn}>
            {returnLoading ? "Returning…" : returnLabel}
          </Btn>
        </div>
      ) : null}

      {showPassportNotice ? (
        <p className="abx-holder-decision-complete__reuse" style={{ fontFamily: ABX_FONT_SANS }}>
          Your Passport supported this request. Existing verified evidence may satisfy eligible future requests when consent, freshness, and policy rules allow.
        </p>
      ) : null}

      <details
        open={showDetails}
        onToggle={(event) => setShowDetails((event.target as HTMLDetailsElement).open)}
        style={{ marginTop: "0.35rem" }}
      >
        <summary
          style={{
            fontFamily: ABX_FONT_SANS,
            fontSize: "0.74rem",
            fontWeight: 700,
            color: "var(--accent)",
            cursor: "pointer",
          }}
        >
          Verification details
        </summary>
        <div className="abx-holder-decision-complete__receipt" style={{ marginTop: "0.75rem" }}>
          <LiveDecisionReceiptCard receiptId={receiptId} partnerName={partnerName} />
        </div>
      </details>
    </section>
  );
}
