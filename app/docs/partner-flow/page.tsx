"use client";
// FILE: app/docs/partner-flow/page.tsx
// Partner Flow integrator guide — browser redirect + public receipt verification.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PartnerFlowDocToc, PartnerFlowStartHereCard } from "@/components/docs/PartnerFlowDocToc";
import {
  PARTNER_FLOW_HEADLINE,
  PARTNER_FLOW_SUMMARY,
  PARTNER_FLOW_CANONICAL_HOST,
  INTEGRATION_PATH_DECISION_TREE,
  PARTNER_FLOW_ENTRY_PARAMS,
  PARTNER_FLOW_LIFECYCLE,
  PARTNER_FLOW_CALLBACK_PARAMS,
  PARTNER_FLOW_CALLBACK_PII_NOTE,
  PARTNER_FLOW_RECEIPT_CHECKS,
  PARTNER_FLOW_ERROR_TABLE,
  PARTNER_FLOW_AUTH_BOUNDARY,
  PARTNER_FLOW_REDIRECT_EXAMPLE,
  PARTNER_FLOW_CALLBACK_VERIFY_EXAMPLE,
  buildPartnerFlowEntryUrl,
} from "@/lib/partner/partnerFlowIntegratorKit";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

function SectionCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} style={{ scrollMarginTop: 96 }}>
      <ContentCard title={title}>{children}</ContentCard>
    </div>
  );
}

export default function PartnerFlowDocsPage() {
  const sampleUrl = buildPartnerFlowEntryUrl({
    partnerId: "your-partner-id",
    policyId: "your-policy-v1",
    returnUrl: "https://your-app.example.com/auth/abraxas/callback",
  });

  return (
    <RedesignPage maxWidth={1100}>
      <PageHeader
        eyebrow="Integrators · Partner Flow"
        title={PARTNER_FLOW_HEADLINE}
        subtitle={PARTNER_FLOW_SUMMARY}
      />

      <p style={{ ...body, marginBottom: "1.25rem" }}>
        Canonical production host:{" "}
        <code style={{ fontFamily: MONO, fontSize: "0.75rem" }}>{PARTNER_FLOW_CANONICAL_HOST}</code>
        {" · "}
        <Link href="/verify?mode=receipt" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
          Open receipt tester →
        </Link>
      </p>

      <div
        className="partner-flow-doc-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(180px, 220px) minmax(0, 1fr)",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        <PartnerFlowDocToc />

        <div>
          <PartnerFlowStartHereCard />

          <SectionCard id="choose-path" title="Choose your integration path">
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {INTEGRATION_PATH_DECISION_TREE.map((row) => (
                <div
                  key={row.path}
                  style={{
                    padding: "0.85rem",
                    borderRadius: 12,
                    background: row.path.startsWith("Partner Flow") ? `${ACCENT}10` : "var(--surface)",
                    border: `1px solid ${row.path.startsWith("Partner Flow") ? `${ACCENT}44` : "var(--border)"}`,
                  }}
                >
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.88rem", marginBottom: 6 }}>
                    {row.path}
                  </div>
                  <p style={body}>{row.when}</p>
                  <p style={{ ...body, fontSize: "0.76rem" }}>
                    <strong>Auth:</strong> {row.auth}
                  </p>
                  <p style={{ ...body, fontSize: "0.76rem" }}>
                    <strong>Start:</strong>{" "}
                    <code style={{ fontFamily: MONO, fontSize: "0.68rem", wordBreak: "break-all" }}>{row.start}</code>
                  </p>
                  <p style={{ ...body, fontSize: "0.76rem" }}>
                    <strong>Verify:</strong> {row.verify}
                  </p>
                  {"docs" in row && row.docs && (
                    <Link href={row.docs} style={{ fontFamily: FONT, fontSize: "0.76rem", color: ACCENT }}>
                      Read more →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard id="entry-url" title="Partner Flow entry URL">
            <p style={body}>
              Redirect the holder to <code style={{ fontFamily: MONO }}>/partner/verify</code> on the canonical host.
              All query parameters are required unless noted.
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", margin: "0.75rem 0", fontFamily: FONT, fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "0.4rem" }}>Parameter</th>
                  <th style={{ textAlign: "left", padding: "0.4rem" }}>Required</th>
                  <th style={{ textAlign: "left", padding: "0.4rem" }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {PARTNER_FLOW_ENTRY_PARAMS.map((p) => (
                  <tr key={p.name} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.4rem", fontFamily: MONO }}>{p.name}</td>
                    <td style={{ padding: "0.4rem" }}>{p.required ? "Yes" : "No"}</td>
                    <td style={{ padding: "0.4rem", color: "var(--text-secondary)" }}>{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <pre style={{
              fontFamily: MONO, fontSize: "0.68rem", lineHeight: 1.55,
              padding: "0.85rem", borderRadius: 10, overflow: "auto",
              background: "var(--surface-inset)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", margin: 0,
            }}>
              {sampleUrl}
            </pre>
            <p style={{ ...body, marginTop: "0.75rem", color: "#F59E0B" }}>
              Your <code style={{ fontFamily: MONO }}>return_url</code> must be explicitly allowlisted in{" "}
              <code style={{ fontFamily: MONO }}>partners.allowed_return_urls</code>. Unconfigured partners fail closed.
            </p>
          </SectionCard>

          <SectionCard id="lifecycle" title="Lifecycle: evaluate → Passport → complete / refresh">
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {PARTNER_FLOW_LIFECYCLE.map((step) => (
                <div key={step.step} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: `${ACCENT}18`,
                    border: `1px solid ${ACCENT}44`, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: MONO, fontSize: "0.7rem", fontWeight: 800, color: ACCENT,
                  }}>
                    {step.step}
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.85rem" }}>{step.title}</div>
                    <p style={body}>{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <BulletList
              items={[
                "next=authenticate — holder must sign in",
                "next=passport — ID + biometric required",
                "next=enter — approved; redirect with receipt",
                "next=denied — policy denial",
                "next=pending_review — manual review queue",
              ]}
            />
          </SectionCard>

          <SectionCard id="callback" title="Callback query parameters (frozen — no PII)">
            <p style={body}>{PARTNER_FLOW_CALLBACK_PII_NOTE}</p>
            <BulletList items={[...PARTNER_FLOW_CALLBACK_PARAMS]} />
          </SectionCard>

          <SectionCard id="receipt-verification" title="Receipt verification (server-side)">
            <p style={body}>
              Fetch <code style={{ fontFamily: MONO }}>GET /api/receipts/{"{receipt_id}"}/public</code> from your backend.
              No API key required. Never trust callback URL parameters alone.
            </p>
            <BulletList items={PARTNER_FLOW_RECEIPT_CHECKS.map((c) => `${c.check} — ${c.why}`)} />
            <pre style={{
              fontFamily: MONO, fontSize: "0.68rem", lineHeight: 1.55,
              padding: "0.85rem", borderRadius: 10, overflow: "auto", marginTop: "0.75rem",
              background: "var(--surface-inset)", border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}>
              {PARTNER_FLOW_CALLBACK_VERIFY_EXAMPLE}
            </pre>
            <div style={{ marginTop: "0.75rem" }}>
              <Btn href="/verify?mode=receipt" size="sm">Test receipt in public verifier</Btn>
            </div>
          </SectionCard>

          <SectionCard id="auth-boundary" title="Browser session vs server API key">
            <p style={{ ...body, marginBottom: "0.5rem" }}><strong>Browser session only</strong> (httpOnly cookie on Abraxas origin):</p>
            <BulletList items={[...PARTNER_FLOW_AUTH_BOUNDARY.browserSession]} />
            <p style={{ ...body, margin: "0.75rem 0 0.5rem" }}><strong>Server API key</strong> (never in browser):</p>
            <BulletList items={[...PARTNER_FLOW_AUTH_BOUNDARY.serverApiKey]} />
            <p style={{ ...body, margin: "0.75rem 0 0.5rem" }}><strong>Public (no auth):</strong></p>
            <BulletList items={[...PARTNER_FLOW_AUTH_BOUNDARY.publicNoAuth]} />
          </SectionCard>

          <SectionCard id="errors" title="Errors and status behavior">
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.76rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "0.4rem" }}>Condition</th>
                  <th style={{ textAlign: "left", padding: "0.4rem" }}>HTTP</th>
                  <th style={{ textAlign: "left", padding: "0.4rem" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {PARTNER_FLOW_ERROR_TABLE.map((row) => (
                  <tr key={row.condition} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.4rem" }}>{row.condition}</td>
                    <td style={{ padding: "0.4rem", fontFamily: MONO }}>{row.http}</td>
                    <td style={{ padding: "0.4rem", color: "var(--text-secondary)" }}>{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>

          <SectionCard id="redirect-example" title="Copy-paste redirect">
            <pre style={{
              fontFamily: MONO, fontSize: "0.68rem", lineHeight: 1.55,
              padding: "0.85rem", borderRadius: 10, overflow: "auto",
              background: "var(--surface-inset)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", margin: 0,
            }}>
              {PARTNER_FLOW_REDIRECT_EXAMPLE}
            </pre>
          </SectionCard>

          <SectionCard id="provisioning" title="Operator provisioning">
            <p style={body}>
              Partner rows, policies, and callback allowlists are provisioned by Abraxas operators after manual review.
              There is no self-serve portal and no automatic API-key issuance.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
              <Link href="/integrations#apply">
                <Btn size="sm">Apply for review</Btn>
              </Link>
              <Link href="/docs/partner-verification-requests">
                <Btn size="sm" variant="secondary">Server verification requests</Btn>
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
      <style>{`
        @media (max-width: 960px) {
          .partner-flow-doc-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </RedesignPage>
  );
}
