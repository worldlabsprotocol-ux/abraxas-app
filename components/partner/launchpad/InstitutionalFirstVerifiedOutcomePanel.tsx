"use client";
// FILE: components/partner/launchpad/InstitutionalFirstVerifiedOutcomePanel.tsx

import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import type { InstitutionalFirstVerifiedOutcomeView } from "@/lib/partner/launchpad/institutionalFirstVerifiedOutcome";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const inlineCode: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.72rem",
  padding: "0.1rem 0.3rem",
  borderRadius: 6,
  background: "var(--surface-inset)",
  border: "1px solid var(--border)",
};

function resultColor(result: InstitutionalFirstVerifiedOutcomeView["verification"]["result"]): string {
  if (result === "authorized") return "#10B981";
  if (result === "rejected") return "#F87171";
  return "var(--text-primary)";
}

export function InstitutionalFirstVerifiedOutcomePanel(input: {
  outcome: InstitutionalFirstVerifiedOutcomeView;
  embedded?: boolean;
}) {
  const { outcome, embedded = false } = input;
  const ttfv =
    outcome.adoption.time_to_first_independent_verify_quality === "measured"
    && outcome.adoption.time_to_first_independent_verify_ms != null
      ? `${Math.round(outcome.adoption.time_to_first_independent_verify_ms / 1000)}s from application create to first verified receipt`
      : "Unavailable until independent verification is recorded with authoritative timestamps.";

  const body = (
    <>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.55, marginTop: 0 }}>
        {outcome.verification.status_accuracy_notice}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.65rem",
          marginTop: "0.85rem",
        }}
      >
        <Field label="Application" value={`${outcome.application.display_name} (${outcome.application.environment})`} />
        <Field label="Partner scope" value={outcome.application.partner_id} mono />
        <Field label="Policy" value={
          outcome.policy.policy_id
            ? `${outcome.policy.policy_id}${outcome.policy.policy_version != null ? ` v${outcome.policy.policy_version}` : ""}`
            : "—"
        } mono />
        <Field
          label="Verification result"
          value={outcome.verification.result}
          color={resultColor(outcome.verification.result)}
        />
        <Field
          label="Independent verify recorded"
          value={outcome.verification.independent_verification_recorded ? "Yes (telemetry)" : "Not yet"}
        />
        <Field label="Time to first verify" value={ttfv} />
        {outcome.consumption.replay_signal ? (
          <Field label="Replay signal" value={outcome.consumption.replay_signal} mono />
        ) : null}
      </div>

      {(outcome.receipt_provenance.receipt_id || outcome.receipt_provenance.request_id) && (
        <div style={{ marginTop: "0.85rem", fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <div>
            Receipt ID{" "}
            <code style={inlineCode}>{outcome.receipt_provenance.receipt_id ?? "—"}</code>
            {" · "}
            Request ID <code style={inlineCode}>{outcome.receipt_provenance.request_id ?? "—"}</code>
          </div>
          {outcome.receipt_provenance.last_event_at && (
            <div style={{ marginTop: "0.35rem" }}>
              Last verification event{" "}
              <code style={inlineCode}>{outcome.receipt_provenance.source_event_type ?? "—"}</code>
              {" at "}
              <code style={inlineCode}>{outcome.receipt_provenance.last_event_at}</code>
            </div>
          )}
        </div>
      )}

      {outcome.verification.partner_safe_rejection && (
        <p
          role="alert"
          style={{
            fontFamily: FONT,
            fontSize: "0.78rem",
            color: "#FCA5A5",
            marginTop: "0.75rem",
            lineHeight: 1.5,
          }}
        >
          Partner-safe rejection:{" "}
          <code style={inlineCode}>{outcome.verification.partner_safe_rejection}</code>
        </p>
      )}

      <div style={{ marginTop: "0.85rem", fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        <div>
          Issuer trust digest{" "}
          <code style={inlineCode}>{outcome.issuer_trust.receipt_key_document_digest ?? "unavailable in this deployment"}</code>
        </div>
        <p style={{ margin: "0.5rem 0 0" }}>{outcome.issuer_trust.offline_verifier_notice}</p>
        <p style={{ margin: "0.5rem 0 0" }}>{outcome.freshness.requirement_notice}</p>
      </div>

      <pre
        className="abx-code-scroll"
        style={{
          fontFamily: MONO,
          fontSize: "0.62rem",
          lineHeight: 1.55,
          padding: "0.75rem",
          borderRadius: 10,
          overflowX: "auto",
          background: "var(--surface-inset)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          marginTop: "0.75rem",
        }}
      >
        {outcome.reproduce_independently.external_consumer_command}
      </pre>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.45rem" }}>
        {outcome.evidence.export_notice}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
        <Btn href={outcome.reproduce_independently.sdk_docs_href} size="sm" variant="secondary">
          SDK verifier docs
        </Btn>
        {outcome.evidence.integration_export_href ? (
          <Btn href={outcome.evidence.integration_export_href} size="sm" variant="ghost">
            Download integration export
          </Btn>
        ) : null}
        <Btn href={outcome.issuer_trust.trust_contract_href} size="sm" variant="ghost">
          Trust contract JSON
        </Btn>
        <Link href={outcome.reproduce_independently.record_verifier_href} style={{ alignSelf: "center", fontSize: "0.74rem", color: "var(--accent)" }}>
          Record verifier (inspect only)
        </Link>
      </div>

      {outcome.status === "none" && (
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
          No server-side verification event recorded yet. Complete hosted verification and verify the receipt on your backend.
        </p>
      )}

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.75rem", lineHeight: 1.5 }}>
        {outcome.production_authorization.detail}{" "}
        <Link href={outcome.production_authorization.next_action_href} style={{ color: "var(--accent)" }}>
          Production authorization path →
        </Link>
      </p>
    </>
  );

  if (embedded) {
    return (
      <div
        style={{
          padding: "0.85rem",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--surface-inset)",
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          First verified sandbox decision
        </div>
        {body}
      </div>
    );
  }

  return <ContentCard title="First verified sandbox decision">{body}</ContentCard>;
}

function Field(input: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div>
      <div style={{ fontFamily: FONT, fontSize: "0.65rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        {input.label}
      </div>
      <div
        style={{
          fontFamily: input.mono ? MONO : FONT,
          fontSize: input.mono ? "0.72rem" : "0.82rem",
          fontWeight: 700,
          color: input.color ?? "var(--text-primary)",
          marginTop: "0.2rem",
          lineHeight: 1.35,
          wordBreak: "break-word",
        }}
      >
        {input.value}
      </div>
    </div>
  );
}
