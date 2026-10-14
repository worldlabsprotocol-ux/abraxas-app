"use client";

import type { CSSProperties, ReactNode } from "react";
import { ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

export type ReceiptAuthorizationOutcome = "PERMIT" | "DENY" | "REVIEW";

export type ReceiptInspectorField = {
  label: string;
  value: string;
  mono?: boolean;
};

export interface ReceiptInspectorProps {
  title?: string;
  outcome: ReceiptAuthorizationOutcome;
  /** Cryptographic signature check — independent of current authorization */
  signatureValid: boolean;
  /** Current policy authorization after freshness / revocation */
  currentlyAuthorized: boolean;
  /** Validity window (not expired) — separate from signature */
  validityWindowOk?: boolean;
  /** Revocation registry clear */
  revocationClear?: boolean;
  /** Independent verifier reachable */
  verifierReachable?: boolean;
  fields: ReceiptInspectorField[];
  footer?: ReactNode;
  simulationBadge?: string;
  onRevokeSimulation?: () => void;
  revokeSimulationLabel?: string;
}

const OUTCOME_COLOR: Record<ReceiptAuthorizationOutcome, string> = {
  PERMIT: "var(--abx-verify-green, #4CBB92)",
  DENY: "#E57373",
  REVIEW: "#D4A574",
};

export function ReceiptInspector({
  title = "Decision receipt",
  outcome,
  signatureValid,
  currentlyAuthorized,
  validityWindowOk = currentlyAuthorized,
  revocationClear = currentlyAuthorized,
  verifierReachable = true,
  fields,
  footer,
  simulationBadge,
  onRevokeSimulation,
  revokeSimulationLabel = "Simulate evidence revocation",
}: ReceiptInspectorProps) {
  const dominant = currentlyAuthorized && outcome === "PERMIT" ? "PERMIT" : outcome === "REVIEW" ? "REVIEW" : "DENY";

  return (
    <article className="abx-receipt-inspector" aria-labelledby="abx-receipt-inspector-title">
      <header className="abx-receipt-inspector__head">
        <div>
          <p className="abx-receipt-inspector__eyebrow">Signed decision receipt</p>
          <h3 id="abx-receipt-inspector-title" className="abx-receipt-inspector__title">
            {title}
          </h3>
        </div>
        <div
          className="abx-receipt-inspector__outcome"
          role="status"
          aria-live="polite"
          style={{ color: OUTCOME_COLOR[dominant], borderColor: OUTCOME_COLOR[dominant] }}
        >
          {dominant}
        </div>
      </header>

      {simulationBadge ? (
        <p className="abx-receipt-inspector__sim" role="note">
          {simulationBadge}
        </p>
      ) : null}

      <dl className="abx-receipt-inspector__grid">
        {fields.map((row) => (
          <div key={row.label} className="abx-receipt-inspector__row">
            <dt>{row.label}</dt>
            <dd style={row.mono ? monoStyle : undefined}>{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="abx-receipt-inspector__checks" aria-label="Verification checks">
        <CheckRow
          label="Signed"
          status={signatureValid ? "pass" : verifierReachable ? "fail" : "unknown"}
          detail="Issuer signature verifies — does not imply authorization alone"
        />
        <CheckRow
          label="Validity window"
          status={
            verifierReachable ? (validityWindowOk ? "pass" : "fail") : "unknown"
          }
          detail="Not expired; time-bound eligibility"
        />
        <CheckRow
          label="Revocation clear"
          status={verifierReachable ? (revocationClear ? "pass" : "fail") : "unknown"}
          detail="Registry / policy revocation signal"
        />
        <CheckRow
          label="Verifier available"
          status={verifierReachable ? "pass" : "unknown"}
          detail="Independent verify path reachable"
        />
        <CheckRow
          label="Authorized now"
          status={
            !verifierReachable
              ? "unknown"
              : currentlyAuthorized
                ? "pass"
                : "fail"
          }
          detail="Combined policy decision after all checks — may DENY while signature remains valid"
        />
      </div>

      {onRevokeSimulation ? (
        <button type="button" className="abx-receipt-inspector__revoke" onClick={onRevokeSimulation}>
          {revokeSimulationLabel}
        </button>
      ) : null}

      {footer ? <footer className="abx-receipt-inspector__footer">{footer}</footer> : null}
    </article>
  );
}

type CheckRowStatus = "pass" | "fail" | "unknown";

function CheckRow({ label, status, detail }: { label: string; status: CheckRowStatus; detail: string }) {
  const icon = status === "pass" ? "✓" : status === "fail" ? "✕" : "?";
  const color =
    status === "pass"
      ? "var(--abx-verify-green, #4CBB92)"
      : status === "fail"
        ? "#E57373"
        : "#D4A574";
  return (
    <div className="abx-receipt-inspector__check" style={{ fontFamily: FONT }}>
      <span className="abx-receipt-inspector__check-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <strong style={{ color }}>{label}</strong>
        <p style={{ margin: "0.15rem 0 0", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
          {detail}
        </p>
      </div>
    </div>
  );
}

const monoStyle: CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.72rem",
  wordBreak: "break-all",
};
