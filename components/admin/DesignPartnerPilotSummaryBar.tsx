"use client";
// FILE: components/admin/DesignPartnerPilotSummaryBar.tsx
// Compact promoted-pilot status summary with honest deep links.

import Link from "next/link";
import type { DesignPartnerPilotSummaryDto } from "@/lib/admin/designPartnerPilotSummary";
import { PILOT_SUMMARY_BLOCKER_COPY } from "@/lib/admin/designPartnerPilotSummary";
import { buildAdminPartnersHref, parseAdminPartnerIdQuery } from "@/lib/admin/adminPartnerDeepLink";

const FONT = "'Inter',system-ui,sans-serif";
const WARN = "#F59E0B";
const ACCENT = "#10B981";

const PHASE_LABELS: Record<DesignPartnerPilotSummaryDto["phase"], string> = {
  sandbox_provisioning: "Sandbox provisioning",
  sandbox_testing: "Sandbox testing",
  awaiting_manual_signoff: "Awaiting manual sign-off",
  sandbox_continuation_approved: "Sandbox continuation approved",
};

interface DesignPartnerPilotSummaryBarProps {
  summary: DesignPartnerPilotSummaryDto;
}

export function DesignPartnerPilotSummaryBar({ summary }: DesignPartnerPilotSummaryBarProps) {
  const productionLabel = summary.technical.production_environment_active
    ? "Production environment active."
    : "Production environment not active.";

  const partnerId = parseAdminPartnerIdQuery(summary.promoted_partner_id);
  const observabilityHref = buildAdminPartnersHref({ tab: "observability", partnerId });
  const sandboxReceiptsHref = buildAdminPartnersHref({ tab: "sandbox-receipts", partnerId });

  return (
    <section
      aria-label="Pilot execution summary"
      data-testid="pilot-summary-bar"
      style={{ display: "grid", gap: "0.55rem" }}
    >
      <div style={{ fontFamily: FONT, fontSize: "0.74rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
        <span data-testid="pilot-phase">Phase: {PHASE_LABELS[summary.phase]}</span>
        {" · "}
        <span>
          Provisioning: {summary.technical.provisioning_ready ? "ready" : "not ready"}
        </span>
        {" · "}
        <span data-testid="pilot-signoff-progress">
          Sign-off: {summary.signoff_progress.main_gates_acknowledged}/{summary.signoff_progress.main_gates_total} main gates
        </span>
        {summary.signoff_progress.webhook_track_total !== null && (
          <>
            {" · "}
            <span data-testid="pilot-webhook-signoff-progress">
              Webhook track: {summary.signoff_progress.webhook_track_acknowledged}/{summary.signoff_progress.webhook_track_total}
            </span>
          </>
        )}
      </div>

      <p
        data-testid="pilot-production-state"
        style={{ fontFamily: FONT, fontSize: "0.72rem", color: WARN, margin: 0, fontWeight: 600 }}
      >
        {productionLabel}
      </p>

      {summary.technical.webhook_configured.availability === "available" && (
        <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>
          Webhook endpoint configured: {summary.technical.webhook_configured.value ? "yes" : "no"}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
        <Link href={summary.links.onboarding} data-testid="pilot-link-onboarding" style={linkStyle}>
          Open onboarding
        </Link>
        <a href={summary.links.signoff} data-testid="pilot-link-signoff" style={linkStyle}>
          Sign-off
        </a>
        <Link href={observabilityHref} data-testid="pilot-link-observability" style={linkStyle}>
          Delivery observability
        </Link>
        <Link href={sandboxReceiptsHref} data-testid="pilot-link-sandbox-receipts" style={linkStyle}>
          Sandbox receipts
        </Link>
        <Link href={summary.links.production_activation} data-testid="pilot-link-production" style={linkStyle}>
          Production activation
        </Link>
      </div>

      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
        Delivery observability and sandbox receipts open the correct tab with partner ID prefilled — click Load to fetch data. Production activation is a separate manual workflow and is not implied by sandbox progress.
      </p>

      {summary.blocker_codes.length > 0 && (
        <ul
          data-testid="pilot-blockers"
          style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}
        >
          {summary.blocker_codes.map((code) => (
            <li key={code}>{PILOT_SUMMARY_BLOCKER_COPY[code]}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

const linkStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.72rem",
  color: ACCENT,
  fontWeight: 700,
  textDecoration: "none",
};
