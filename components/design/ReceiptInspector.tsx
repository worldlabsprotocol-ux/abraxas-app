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
        <CheckRow label="Signature valid" ok={signatureValid} detail="Cryptographic verification of issuer signature" />
        <CheckRow
          label="Currently authorized"
          ok={currentlyAuthorized}
          detail="Freshness, issuer state, and revocation — distinct from signature validity"
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

function CheckRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="abx-receipt-inspector__check" style={{ fontFamily: FONT }}>
      <span className="abx-receipt-inspector__check-icon" aria-hidden="true">
        {ok ? "✓" : "✕"}
      </span>
      <div>
        <strong style={{ color: ok ? "var(--abx-verify-green, #4CBB92)" : "#E57373" }}>{label}</strong>
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
