"use client";
// FILE: components/protocol/DecisionReceiptCard.tsx
// Compact signed verification artifact — reusable across holder success, Protocol in Action, and docs.

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { ABX_FONT_MONO, ABX_FONT_SANS, ABX_STATUS_COLORS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionDuration } from "@/lib/design/abraxasMotion";

export interface DecisionReceiptCardProps {
  policyLabel: string;
  disclosedResult: string;
  disclosedLabel: string;
  partnerName?: string;
  validUntil?: string;
  status?: "verified" | "pending" | "denied" | "expired";
  receiptId?: string;
  showTechnical?: boolean;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
}

const STATUS_MAP = {
  verified: { tone: "success" as const, label: "Verified" },
  pending: { tone: "pending" as const, label: "Pending" },
  denied: { tone: "error" as const, label: "Denied" },
  expired: { tone: "neutral" as const, label: "Expired" },
};

export function DecisionReceiptCard({
  policyLabel,
  disclosedResult,
  disclosedLabel,
  partnerName,
  validUntil,
  status = "verified",
  receiptId,
  showTechnical = false,
  compact = false,
  className = "",
  style,
}: DecisionReceiptCardProps) {
  const reduceMotion = useReducedMotion();
  const statusMeta = STATUS_MAP[status];
  const colors = ABX_STATUS_COLORS[statusMeta.tone];
  const pulse = status === "verified" && !reduceMotion;

  return (
    <motion.article
      className={`abx-decision-receipt ${compact ? "abx-decision-receipt--compact" : ""} ${className}`.trim()}
      style={style}
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: abxMotionDuration("protocol") / 1000, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`Decision receipt: ${disclosedLabel}`}
    >
      <header className="abx-decision-receipt__header">
        <div className="abx-decision-receipt__brand" style={{ fontFamily: ABX_FONT_MONO }}>
          <span className="abx-decision-receipt__mark" aria-hidden />
          Abraxas receipt
        </div>
        <span
          className={`abx-decision-receipt__status ${pulse ? "abx-decision-receipt__status--live" : ""}`}
          style={{
            fontFamily: ABX_FONT_MONO,
            color: colors.color,
            borderColor: colors.border,
            background: colors.faint,
          }}
        >
          {statusMeta.label}
        </span>
      </header>

      <div className="abx-decision-receipt__body">
        <p className="abx-decision-receipt__result" style={{ fontFamily: ABX_FONT_SANS }}>
          {disclosedLabel}
        </p>
        <dl className="abx-decision-receipt__meta">
          <div>
            <dt style={{ fontFamily: ABX_FONT_MONO }}>Policy</dt>
            <dd style={{ fontFamily: ABX_FONT_SANS }}>{policyLabel}</dd>
          </div>
          {partnerName ? (
            <div>
              <dt style={{ fontFamily: ABX_FONT_MONO }}>For</dt>
              <dd style={{ fontFamily: ABX_FONT_SANS }}>{partnerName}</dd>
            </div>
          ) : null}
          {validUntil ? (
            <div>
              <dt style={{ fontFamily: ABX_FONT_MONO }}>Valid until</dt>
              <dd style={{ fontFamily: ABX_FONT_SANS }}>{validUntil}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <footer className="abx-decision-receipt__footer" style={{ fontFamily: ABX_FONT_MONO }}>
        <span>Signed by Abraxas</span>
        {showTechnical ? (
          <>
            <code>{disclosedResult}</code>
            {receiptId ? <code title="Receipt ID">{receiptId.slice(0, 12)}…</code> : null}
          </>
        ) : null}
      </footer>
    </motion.article>
  );
}
