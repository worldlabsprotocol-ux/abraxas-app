"use client";

import { useMemo, useState } from "react";
import {
  RECEIPT_DEMO_CLASSIFICATION,
  RECEIPT_DEMO_SAMPLE_NOTE,
  RECEIPT_DEMO_SCENARIO_HINTS,
  RECEIPT_DEMO_SHELL_CAPTION,
  RECEIPT_DEMO_TECHNICAL_DETAILS,
  receiptExampleStatusLabel,
} from "@/lib/home/receiptDemoPublicCopy";
import {
  buildReceiptDemoFields,
  deriveReceiptDemoState,
  type ReceiptDemoCheck,
  type ReceiptDemoCheckStatus,
  type ReceiptScenario,
} from "@/lib/home/receiptVerificationDemoModel";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

const SCENARIOS: { id: ReceiptScenario; label: string }[] = [
  { id: "valid", label: "Valid" },
  { id: "expired", label: "Expired" },
  { id: "revoked", label: "Revoked" },
  { id: "unavailable", label: "Unavailable" },
];

function badgeClass(status: ReceiptDemoCheckStatus): string {
  if (status === "PASS") return " abx-pv-verify__badge--ok";
  if (status === "FAIL") return " abx-pv-verify__badge--fail";
  return " abx-pv-verify__badge--unknown";
}

function CheckList({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: ReceiptDemoCheck[];
}) {
  return (
    <div className="abx-pv-verify__check-col">
      <p className="abx-pv-verify__check-heading">{title}</p>
      <p className="abx-pv-verify__check-sub">{subtitle}</p>
      <ul className="abx-pv-verify__checks">
        {items.map((item) => (
          <li key={item.id} className="abx-pv-verify__check-row">
            <span
              className={`abx-pv-verify__badge${badgeClass(item.status)}`}
              aria-label={item.status === "PASS" ? "Pass" : item.status === "FAIL" ? "Fail" : "Unknown"}
            >
              {item.status === "PASS" ? "Pass" : item.status === "FAIL" ? "Fail" : "Unknown"}
            </span>
            <div>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type DecisionReceiptShellCopy = {
  kicker?: string;
  title?: string;
  titleAccent?: string;
  caption?: string;
};

export function DecisionReceiptVerificationInteractive(props?: { shell?: DecisionReceiptShellCopy }) {
  const [scenario, setScenario] = useState<ReceiptScenario>("valid");
  const state = useMemo(() => deriveReceiptDemoState(scenario), [scenario]);
  const fields = useMemo(() => buildReceiptDemoFields(scenario, state), [scenario, state]);
  const statusLabel = receiptExampleStatusLabel(scenario);

  const { authenticityChecks, authorizationChecks } = state;

  const outcomeColor =
    state.currentlyAuthorized && state.outcome === "PERMIT"
      ? "var(--abx-premium-green, #4cbb92)"
      : "#e57373";

  return (
    <ProtocolVisualShell
      id="verify-the-decision"
      kicker={props?.shell?.kicker ?? "05 Evidence"}
      title={props?.shell?.title ?? "Verify the"}
      titleAccent={props?.shell?.titleAccent ?? "Decision"}
      caption={props?.shell?.caption ?? RECEIPT_DEMO_SHELL_CAPTION}
      className="abx-pv-shell--exhibit abx-pv-shell--open"
    >
      <div className="abx-pv-verify abx-pv-verify--elevated abx-trust-surface">
        <div className="abx-pv-verify__sample-banner" role="note">
          <span className="abx-pv-verify__sample-badge">Sample</span>
          <p>{RECEIPT_DEMO_SAMPLE_NOTE}</p>
        </div>

        <p className="abx-pv-verify__intro">
          Abraxas separates two questions: whether the receipt is <strong>genuine</strong>, and whether the decision is{" "}
          <strong>authorized now</strong>. Live partner verification uses the same split.
        </p>

        <div className="abx-pv-verify__read-path" role="note" aria-label="Receipt reading order">
          <p className="abx-pv-verify__read-path-label">Reading order</p>
          <span className="abx-pv-verify__read-path-item abx-pv-verify__read-path-item--auth">
            Cryptographic authenticity
          </span>
          <span className="abx-pv-verify__read-path-arrow" aria-hidden="true">
            →
          </span>
          <span className="abx-pv-verify__read-path-item abx-pv-verify__read-path-item--receipt">Decision receipt</span>
          <span className="abx-pv-verify__read-path-arrow" aria-hidden="true">
            →
          </span>
          <span className="abx-pv-verify__read-path-item abx-pv-verify__read-path-item--live">
            Current authorization
          </span>
        </div>

        <div className="abx-pv-verify__scenarios" role="tablist" aria-label="Receipt verification scenarios">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={scenario === s.id}
              className={`abx-pv-verify__scenario${scenario === s.id ? " abx-pv-verify__scenario--active" : ""}`}
              onClick={() => setScenario(s.id)}
            >
              <span className="abx-pv-verify__scenario-label">{s.label}</span>
              <span className="abx-pv-verify__scenario-hint">{RECEIPT_DEMO_SCENARIO_HINTS[s.id]}</span>
            </button>
          ))}
        </div>

        <div className="abx-pv-verify__layout">
          <CheckList
            title="Cryptographic authenticity"
            subtitle="Structural checks on the signed artifact"
            items={authenticityChecks}
          />

          <article className="abx-pv-verify__receipt" aria-live="polite">
            <header className="abx-pv-verify__receipt-head">
              <div>
                <p className="abx-pv-verify__receipt-kicker">Decision receipt</p>
                <p className="abx-pv-verify__receipt-version">
                  v1 · <span className="abx-pv-verify__sample-inline">sample fixture</span>
                </p>
              </div>
              <div
                className="abx-pv-verify__outcome"
                role="status"
                style={{ color: outcomeColor, borderColor: outcomeColor }}
              >
                {state.outcome}
              </div>
            </header>
            <dl className="abx-pv-verify__meta">
              {fields.map((row) => (
                <div key={row.label} className="abx-pv-verify__meta-row">
                  <dt>{row.label}</dt>
                  <dd className={row.mono ? "abx-pv-verify__mono" : undefined}>{row.value}</dd>
                </div>
              ))}
            </dl>
            <footer className="abx-pv-verify__receipt-foot">
              <div>
                <span className="abx-pv-verify__foot-label">Receipt ID</span>
                <code>rcpt_7e5f9d2a4c1b</code>
              </div>
              <div>
                <span className="abx-pv-verify__foot-label">Hash (SHA-256)</span>
                <code>sha256:4f2c…8e1d</code>
              </div>
            </footer>
          </article>

          <CheckList
            title="Current authorization"
            subtitle="Whether the decision is usable now"
            items={authorizationChecks}
          />
        </div>

        <div className="abx-pv-verify__summary" role="status">
          <div className="abx-pv-verify__summary-state">
            <span className={`abx-pv-verify__state-dot abx-pv-verify__state-dot--${scenario}`} aria-hidden="true" />
            <div>
              <p className="abx-pv-verify__summary-title">{RECEIPT_DEMO_CLASSIFICATION}</p>
              <p className="abx-pv-verify__summary-status">
                Status: <strong>{statusLabel}</strong>
              </p>
              <p className="abx-pv-verify__summary-body">{state.verificationSummary}</p>
            </div>
          </div>
          {state.signatureValid && !state.currentlyAuthorized ? (
            <p className="abx-pv-verify__aggregate-note">
              A valid signature in a sample does not imply PERMIT when authorization checks fail.
            </p>
          ) : state.aggregateStatus === "UNAVAILABLE" ? (
            <p className="abx-pv-verify__aggregate-note">
              Unknown checks in this example do not imply an invalid signature.
            </p>
          ) : null}
        </div>

        <details className="abx-pv-verify__details">
          <summary>Technical details</summary>
          <p>{RECEIPT_DEMO_TECHNICAL_DETAILS}</p>
        </details>
      </div>
    </ProtocolVisualShell>
  );
}
