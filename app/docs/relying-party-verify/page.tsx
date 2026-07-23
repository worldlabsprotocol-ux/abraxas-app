"use client";
// FILE: app/docs/relying-party-verify/page.tsx
// Minimal external relying party path. verify → proof → independent check.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  EXTERNAL_RP_HEADLINE,
  EXTERNAL_RP_SUMMARY,
  EXTERNAL_RP_ONBOARDING_STEPS,
  VERIFY_MODE_GUIDE,
  VALID_REQUESTED_ACTIONS,
  VERIFY_HTTP_STATUS,
  MINIMAL_RP_INTEGRATION_EXAMPLE,
  PROOF_LOOKUP_EXAMPLE,
  CURL_VERIFY_EXAMPLE,
  CURL_PROOF_EXAMPLE,
  EXTERNAL_RP_ERRORS,
  EXAMPLE_VERIFY_RESPONSE_APPROVED,
  EXAMPLE_PROOF_LOOKUP_RESPONSE,
} from "@/lib/externalRelyingPartyIntegration";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export default function RelyingPartyVerifyDocsPage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="External relying party"
        title={EXTERNAL_RP_HEADLINE}
        subtitle="One main API call. Decision + cryptographic proof. Independent verification. no inbox, no relay."
      />

      <ContentCard title="Four steps">
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {EXTERNAL_RP_ONBOARDING_STEPS.map(item => (
            <div
              key={item.step}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "0.85rem",
                padding: "0.85rem",
                borderRadius: 12,
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: `${ACCENT}18`,
                  border: `1px solid ${ACCENT}44`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO,
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: ACCENT,
                }}
              >
                {item.step}
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                  {item.title}
                </div>
                <p style={body}>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <Btn href="/design-partner" size="sm">Request API key →</Btn>
          <Btn href="/api/docs/relying-party" variant="secondary" size="sm">JSON guide →</Btn>
          <Btn href="/api/proof/reference/ABX-RE-HOSP-001" variant="ghost" size="sm">Live Cielo demo →</Btn>
        </div>
      </ContentCard>

      <ContentCard title="What you need to do">
        <BulletList items={[...EXTERNAL_RP_SUMMARY.whatTheyDo]} />
      </ContentCard>

      <ContentCard title="What you get back">
        <BulletList items={[...EXTERNAL_RP_SUMMARY.whatTheyGetBack]} />
      </ContentCard>

      <ContentCard title="How to verify independently">
        <BulletList items={[...EXTERNAL_RP_SUMMARY.howTheyVerifyIndependently]} />
      </ContentCard>

      <ContentCard title="Minimal integration (copy-paste)">
        <p style={{ ...body, marginBottom: "0.65rem" }}>
          Server-side only. One verify call, optional proof confirmation, gate on{" "}
          <code style={inlineCode}>decision === &quot;approved&quot;</code>.
        </p>
        <CodeBlock>{MINIMAL_RP_INTEGRATION_EXAMPLE}</CodeBlock>
      </ContentCard>

      <ContentCard title="Proof lookup">
        <p style={{ ...body, marginBottom: "0.65rem" }}>
          Use <code style={inlineCode}>verify_url</code> from the verify response. No API key required.
          Check <code style={inlineCode}>signature_valid</code> and <code style={inlineCode}>proof_reliable</code>.
        </p>
        <CodeBlock>{PROOF_LOOKUP_EXAMPLE}</CodeBlock>
      </ContentCard>

      <ContentCard title="curl">
        <CodeBlock>{`${CURL_VERIFY_EXAMPLE}\n\n${CURL_PROOF_EXAMPLE}`}</CodeBlock>
      </ContentCard>

      <ContentCard title="Verify modes. pick one">
        {VERIFY_MODE_GUIDE.map(mode => (
          <div key={mode.mode} style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontFamily: MONO, fontSize: "0.62rem", fontWeight: 800, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {mode.mode}
            </div>
            <p style={{ ...body, margin: "0.35rem 0" }}>{mode.when}</p>
            <p style={{ ...body, margin: "0.25rem 0", fontSize: "0.78rem" }}>
              <strong>Auth:</strong> {mode.auth}
            </p>
            <CodeBlock>{JSON.stringify(mode.body, null, 2)}</CodeBlock>
          </div>
        ))}
        <p style={{ ...body, marginTop: "0.65rem", marginBottom: 0 }}>
          Policy check actions: <code style={inlineCode}>{VALID_REQUESTED_ACTIONS.join(", ")}</code>
        </p>
      </ContentCard>

      <ContentCard title="HTTP status codes">
        <div style={{ fontFamily: MONO, fontSize: "0.65rem", lineHeight: 1.8, color: "var(--text-secondary)" }}>
          {Object.entries(VERIFY_HTTP_STATUS).map(([code, desc]) => (
            <div key={code}>
              <span style={{ color: ACCENT, fontWeight: 700 }}>{code}</span>. {desc}
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Example verify response (approved)">
        <CodeBlock>{JSON.stringify(EXAMPLE_VERIFY_RESPONSE_APPROVED, null, 2)}</CodeBlock>
      </ContentCard>

      <ContentCard title="Example proof lookup response">
        <CodeBlock>{JSON.stringify(EXAMPLE_PROOF_LOOKUP_RESPONSE, null, 2)}</CodeBlock>
      </ContentCard>

      <ContentCard title="Errors and edge cases">
        {EXTERNAL_RP_ERRORS.map(err => (
          <div key={err.case} style={{ padding: "0.65rem 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {err.case}
            </div>
            <p style={{ ...body, margin: "0.25rem 0" }}>
              <strong>Cause:</strong> {err.cause}
            </p>
            <p style={{ ...body, margin: 0 }}>
              <strong>Action:</strong> {err.action}
            </p>
          </div>
        ))}
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/design-partner" size="lg">Get started →</Btn>
        <Btn href="/integrations/relying-parties" variant="secondary" size="lg">Full RP program</Btn>
        <Link href="/developers" style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, alignSelf: "center", textDecoration: "none" }}>
          Developer hub →
        </Link>
      </div>
    </RedesignPage>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        fontFamily: MONO,
        fontSize: "0.62rem",
        lineHeight: 1.55,
        padding: "1rem",
        borderRadius: 10,
        overflow: "auto",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
        margin: 0,
      }}
    >
      {children}
    </pre>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.75,
  margin: 0,
};

const inlineCode: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.72rem",
};
