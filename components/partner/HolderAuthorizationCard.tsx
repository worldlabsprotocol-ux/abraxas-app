"use client";
// FILE: components/partner/HolderAuthorizationCard.tsx
// Single-card holder authorization — request, checking, success, failure.

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionDuration } from "@/lib/design/abraxasMotion";
import type { HolderAuthorizationCopy } from "@/lib/partner/holderExperience/authorizationCopy";
import { Btn } from "@/components/redesign/ui";

export type HolderAuthorizationPhase =
  | "request"
  | "checking"
  | "success"
  | "verification_required"
  | "failure";

export interface HolderAuthorizationFailure {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface HolderAuthorizationCardProps {
  phase: HolderAuthorizationPhase;
  copy: HolderAuthorizationCopy;
  onConfirm?: () => void;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  onReturn?: () => void;
  returnLoading?: boolean;
  returnLabel?: string;
  failure?: HolderAuthorizationFailure | null;
  onVerify?: () => void;
  verifyLoading?: boolean;
  showSandboxNote?: boolean;
  sandboxNote?: string;
}

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--border, rgba(255,255,255,0.08))",
  borderRadius: "14px",
  padding: "1.1rem 1.15rem",
  background: "var(--surface-raised, rgba(255,255,255,0.02))",
};

export function HolderAuthorizationCard({
  phase,
  copy,
  onConfirm,
  confirmLoading = false,
  confirmDisabled = false,
  onReturn,
  returnLoading = false,
  returnLabel = "Return to Partner",
  failure = null,
  onVerify,
  verifyLoading = false,
  showSandboxNote = false,
  sandboxNote,
}: HolderAuthorizationCardProps) {
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : abxMotionDuration("protocol") / 1000;

  return (
    <section
      className="abx-holder-authorization-card"
      aria-live="polite"
      aria-busy={phase === "checking"}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          style={cardStyle}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
        >
          {phase === "request" && (
            <>
              <h2 style={{ margin: "0 0 0.55rem", fontSize: "1.05rem", fontWeight: 800, lineHeight: 1.35 }}>
                {copy.headline}
              </h2>
              <p style={{ margin: "0 0 0.85rem", fontSize: "0.88rem", lineHeight: 1.55, color: "var(--text-secondary, #cbd5e1)" }}>
                {copy.supporting}
              </p>
              {copy.reuseLine ? (
                <p
                  role="status"
                  style={{
                    margin: "0 0 0.85rem",
                    fontSize: "0.82rem",
                    lineHeight: 1.5,
                    color: "var(--text-muted, #94a3b8)",
                  }}
                >
                  {copy.reuseLine}
                </p>
              ) : null}
              {showSandboxNote && sandboxNote ? (
                <p style={{ margin: "0 0 0.85rem", fontSize: "0.74rem", color: "var(--text-muted, #94a3b8)" }}>
                  {sandboxNote}
                </p>
              ) : null}
              {onConfirm ? (
                <Btn disabled={confirmDisabled || confirmLoading} onClick={onConfirm}>
                  {confirmLoading ? "Confirming…" : copy.confirmLabel}
                </Btn>
              ) : null}
              <DisclosureToggle
                open={disclosureOpen}
                onToggle={setDisclosureOpen}
                copy={copy}
              />
            </>
          )}

          {phase === "checking" && (
            <>
              <p
                role="status"
                aria-live="polite"
                style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.45 }}
              >
                {copy.checkingLine}
              </p>
              {copy.reuseLine ? (
                <p style={{ margin: "0.55rem 0 0", fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)" }}>
                  {copy.reuseLine}
                </p>
              ) : null}
            </>
          )}

          {phase === "verification_required" && (
            <>
              <h2 style={{ margin: "0 0 0.55rem", fontSize: "1rem", fontWeight: 800, lineHeight: 1.35 }}>
                {copy.verificationRequiredTitle}
              </h2>
              <p style={{ margin: "0 0 0.85rem", fontSize: "0.88rem", lineHeight: 1.55, color: "var(--text-secondary, #cbd5e1)" }}>
                {copy.verificationRequiredBody}
              </p>
              {onVerify ? (
                <Btn disabled={verifyLoading} onClick={onVerify}>
                  {verifyLoading ? "Verifying…" : copy.verificationRequiredActionLabel}
                </Btn>
              ) : null}
            </>
          )}

          {phase === "success" && (
            <>
              <p
                className="abx-holder-authorization-card__success-eyebrow"
                style={{ margin: "0 0 0.35rem", fontSize: "0.72rem", fontWeight: 700, color: "var(--accent, #10B981)" }}
              >
                ✓
              </p>
              <h2 style={{ margin: "0 0 0.65rem", fontSize: "1.15rem", fontWeight: 800 }}>
                {copy.successTitle}
              </h2>
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.82rem", color: "var(--text-muted, #94a3b8)" }}>
                Partner received:
              </p>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>
                {copy.successSharedLabel} · {copy.successSharedValue}
              </p>
              <p style={{ margin: "0 0 0.95rem", fontSize: "0.84rem", lineHeight: 1.55, color: "var(--text-secondary, #cbd5e1)" }}>
                {copy.successPrivateLine}
              </p>
              {onReturn ? (
                <Btn disabled={returnLoading} onClick={onReturn}>
                  {returnLoading ? "Returning…" : returnLabel}
                </Btn>
              ) : null}
              <DisclosureToggle
                open={disclosureOpen}
                onToggle={setDisclosureOpen}
                copy={copy}
              />
            </>
          )}

          {phase === "failure" && failure ? (
            <>
              <h2 style={{ margin: "0 0 0.55rem", fontSize: "1rem", fontWeight: 800 }}>
                {failure.title}
              </h2>
              <p style={{ margin: "0 0 0.85rem", fontSize: "0.88rem", lineHeight: 1.55, color: "var(--text-secondary, #cbd5e1)" }}>
                {failure.message}
              </p>
              {failure.onAction && failure.actionLabel ? (
                <Btn onClick={failure.onAction}>{failure.actionLabel}</Btn>
              ) : null}
            </>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function DisclosureToggle({
  open,
  onToggle,
  copy,
}: {
  open: boolean;
  onToggle: (next: boolean) => void;
  copy: HolderAuthorizationCopy;
}) {
  return (
    <details
      open={open}
      onToggle={(event) => onToggle((event.target as HTMLDetailsElement).open)}
      style={{ marginTop: "0.85rem" }}
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
        {copy.disclosureTitle}
      </summary>
      <div style={{ marginTop: "0.65rem", fontSize: "0.78rem", lineHeight: 1.55 }}>
        <p style={{ margin: "0 0 0.35rem", fontWeight: 700 }}>Shared:</p>
        <ul style={{ margin: "0 0 0.65rem", paddingLeft: "1.1rem" }}>
          {copy.disclosureShared.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p style={{ margin: "0 0 0.35rem", fontWeight: 700 }}>Not shared:</p>
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          {copy.disclosureWithheld.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}
