"use client";
// FILE: components/admin/DesignPartnerPromoteReadinessPanel.tsx
// Operator guidance for approved design-partner applications before sandbox promotion.

import Link from "next/link";
import type { PartnerIdPromoteEvaluation } from "@/lib/admin/designPartnerPromoteReadiness";
import {
  PARTNER_ID_FORMAT_HINT,
  PROMOTE_HANDOFF_SESSION_COPY,
  PROMOTE_PRODUCTION_SEPARATION_COPY,
  PROMOTE_READINESS_ATTESTATION_COPY,
  PROMOTE_READINESS_DOC_PATH,
  PROMOTE_READINESS_LINKS,
  PROMOTE_READINESS_PREREQUISITES,
  PROMOTE_SANDBOX_KEY_COPY,
} from "@/lib/admin/designPartnerPromoteReadiness";

const FONT = "'Inter',system-ui,sans-serif";
const WARN = "#F59E0B";

const headingId = "design-partner-promote-readiness-heading";

export function DesignPartnerPromoteReadinessPanel({
  partnerIdEvaluation,
}: {
  partnerIdEvaluation: PartnerIdPromoteEvaluation;
}) {
  const validationId = "design-partner-promote-readiness-partner-id-validation";

  return (
    <section
      role="region"
      aria-labelledby={headingId}
      data-testid="design-partner-promote-readiness-panel"
      style={{
        marginTop: "0.25rem",
        paddingTop: "0.65rem",
        borderTop: "1px solid var(--border)",
        display: "grid",
        gap: "0.55rem",
      }}
    >
      <div id={headingId} style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700 }}>
        Promotion readiness
      </div>

      <p
        data-testid="design-partner-promote-readiness-attestation"
        style={{ fontFamily: FONT, fontSize: "0.68rem", color: WARN, margin: 0, fontWeight: 600, lineHeight: 1.5 }}
      >
        {PROMOTE_READINESS_ATTESTATION_COPY}
      </p>

      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
        {PROMOTE_SANDBOX_KEY_COPY} {PROMOTE_PRODUCTION_SEPARATION_COPY}
      </p>

      <ul
        style={{
          margin: 0,
          paddingLeft: "1.1rem",
          fontFamily: FONT,
          fontSize: "0.72rem",
          color: "var(--text-secondary)",
          lineHeight: 1.55,
        }}
      >
        {PROMOTE_READINESS_PREREQUISITES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
        <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>partner_id format check</div>
        <div data-testid="design-partner-promote-readiness-partner-id" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem" }}>
          {partnerIdEvaluation.normalized || "—"}
        </div>
        <p
          id={validationId}
          data-testid="design-partner-promote-readiness-partner-id-message"
          style={{
            margin: "0.35rem 0 0",
            color: partnerIdEvaluation.formatValid ? "var(--text-muted)" : WARN,
            fontWeight: partnerIdEvaluation.formatValid ? 400 : 600,
          }}
        >
          {partnerIdEvaluation.message ?? PARTNER_ID_FORMAT_HINT}
        </p>
      </div>

      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
        {PROMOTE_HANDOFF_SESSION_COPY}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
        <Link href={PROMOTE_READINESS_LINKS.sandboxDocs} data-testid="promote-readiness-link-sandbox-docs" style={linkStyle}>
          Sandbox pilot guide
        </Link>
        <Link href={PROMOTE_READINESS_LINKS.partnersAdmin} data-testid="promote-readiness-link-partners-admin" style={linkStyle}>
          Partner admin
        </Link>
        <Link href={PROMOTE_READINESS_LINKS.productionActivation} data-testid="promote-readiness-link-production" style={linkStyle}>
          Production activation
        </Link>
      </div>

      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
        Runbook: <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem" }}>{PROMOTE_READINESS_DOC_PATH}</code>
      </p>
    </section>
  );
}

const linkStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.72rem",
  color: "var(--accent)",
  fontWeight: 700,
  textDecoration: "none",
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
};
