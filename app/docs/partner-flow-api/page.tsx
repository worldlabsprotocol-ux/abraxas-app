"use client";
// FILE: app/docs/partner-flow-api/page.tsx
// Partner Flow OpenAPI contract — machine-readable API reference for external integrators.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  PARTNER_FLOW_OPENAPI_CANONICAL_URL,
  PARTNER_FLOW_OPENAPI_PUBLIC_PATH,
  PARTNER_FLOW_DOCUMENTED_OPERATIONS,
  PARTNER_FLOW_EXCLUDED_OPERATIONS,
  PARTNER_FLOW_RECEIPT_VALIDATION_RULES,
  PARTNER_FLOW_PUBLIC_RECEIPT_CURL_EXAMPLE,
  PARTNER_FLOW_PUBLIC_RECEIPT_JS_EXAMPLE,
} from "@/lib/partner/partnerFlowOpenApiContract";
import { PARTNER_FLOW_CALLBACK_PII_NOTE } from "@/lib/partner/partnerFlowIntegratorKit";
import {
  PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH,
  PARTNER_FLOW_COMPATIBILITY_VERSION,
} from "@/lib/protocol/partnerFlowCompatibilityManifest";
import { SITE_URL } from "@/lib/siteUrl";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

const pre: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.68rem",
  color: "var(--text-secondary)",
  overflow: "auto",
  margin: 0,
  padding: "0.75rem",
  borderRadius: 10,
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

export default function PartnerFlowApiDocsPage() {
  const browserOps = PARTNER_FLOW_DOCUMENTED_OPERATIONS.filter(
    (op) => op.category === "browser_entry" || op.category === "browser_session",
  );
  const passportOps = PARTNER_FLOW_DOCUMENTED_OPERATIONS.filter(
    (op) => op.category === "passport_handoff",
  );
  const publicOps = PARTNER_FLOW_DOCUMENTED_OPERATIONS.filter(
    (op) => op.category === "public_receipt",
  );

  return (
    <RedesignPage maxWidth={920}>
      <PageHeader
        eyebrow="Integrators · Partner Flow API"
        title="Partner Flow OpenAPI contract"
        subtitle="Machine-readable specification for browser-redirect Partner Flow — evaluate, Passport handoff, complete, refresh, and public receipt verification."
      />

      <p style={{ ...body, marginBottom: "1.25rem" }}>
        OpenAPI 3.1 spec:{" "}
        <a href={PARTNER_FLOW_OPENAPI_PUBLIC_PATH} style={{ color: "var(--accent)" }}>
          {PARTNER_FLOW_OPENAPI_CANONICAL_URL}
        </a>
        . Compatibility manifest v{PARTNER_FLOW_COMPATIBILITY_VERSION}:{" "}
        <a href={PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH} style={{ color: "var(--accent)" }}>
          {SITE_URL}{PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH}
        </a>
        . Narrative guide:{" "}
        <Link href="/docs/partner-flow" style={{ color: "var(--accent)" }}>
          Partner Flow integrator kit
        </Link>
        .
      </p>

      <ContentCard title="Auth boundaries">
        <BulletList
          items={[
            "Browser entry & session — holder on abraxasworld.xyz; `abraxas_browser_session` cookie; no partner API key in client code.",
            "Passport handoff — same browser session during first-time ID verification (`next=passport`).",
            "Public receipt — partner backend fetches `GET /api/receipts/{receiptId}/public` (no auth, CORS enabled).",
            "Server-to-server API-key routes are intentionally excluded from this contract (see below).",
          ]}
        />
      </ContentCard>

      <ContentCard title="Documented operations">
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          <strong>Browser entry & session</strong>
        </p>
        <BulletList items={browserOps.map((op) => `${op.method} ${op.path} — ${op.summary}`)} />
        <p style={{ ...body, margin: "1rem 0 0.75rem" }}>
          <strong>Passport & consent handoff</strong>
        </p>
        <BulletList items={passportOps.map((op) => `${op.method} ${op.path} — ${op.summary}`)} />
        <p style={{ ...body, margin: "1rem 0 0.75rem" }}>
          <strong>Public receipt verification</strong>
        </p>
        <BulletList items={publicOps.map((op) => `${op.method} ${op.path} — ${op.summary}`)} />
      </ContentCard>

      <ContentCard title="Callback parameters (no PII)">
        <p style={body}>{PARTNER_FLOW_CALLBACK_PII_NOTE}</p>
      </ContentCard>

      <ContentCard title="Receipt verification (fail closed)">
        <BulletList
          items={PARTNER_FLOW_RECEIPT_VALIDATION_RULES.map(
            (r) => `${r.field}: ${r.rule}`,
          )}
        />
        <p style={{ ...body, marginTop: "0.75rem", fontSize: "0.76rem" }}>
          Sandbox policies: set explicit <code style={{ fontFamily: MONO }}>allowSandbox: true</code>{" "}
          only for pilot testing — never in production gates.
        </p>
      </ContentCard>

      <ContentCard title="Example — fetch public receipt (curl)">
        <pre style={pre}>{PARTNER_FLOW_PUBLIC_RECEIPT_CURL_EXAMPLE}</pre>
      </ContentCard>

      <ContentCard title="Example — verify receipt (JavaScript, server-side)">
        <pre style={pre}>{PARTNER_FLOW_PUBLIC_RECEIPT_JS_EXAMPLE}</pre>
      </ContentCard>

      <ContentCard title="Intentionally excluded (private / other integration paths)">
        <BulletList
          items={PARTNER_FLOW_EXCLUDED_OPERATIONS.map(
            (op) => `${op.method} ${op.path} — ${op.reason}`,
          )}
        />
      </ContentCard>

      <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Btn href={PARTNER_FLOW_OPENAPI_PUBLIC_PATH} variant="primary">
          Download OpenAPI YAML
        </Btn>
        <Btn href="/docs/partner-flow" variant="secondary">
          Partner Flow guide
        </Btn>
        <Btn href="/docs" variant="secondary">
          Docs hub
        </Btn>
      </div>
    </RedesignPage>
  );
}
