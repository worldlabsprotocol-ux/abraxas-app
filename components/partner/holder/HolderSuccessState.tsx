"use client";
// FILE: components/partner/holder/HolderSuccessState.tsx
// Confirmation-grade success — not an admin debug response.

import { motion, useReducedMotion } from "framer-motion";
import { abxMotionTransition } from "@/lib/motion/abxMotionFramer";
import type { HolderVerificationPresentation } from "@/lib/partner/holderExperience/presentation";
import { Btn } from "@/components/redesign/ui";
import { HolderTechnicalDetails } from "./HolderTechnicalDetails";
import { holderBody, holderTitle, holderSection, HOLDER_FONT } from "./styles";

export interface HolderSuccessStateProps {
  presentation: HolderVerificationPresentation;
  onReturn?: () => void;
  returnLabel?: string;
  returnLoading?: boolean;
  isSandbox?: boolean;
}

export function HolderSuccessState({
  presentation,
  onReturn,
  returnLabel = "Continue to service",
  returnLoading = false,
  isSandbox = false,
}: HolderSuccessStateProps) {
  const reduce = useReducedMotion();
  const transition = abxMotionTransition("verify", { tier: "calm" });

  return (
    <section
      aria-labelledby="holder-success-heading"
      className="abx-holder-success"
      style={{
        ...holderSection,
        borderColor: "rgba(16,185,129,0.28)",
        background: "rgba(16,185,129,0.06)",
      }}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={transition}
      >
        <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#10B981" }} aria-hidden>
          ✓
        </p>
        <h2 id="holder-success-heading" style={{ ...holderTitle, marginTop: "0.35rem" }}>
          Confirmed
        </h2>
        <p style={{ ...holderBody, marginTop: "0.35rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {presentation.theyReceive}
        </p>
        <p style={{ ...holderBody, marginTop: "0.35rem" }}>
          {presentation.requesterName} received only this result.
          {isSandbox ? " This sandbox result is not production-usable." : ""}
        </p>
        <p style={{ ...holderBody, marginTop: "0.5rem", fontSize: "0.76rem", color: "var(--text-muted)" }}>
          {privacySummary(presentation.staysPrivate)}
        </p>
      </motion.div>

      {onReturn ? (
        <div style={{ marginTop: "0.85rem" }}>
          <Btn disabled={returnLoading} onClick={onReturn}>
            {returnLoading ? "Returning…" : returnLabel}
          </Btn>
        </div>
      ) : null}

      <HolderTechnicalDetails
        details={presentation.technical}
        receiptNote="A signed receipt was issued. Open details to review policy metadata."
      />
    </section>
  );
}

function privacySummary(staysPrivate: string[]): string {
  const sample = staysPrivate.slice(0, 3).join(", ").replace(/^Your /g, "");
  return `Your ${sample.toLowerCase()} and other private details were not shared.`;
}
