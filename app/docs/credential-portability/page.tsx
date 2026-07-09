"use client";
// FILE: app/docs/credential-portability/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { EXAMPLE_CREDENTIAL_CLAIMS, INTEGRATOR_ENDPOINTS } from "@/lib/credentialPortability";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export default function CredentialPortabilityPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Integrators"
        title="Portable credentials & verification API"
        subtitle="W3C Verifiable Credentials as Ed25519-signed JWTs. Verify once — rely on cryptographic proof, not re-KYC."
      />

      <ContentCard title="Example credential claims">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.75rem" }}>
          Structured claims include assurance levels (L1–L4), sources, refresh dates, and asset-specific attestations.
        </p>
        <pre style={{
          fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-secondary)",
          overflow: "auto", margin: 0, padding: "0.75rem", borderRadius: 10,
          background: "var(--surface-raised)", border: "1px solid var(--border)",
        }}>
          {JSON.stringify(EXAMPLE_CREDENTIAL_CLAIMS, null, 2)}
        </pre>
      </ContentCard>

      <ContentCard title="Integrator endpoints">
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {INTEGRATOR_ENDPOINTS.map(ep => (
            <div key={ep.path} style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem",
              padding: "0.65rem 0", borderBottom: "1px solid var(--border)",
            }}>
              <code style={{ fontFamily: MONO, fontSize: "0.68rem", color: "#10B981", fontWeight: 700 }}>
                {ep.method}
              </code>
              <div>
                <code style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-primary)" }}>{ep.path}</code>
                <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", marginTop: 2 }}>{ep.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Best practices for relying parties">
        <BulletList items={[
          "Verify Ed25519 signature against GET /api/credentials/public-key",
          "Check assurance level on each claim — do not treat L1 the same as L4",
          "Respect refreshDue dates — stale appraisals may need re-attestation",
          "Support selective disclosure — request only claims needed for the action",
          "Handle revocation — credentials can be revoked server-side",
        ]} />
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/verify" size="lg">Public verifier →</Btn>
        <Btn href="/integrations" variant="secondary" size="lg">Partner program</Btn>
        <Btn href="/docs/why-verification" variant="ghost" size="lg">Why verification</Btn>
      </div>
    </RedesignPage>
  );
}
