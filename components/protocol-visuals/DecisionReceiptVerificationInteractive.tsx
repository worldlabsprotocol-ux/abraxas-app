"use client";

import { useMemo, useState } from "react";
import { V2_SIMULATION_LABEL } from "@/lib/home/v2HomeCopy";
import {
  buildReceiptDemoFields,
  deriveReceiptDemoState,
  type ReceiptDemoCheck,
  type ReceiptDemoCheckStatus,
  type ReceiptScenario,
} from "@/lib/home/receiptVerificationDemoModel";
import { ProtocolVisualShell } from "./ProtocolVisualShell";

const SCENARIOS: { id: ReceiptScenario; label: string; hint: string }[] = [
  { id: "valid", label: "Valid", hint: "All checks pass" },
  { id: "expired", label: "Expired", hint: "Decision is expired" },
  { id: "revoked", label: "Revoked", hint: "Authorization revoked" },
  { id: "unavailable", label: "Unavailable", hint: "Cannot be verified" },
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

export function DecisionReceiptVerificationInteractive() {
  const [scenario, setScenario] = useState<ReceiptScenario>("valid");
  const state = useMemo(() => deriveReceiptDemoState(scenario), [scenario]);
  const fields = useMemo(() => buildReceiptDemoFields(scenario, state), [scenario, state]);

  const { authenticityChecks, authorizationChecks } = state;

  const outcomeColor =
    state.currentlyAuthorized && state.outcome === "PERMIT"
      ? "var(--abx-premium-green, #4cbb92)"
      : "#e57373";

  return (
    <ProtocolVisualShell
      id="verify-the-decision"
      kicker="05 Evidence"
      title="Verify the"
      titleAccent="Decision"
      caption="Simulated receipt and verifier checks, not live partner status."
      className="abx-pv-shell--exhibit abx-pv-shell--open"
    >
      <div className="abx-pv-verify">
        <p className="abx-pv-verify__intro">
          Independently verify every decision receipt. Cryptographic authenticity and current authorization status are
          evaluated separately.
        </p>

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
              <span className="abx-pv-verify__scenario-hint">{s.hint}</span>
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
                <p className="abx-pv-verify__receipt-version">v1 · simulated</p>
              </div>
              <div
                className="abx-pv-verify__outcome"
                role="status"
                style={{ color: outcomeColor, borderColor: outcomeColor }}
              >
                {state.outcome}
              </div>
            </header>
            <p className="abx-pv-verify__sim" role="note">
              {V2_SIMULATION_LABEL}
            </p>
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
              <p className="abx-pv-verify__summary-title">Verification complete (simulated)</p>
              <p className="abx-pv-verify__summary-body">{state.verificationSummary}</p>
            </div>
          </div>
          <p className="abx-pv-verify__aggregate">
            Aggregate state: <strong>{state.aggregateStatus}</strong>
            {state.signatureValid && !state.currentlyAuthorized ? (
              <span className="abx-pv-verify__aggregate-note">
                {" "}
                Valid signature does not imply PERMIT.
              </span>
            ) : state.aggregateStatus === "UNAVAILABLE" ? (
              <span className="abx-pv-verify__aggregate-note">
                {" "}
                Unknown checks do not imply an invalid signature.
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </ProtocolVisualShell>
  );
}
