"use client";
// FILE: components/partner/PartnerSandboxIntegrationPanel.tsx
// Dual-track sandbox integration checklist for external design partners.

import { useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { PartnerWebhookSandboxPanel } from "@/components/partner/PartnerWebhookSandboxPanel";
import type { PartnerDashboardReadiness } from "@/lib/partner/partnerPortalReadiness";
import {
  PARTNER_SANDBOX_INTEGRATION_HEADLINE,
  PARTNER_SANDBOX_INTEGRATION_SUMMARY,
  PARTNER_FLOW_TRACK_MILESTONES,
  WEBHOOK_TRACK_MILESTONES,
  SANDBOX_RECEIPT_CHECKS,
  SANDBOX_RECEIPT_PRODUCTION_WARNING,
  WEBHOOK_TEST_NOT_RECEIPT_API_NOTE,
  PARTNER_FLOW_ENTRY_PLACEHOLDER_NOTE,
  buildSandboxEntryUrlFields,
  partnerHasWebhooksReadScope,
} from "@/lib/partner/partnerSandboxIntegrationKit";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";
const WARN = "#F59E0B";

interface PartnerSandboxIntegrationPanelProps {
  apiKey: string;
  partnerId: string;
  scopes: readonly string[];
  readiness: PartnerDashboardReadiness;
}

export function PartnerSandboxIntegrationPanel({
  apiKey,
  partnerId,
  scopes,
  readiness,
}: PartnerSandboxIntegrationPanelProps) {
  const [signatureVerifiedAck, setSignatureVerifiedAck] = useState(false);
  const hasWebhooksScope = partnerHasWebhooksReadScope(scopes);
  const entryFields = buildSandboxEntryUrlFields({
    partnerId,
    activePolicyId: readiness.active_policy_id,
  });

  return (
    <>
      <ContentCard title={PARTNER_SANDBOX_INTEGRATION_HEADLINE}>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.85rem" }}>
          {PARTNER_SANDBOX_INTEGRATION_SUMMARY}
        </p>

        {readiness.partner_flow_config_ready && (
          <p
            data-testid="partner-flow-config-ready"
            style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, fontWeight: 700, margin: "0 0 0.75rem" }}
          >
            Operator provisioning complete — you may start a Partner Flow sandbox test. This does not confirm callback or receipt success.
          </p>
        )}

        <div
          data-testid="partner-flow-track"
          style={{
            padding: "0.75rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
            marginBottom: "0.85rem",
          }}
        >
          <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Track A — Partner Flow
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: WARN, lineHeight: 1.55, margin: "0 0 0.65rem", fontWeight: 600 }}>
            {PARTNER_FLOW_ENTRY_PLACEHOLDER_NOTE}
          </p>

          {readiness.active_policy_ambiguous && (
            <p
              data-testid="policy-ambiguous-warning"
              style={{ fontFamily: FONT, fontSize: "0.72rem", color: WARN, fontWeight: 600, margin: "0 0 0.65rem" }}
            >
              Multiple active versions found for your assigned policy family. Contact Abraxas ops before testing.
            </p>
          )}

          <div
            data-testid="entry-url-fields"
            style={{ display: "grid", gap: "0.45rem", marginBottom: "0.65rem" }}
          >
            {([
              ["partner_id", entryFields.partner_id],
              ["policy_id", entryFields.policy_id],
              ["return_url", entryFields.return_url],
            ] as const).map(([label, value]) => (
              <div
                key={label}
                data-testid={`entry-field-${label}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(72px, 88px) minmax(0, 1fr)",
                  gap: "0.5rem",
                  alignItems: "start",
                  padding: "0.45rem 0.55rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface-inset)",
                }}
              >
                <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)" }}>
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: "0.62rem",
                    lineHeight: 1.5,
                    color: "var(--text-secondary)",
                    wordBreak: "break-all",
                    minWidth: 0,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {readiness.callback_allowlist_configured && (
            <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", margin: "0 0 0.65rem" }}>
              Callback allowlist is configured. Abraxas ops will provide your exact return_url out-of-band.
            </p>
          )}

          <div style={{ display: "grid", gap: "0.4rem", marginBottom: "0.65rem" }}>
            {PARTNER_FLOW_TRACK_MILESTONES.map((milestone) => (
              <div key={milestone.id} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--text-primary)" }}>{milestone.title}</strong>
                {" — "}
                {milestone.description}
              </div>
            ))}
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Sandbox receipt checks
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {SANDBOX_RECEIPT_CHECKS.map((check) => (
                <li key={check.check} style={{ marginBottom: "0.2rem" }}>
                  {check.check} — {check.why}
                </li>
              ))}
            </ul>
            <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: WARN, margin: "0.5rem 0 0", fontWeight: 600 }}>
              {SANDBOX_RECEIPT_PRODUCTION_WARNING}
            </p>
          </div>
          <Link
            href="/verify?mode=receipt"
            style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, fontWeight: 600, textDecoration: "none" }}
          >
            Open receipt tester (public mirror) →
          </Link>
        </div>

        <div
          data-testid="webhook-track"
          style={{
            padding: "0.75rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Track B — Webhooks (optional)
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 0.5rem" }}>
            {WEBHOOK_TEST_NOT_RECEIPT_API_NOTE}
          </p>

          {!hasWebhooksScope ? (
            <div
              data-testid="webhook-track-blocked"
              style={{
                padding: "0.65rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-inset)",
              }}
            >
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.35rem" }}>
                Your API key does not include <code style={{ fontFamily: MONO, fontSize: "0.65rem" }}>webhooks:read</code>.
                This track is optional and blocked until Abraxas ops issues a key with the webhook preset.
              </p>
              <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>
                Default promote keys include verify:credential and verify:registry only — webhook scope is a separate operator step.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: "0.35rem", marginBottom: "0.65rem" }}>
                {WEBHOOK_TRACK_MILESTONES.map((milestone) => (
                  <div key={milestone.id} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--text-primary)" }}>{milestone.title}</strong>
                    {" — "}
                    {milestone.description}
                  </div>
                ))}
              </div>
              <label
                data-testid="signature-verified-ack"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  padding: "0.6rem",
                  borderRadius: 8,
                  border: `1px solid ${signatureVerifiedAck ? "rgba(16,185,129,0.35)" : "var(--border)"}`,
                  background: signatureVerifiedAck ? "rgba(16,185,129,0.06)" : "transparent",
                  cursor: "pointer",
                  marginBottom: "0.65rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={signatureVerifiedAck}
                  onChange={(e) => setSignatureVerifiedAck(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  I confirm my receiver validated the Abraxas webhook signature for a sandbox test event.
                  Abraxas does not infer this from delivery history.
                </span>
              </label>
            </>
          )}
        </div>
      </ContentCard>

      {hasWebhooksScope && (
        <PartnerWebhookSandboxPanel
          apiKey={apiKey}
          enabled
          signatureVerifiedAcknowledged={signatureVerifiedAck}
        />
      )}
    </>
  );
}
