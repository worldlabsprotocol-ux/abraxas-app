"use client";
// FILE: components/protocol/ProtocolFlowExperience.tsx
// Interactive Protocol in Action — before/after Abraxas with canonical policy truth.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import {
  DEFAULT_PROTOCOL_POLICY,
  PROTOCOL_FLOW_POLICIES,
  PROTOCOL_FLOW_STEPS,
  TRADITIONAL_LEAK_FIELDS,
  TRADITIONAL_REPEAT_APPS,
  type ProtocolFlowMode,
  type ProtocolFlowStepId,
} from "@/lib/protocol/protocolFlowCatalog";
import { ABX_FONT_MONO, ABX_FONT_SANS, ABX_TAB_ACCENTS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionDuration } from "@/lib/design/abraxasMotion";
import { PrivacyBoundary, PrivacyBoundaryLegend } from "@/components/protocol/PrivacyBoundary";
import { DecisionReceiptCard } from "@/components/protocol/DecisionReceiptCard";

const ACCENT = ABX_TAB_ACCENTS.home.color;

function formatValidUntil(hours: number): string {
  const d = new Date(Date.now() + hours * 60 * 60 * 1000);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function TraditionalModel() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="abx-protocol-flow__traditional" aria-label="Traditional verification model">
      <p className="abx-protocol-flow__traditional-lead" style={{ fontFamily: ABX_FONT_SANS }}>
        Every application becomes an identity-data custodian. The same sensitive fields leave the holder again and again.
      </p>
      <div className="abx-protocol-flow__apps">
        {TRADITIONAL_REPEAT_APPS.map((app, appIndex) => (
          <motion.div
            key={app}
            className="abx-protocol-flow__app-card"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : appIndex * 0.08, duration: 0.35 }}
          >
            <span className="abx-protocol-flow__app-name" style={{ fontFamily: ABX_FONT_MONO }}>
              {app}
            </span>
            <ul className="abx-protocol-flow__leak-list">
              {TRADITIONAL_LEAK_FIELDS.map((field) => (
                <li key={`${app}-${field}`} style={{ fontFamily: ABX_FONT_SANS }}>
                  {field}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
      <p className="abx-protocol-flow__traditional-note" style={{ fontFamily: ABX_FONT_SANS }}>
        Repeated verification. Repeated document collection. Repeated storage. Repeated exposure.
      </p>
    </div>
  );
}

function AbraxasStage({
  step,
  policy,
  onAdvance,
}: {
  step: ProtocolFlowStepId;
  policy: typeof DEFAULT_PROTOCOL_POLICY;
  onAdvance?: () => void;
}) {
  const reduceMotion = useReducedMotion();

  const evaluationChain = ["Evidence", "Assurance", "Freshness", "Policy", "Decision"];

  return (
    <div className="abx-protocol-flow__stage" data-step={step}>
      {step === "request" && (
        <div className="abx-protocol-flow__panel">
          <span className="abx-protocol-flow__panel-eyebrow" style={{ fontFamily: ABX_FONT_MONO }}>
            Policy request
          </span>
          <p className="abx-protocol-flow__panel-title" style={{ fontFamily: ABX_FONT_SANS }}>
            Application asks a narrow question
          </p>
          <blockquote className="abx-protocol-flow__question" style={{ fontFamily: ABX_FONT_SANS }}>
            “{policy.question}”
          </blockquote>
          <p className="abx-protocol-flow__panel-copy" style={{ fontFamily: ABX_FONT_SANS }}>
            The request travels into Abraxas — not into a profile upload form.
          </p>
        </div>
      )}

      {step === "consent" && (
        <div className="abx-protocol-flow__panel">
          <span className="abx-protocol-flow__panel-eyebrow" style={{ fontFamily: ABX_FONT_MONO }}>
            Holder consent
          </span>
          <p className="abx-protocol-flow__panel-copy" style={{ fontFamily: ABX_FONT_SANS }}>
            You see who is asking, what they will receive, and what stays private before anything is evaluated.
          </p>
        </div>
      )}

      {step === "evidence" && (
        <div className="abx-protocol-flow__panel">
          <span className="abx-protocol-flow__panel-eyebrow" style={{ fontFamily: ABX_FONT_MONO }}>
            Passport evidence
          </span>
          <p className="abx-protocol-flow__panel-copy" style={{ fontFamily: ABX_FONT_SANS }}>
            Evidence is established once inside Abraxas. Sensitive records remain behind the privacy boundary.
          </p>
          <div className="abx-protocol-flow__passport-chip" style={{ fontFamily: ABX_FONT_MONO }}>
            Reusable trust · {policy.minimumAssurance} assurance
          </div>
        </div>
      )}

      {step === "evaluate" && (
        <div className="abx-protocol-flow__panel">
          <span className="abx-protocol-flow__panel-eyebrow" style={{ fontFamily: ABX_FONT_MONO }}>
            Private evaluation
          </span>
          <ol className="abx-protocol-flow__eval-chain">
            {evaluationChain.map((label, i) => (
              <motion.li
                key={label}
                style={{ fontFamily: ABX_FONT_MONO }}
                initial={reduceMotion ? false : { opacity: 0.4, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : i * 0.12, duration: 0.28 }}
              >
                {label}
              </motion.li>
            ))}
          </ol>
        </div>
      )}

      {step === "disclose" && (
        <div className="abx-protocol-flow__panel abx-protocol-flow__panel--wide">
          <span className="abx-protocol-flow__panel-eyebrow" style={{ fontFamily: ABX_FONT_MONO }}>
            Selective disclosure
          </span>
          <PrivacyBoundary
            protectedItems={policy.protectedFields}
            disclosedLabel={policy.disclosedLabel}
            disclosedResult={policy.disclosedResult}
            signalActive
          />
          <PrivacyBoundaryLegend />
        </div>
      )}

      {step === "sign" && (
        <div className="abx-protocol-flow__panel">
          <span className="abx-protocol-flow__panel-eyebrow" style={{ fontFamily: ABX_FONT_MONO }}>
            Signed receipt
          </span>
          <DecisionReceiptCard
            policyLabel={policy.displayName}
            disclosedResult={policy.disclosedResult}
            disclosedLabel={policy.disclosedLabel}
            validUntil={formatValidUntil(policy.receiptLifetimeHours)}
            status="verified"
            compact
          />
        </div>
      )}

      {step === "verify" && (
        <div className="abx-protocol-flow__panel">
          <span className="abx-protocol-flow__panel-eyebrow" style={{ fontFamily: ABX_FONT_MONO }}>
            Application verifies
          </span>
          <div className="abx-protocol-flow__verify-chain" style={{ fontFamily: ABX_FONT_MONO }}>
            {["Request", "Evaluate", "Sign", "Verify", "Access"].map((label, i, arr) => (
              <span key={label}>
                {label}
                {i < arr.length - 1 ? <span aria-hidden> → </span> : null}
              </span>
            ))}
          </div>
          <p className="abx-protocol-flow__panel-copy" style={{ fontFamily: ABX_FONT_SANS }}>
            The partner verifies the signed answer — not a copy of your identity documents.
          </p>
        </div>
      )}

      {step === "reuse" && (
        <div className="abx-protocol-flow__panel">
          <span className="abx-protocol-flow__panel-eyebrow" style={{ fontFamily: ABX_FONT_MONO }}>
            Reuse
          </span>
          <p className="abx-protocol-flow__panel-copy" style={{ fontFamily: ABX_FONT_SANS }}>
            App B asks another eligible question. Valid evidence can support a new policy request without restarting from zero.
          </p>
          <p className="abx-protocol-flow__reuse-note" style={{ fontFamily: ABX_FONT_SANS }}>
            {policy.reuseNote}
          </p>
        </div>
      )}

      {onAdvance ? (
        <button
          type="button"
          className="abx-protocol-flow__advance sr-only-focusable"
          onClick={onAdvance}
          style={{ fontFamily: ABX_FONT_SANS }}
        >
          Advance protocol step
        </button>
      ) : null}
    </div>
  );
}

export function ProtocolFlowExperience() {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<ProtocolFlowMode>("abraxas");
  const [policyId, setPolicyId] = useState<PolicyPackId>(DEFAULT_PROTOCOL_POLICY.id);
  const [stepIndex, setStepIndex] = useState(0);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);

  const policy = useMemo(
    () => PROTOCOL_FLOW_POLICIES.find((p) => p.id === policyId) ?? DEFAULT_PROTOCOL_POLICY,
    [policyId],
  );

  const activeStep = PROTOCOL_FLOW_STEPS[stepIndex]?.id ?? "request";

  const advance = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, PROTOCOL_FLOW_STEPS.length - 1));
  }, []);

  const goToStep = useCallback((index: number) => {
    setStepIndex(Math.max(0, Math.min(index, PROTOCOL_FLOW_STEPS.length - 1)));
  }, []);

  useEffect(() => {
    setStepIndex(0);
  }, [mode, policyId]);

  useEffect(() => {
    if (mode !== "abraxas" || reduceMotion) return;
    const node = stepRefs.current[stepIndex];
    node?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [stepIndex, mode, reduceMotion]);

  return (
    <div className="abx-protocol-flow" style={{ ["--abx-protocol-accent" as string]: ACCENT }}>
      <div className="abx-protocol-flow__controls">
        <div className="abx-protocol-flow__mode-toggle" role="tablist" aria-label="Verification model">
          {(["traditional", "abraxas"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={`abx-protocol-flow__mode-btn ${mode === m ? "abx-protocol-flow__mode-btn--active" : ""}`}
              onClick={() => setMode(m)}
              style={{ fontFamily: ABX_FONT_SANS }}
            >
              {m === "traditional" ? "Traditional" : "Abraxas"}
            </button>
          ))}
        </div>

        {mode === "abraxas" ? (
          <div className="abx-protocol-flow__policy-row" role="group" aria-label="Policy examples">
            {PROTOCOL_FLOW_POLICIES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`abx-protocol-flow__policy-chip ${policyId === p.id ? "abx-protocol-flow__policy-chip--active" : ""}`}
                aria-pressed={policyId === p.id}
                onClick={() => setPolicyId(p.id)}
                style={{ fontFamily: ABX_FONT_MONO }}
              >
                {p.displayName}
                {p.sandboxOnly ? " · Sandbox" : ""}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {mode === "traditional" ? (
        <TraditionalModel />
      ) : (
        <>
          <div className="abx-protocol-flow__step-rail" aria-label="Protocol steps">
            {PROTOCOL_FLOW_STEPS.map((step, index) => (
              <button
                key={step.id}
                type="button"
                ref={(el) => {
                  stepRefs.current[index] = el;
                }}
                className={`abx-protocol-flow__step-pill ${index === stepIndex ? "abx-protocol-flow__step-pill--active" : ""} ${index < stepIndex ? "abx-protocol-flow__step-pill--done" : ""}`}
                aria-current={index === stepIndex ? "step" : undefined}
                onClick={() => goToStep(index)}
                style={{ fontFamily: ABX_FONT_MONO }}
              >
                <span className="abx-protocol-flow__step-num">{step.short}</span>
                <span className="abx-protocol-flow__step-label">{step.label}</span>
              </button>
            ))}
          </div>

          <div className="abx-protocol-flow__stage-wrap">
            <AbraxasStage step={activeStep} policy={policy} onAdvance={advance} />
          </div>

          <div className="abx-protocol-flow__actions">
            <button
              type="button"
              className="abx-protocol-flow__action-btn abx-protocol-flow__action-btn--secondary"
              disabled={stepIndex === 0}
              onClick={() => goToStep(stepIndex - 1)}
              style={{ fontFamily: ABX_FONT_SANS }}
            >
              Previous
            </button>
            <button
              type="button"
              className="abx-protocol-flow__action-btn"
              disabled={stepIndex >= PROTOCOL_FLOW_STEPS.length - 1}
              onClick={advance}
              style={{ fontFamily: ABX_FONT_SANS }}
            >
              {stepIndex >= PROTOCOL_FLOW_STEPS.length - 1 ? "Complete" : "Next step"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
