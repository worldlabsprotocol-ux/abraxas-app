"use client";
// FILE: components/protocol/HolderDecisionComplete.tsx
// Holder success surface — partner outcome, privacy boundary, optional return action.

import { useState } from "react";
import Link from "next/link";
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
  /** Wallet-control partner flows use concise completion copy without repeating the opening request. */
  surface?: "default" | "wallet_control";
  /** When false, hide primary return CTA (e.g. redirect target not navigable). */
  returnEnabled?: boolean;
}

export function HolderDecisionComplete({
  receiptId,
  partnerName,
  policyId,
  returnLabel = "Return to partner",
  onReturn,
  returnLoading = false,
  showPassportNotice = true,
  surface = "default",
  returnEnabled = true,
}: HolderDecisionCompleteProps) {
  const [showDetails, setShowDetails] = useState(false);
  const reduceMotion = useReducedMotion();
  const copy = buildHolderRequestPresentation(partnerName, policyId);
  const duration = reduceMotion ? 0 : abxMotionDuration("protocol") / 1000;
  const walletControl = surface === "wallet_control";
  const eyebrow = walletControl ? "Wallet control verified" : "Verification complete";
  const title = walletControl
    ? "Your verification is complete."
    : copy.completionHeadline;
  const subtitle = walletControl
    ? `${partnerName} can verify the approved wallet-control result on its server before continuing.`
    : "Only the approved result was shared. Sensitive evidence stayed inside Abraxas.";

  return (
    <section
      className={`abx-holder-decision-complete${walletControl ? " abx-holder-decision-complete--wallet-control" : ""}`}
      aria-labelledby="holder-decision-complete-heading"
    >
      <motion.header
        className="abx-holder-decision-complete__header"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="abx-holder-decision-complete__eyebrow" style={{ fontFamily: ABX_FONT_SANS }}>
          {eyebrow}
        </p>
        <h2 id="holder-decision-complete-heading" className="abx-holder-decision-complete__title">
          {title}
        </h2>
        <p className="abx-holder-decision-complete__subtitle" style={{ fontFamily: ABX_FONT_SANS }}>
          {subtitle}
        </p>
      </motion.header>

      {!walletControl ? (
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
      ) : null}

      {onReturn && returnEnabled ? (
        <div className="abx-holder-decision-complete__actions">
          <Btn disabled={returnLoading} onClick={onReturn}>
            {returnLoading ? "Returning…" : returnLabel}
          </Btn>
        </div>
      ) : null}

      {onReturn && !returnEnabled ? (
        <p className="abx-holder-decision-complete__subtitle" role="alert" style={{ fontFamily: ABX_FONT_SANS }}>
          The partner return link is not available from this environment. Contact the application operator.
        </p>
      ) : null}

      {showPassportNotice ? (
        <p className="abx-holder-decision-complete__reuse" style={{ fontFamily: ABX_FONT_SANS }}>
          Your Passport supported this request. Export a portable presentation from{" "}
          <Link href="/passport#passport-credentials" style={{ color: "var(--accent)", fontWeight: 700 }}>
            Portable trust credentials
          </Link>
          {" "}for partner-bound reuse (not a universal identity export).
        </p>
      ) : null}

      <details
        open={showDetails}
        onToggle={(event) => setShowDetails((event.target as HTMLDetailsElement).open)}
        style={{ marginTop: "0.35rem" }}
      >
        <summary
          className="abx-holder-decision-complete__details-summary"
          style={{
            fontFamily: ABX_FONT_SANS,
            fontWeight: 700,
            color: "var(--accent)",
            cursor: "pointer",
          }}
        >
          Verification details
        </summary>
        {walletControl ? (
          <div style={{ marginTop: "0.85rem" }}>
            <PrivacyDisclosureCard
              compact
              requester={partnerName}
              requestReason={copy.requestReason}
              requested={copy.requested}
              shared={copy.sharedResult}
              withheld={copy.withheld}
            />
          </div>
        ) : null}
        <div className="abx-holder-decision-complete__receipt" style={{ marginTop: "0.75rem" }}>
          <LiveDecisionReceiptCard receiptId={receiptId} partnerName={partnerName} />
        </div>
      </details>
    </section>
  );
}
