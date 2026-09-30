"use client";
// FILE: components/protocol/DecisionReceiptCard.tsx
// Compact signed verification artifact — marketing fixtures or live DecisionReceiptDisplayModel.

import { motion, useReducedMotion } from "framer-motion";
import { useState, type CSSProperties } from "react";
import { ABX_FONT_MONO, ABX_FONT_SANS, ABX_STATUS_COLORS, type AbxStatusTone } from "@/lib/design/abraxasDesignSystem";
import { abxMotionDuration } from "@/lib/design/abraxasMotion";
import {
  formatReceiptTimestamp,
  type DecisionReceiptDisplayModel,
  type DecisionReceiptVisualStatus,
} from "@/lib/protocol/decisionReceiptDisplay";

export interface DecisionReceiptCardProps {
  /** Live display model — preferred for real receipt state */
  model?: DecisionReceiptDisplayModel;
  /** Legacy/manual props for Protocol in Action demos */
  policyLabel?: string;
  disclosedResult?: string;
  disclosedLabel?: string;
  partnerName?: string;
  validUntil?: string;
  status?: DecisionReceiptVisualStatus;
  receiptId?: string;
  showTechnical?: boolean;
  compact?: boolean;
  motionPhase?: "idle" | "verifying" | "resolved";
  className?: string;
  style?: CSSProperties;
}

const STATUS_MAP: Record<
  DecisionReceiptVisualStatus,
  { tone: AbxStatusTone; label: string; pulse: boolean }
> = {
  verified: { tone: "success", label: "Verified", pulse: true },
  sandbox: { tone: "warning", label: "Sandbox verified", pulse: false },
  pending: { tone: "pending", label: "Pending", pulse: false },
  denied: { tone: "error", label: "Denied", pulse: false },
  expired: { tone: "neutral", label: "Expired", pulse: false },
  revoked: { tone: "error", label: "Revoked", pulse: false },
  invalid: { tone: "error", label: "Invalid", pulse: false },
  unknown: { tone: "neutral", label: "Unable to verify", pulse: false },
};

function resolveProps(input: DecisionReceiptCardProps) {
  if (input.model) {
    return {
      policyLabel: input.model.policyLabel,
      disclosedResult: input.model.disclosedResult,
      disclosedLabel: input.model.resultLabel,
      partnerName: input.model.partnerName,
      validUntil: formatReceiptTimestamp(input.model.validUntil) ?? undefined,
      status: input.model.visualStatus,
      receiptId: input.model.receiptId,
      environmentLabel: input.model.environmentLabel,
      environment: input.model.environment,
      statusLabel: input.model.statusLabel,
      policyVersion: input.model.policyVersion,
      evaluatedAt: formatReceiptTimestamp(input.model.evaluatedAt) ?? undefined,
      signingKeyId: input.model.signingKeyId,
      lifecycleStatus: input.model.lifecycleStatus,
    };
  }

  return {
    policyLabel: input.policyLabel ?? "Policy",
    disclosedResult: input.disclosedResult ?? "",
    disclosedLabel: input.disclosedLabel ?? "",
    partnerName: input.partnerName,
    validUntil: input.validUntil,
    status: input.status ?? "verified",
    receiptId: input.receiptId,
    environmentLabel: undefined,
    environment: undefined,
    statusLabel: STATUS_MAP[input.status ?? "verified"].label,
    policyVersion: undefined,
    evaluatedAt: undefined,
    signingKeyId: undefined,
    lifecycleStatus: undefined,
  };
}

export function DecisionReceiptCard(props: DecisionReceiptCardProps) {
  const {
    showTechnical = false,
    compact = false,
    motionPhase = "resolved",
    className = "",
    style,
  } = props;

  const reduceMotion = useReducedMotion();
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const resolved = resolveProps(props);
  const statusMeta = STATUS_MAP[resolved.status];
  const colors = ABX_STATUS_COLORS[statusMeta.tone];
  const pulse = statusMeta.pulse && !reduceMotion && motionPhase === "resolved";
  const verifying = motionPhase === "verifying" && !reduceMotion;

  return (
    <motion.article
      className={`abx-decision-receipt ${compact ? "abx-decision-receipt--compact" : ""} ${resolved.environment === "sandbox" ? "abx-decision-receipt--sandbox" : ""} ${className}`.trim()}
      style={style}
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={
        verifying
          ? { opacity: 0.88, y: 0, scale: 0.99 }
          : { opacity: 1, y: 0, scale: 1 }
      }
      transition={{ duration: abxMotionDuration("protocol") / 1000, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`Decision receipt: ${resolved.disclosedLabel}`}
      aria-busy={verifying}
    >
      <header className="abx-decision-receipt__header">
        <div className="abx-decision-receipt__brand" style={{ fontFamily: ABX_FONT_MONO }}>
          <span className="abx-decision-receipt__mark" aria-hidden />
          Abraxas receipt
        </div>
        <div className="abx-decision-receipt__header-badges">
          {resolved.environmentLabel ? (
            <span
              className={`abx-decision-receipt__env ${resolved.environment === "sandbox" ? "abx-decision-receipt__env--sandbox" : ""}`}
              style={{ fontFamily: ABX_FONT_MONO }}
            >
              {resolved.environmentLabel}
            </span>
          ) : null}
          <span
            className={`abx-decision-receipt__status ${pulse ? "abx-decision-receipt__status--live" : ""} ${verifying ? "abx-decision-receipt__status--verifying" : ""}`}
            style={{
              fontFamily: ABX_FONT_MONO,
              color: colors.color,
              borderColor: colors.border,
              background: colors.faint,
            }}
            role="status"
          >
            {verifying ? "Verifying…" : resolved.statusLabel}
          </span>
        </div>
      </header>

      <div className="abx-decision-receipt__body">
        <p className="abx-decision-receipt__result" style={{ fontFamily: ABX_FONT_SANS }}>
          {resolved.disclosedLabel}
        </p>
        <dl className="abx-decision-receipt__meta">
          <div>
            <dt style={{ fontFamily: ABX_FONT_MONO }}>Policy</dt>
            <dd style={{ fontFamily: ABX_FONT_SANS }}>{resolved.policyLabel}</dd>
          </div>
          {resolved.partnerName ? (
            <div>
              <dt style={{ fontFamily: ABX_FONT_MONO }}>For</dt>
              <dd style={{ fontFamily: ABX_FONT_SANS }}>{resolved.partnerName}</dd>
            </div>
          ) : null}
          {resolved.validUntil ? (
            <div>
              <dt style={{ fontFamily: ABX_FONT_MONO }}>Valid until</dt>
              <dd style={{ fontFamily: ABX_FONT_SANS }}>{resolved.validUntil}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <footer className="abx-decision-receipt__footer" style={{ fontFamily: ABX_FONT_MONO }}>
        <span>Signed by Abraxas</span>
        {(showTechnical || props.model) && resolved.receiptId ? (
          <button
            type="button"
            className="abx-decision-receipt__tech-toggle"
            aria-expanded={technicalOpen}
            onClick={() => setTechnicalOpen((open) => !open)}
          >
            {technicalOpen ? "Hide details" : "Technical details"}
          </button>
        ) : null}
      </footer>

      {technicalOpen && (showTechnical || props.model) ? (
        <div className="abx-decision-receipt__technical" style={{ fontFamily: ABX_FONT_MONO }}>
          {resolved.receiptId ? <code title="Receipt ID">{resolved.receiptId}</code> : null}
          {resolved.disclosedResult ? <code>{resolved.disclosedResult}</code> : null}
          {resolved.policyVersion != null ? <code>policy v{resolved.policyVersion}</code> : null}
          {resolved.evaluatedAt ? <code>issued {resolved.evaluatedAt}</code> : null}
          {resolved.lifecycleStatus ? <code>{resolved.lifecycleStatus}</code> : null}
          {resolved.signingKeyId ? <code>{resolved.signingKeyId}</code> : null}
        </div>
      ) : null}
    </motion.article>
  );
}
