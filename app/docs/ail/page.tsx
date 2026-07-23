"use client";
// FILE: app/docs/ail/page.tsx
// Abraxas Identity Layer (AIL). vision & product specification.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList, KeyValueTable } from "@/components/redesign/RedesignContent";
import {
  AIL_NAME,
  AIL_TAGLINE,
  AIL_POSITIONING,
  AIL_ELEVATOR,
  AIL_PROBLEM,
  AIL_SOLUTION,
  CORE_PRINCIPLES,
  AIL_STORED_FIELDS,
  INTEGRATOR_QUERIES,
  AIL_ARCHITECTURE_LAYERS,
  CREDENTIAL_CATALOG,
  IDENTITY_LIFECYCLE,
  ROLE_CREDENTIALS,
  DEVELOPER_API,
  TRUST_SCORE_FACTORS,
  PRIVACY_BY_DESIGN,
  REVENUE_STREAMS,
  type AILLayerStatus,
} from "@/lib/protocolAIL";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";
const BLUE = "#3B82F6";

const STATUS_COLOR: Record<AILLayerStatus, string> = {
  live: ACCENT,
  in_progress: AMBER,
  roadmap: BLUE,
};

function StatusPill({ status }: { status: AILLayerStatus }) {
  return (
    <span style={{
      padding: "0.2rem 0.55rem", borderRadius: 999,
      background: `${STATUS_COLOR[status]}18`, border: `1px solid ${STATUS_COLOR[status]}40`,
      fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
      color: STATUS_COLOR[status], letterSpacing: "0.08em", textTransform: "uppercase",
    }}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function AILSpecPage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow={AIL_NAME}
        title={AIL_POSITIONING}
        subtitle={`${AIL_TAGLINE} ${AIL_ELEVATOR}`}
      />

      <ContentCard title="The problem">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.75rem" }}>
          {AIL_PROBLEM}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>
          {AIL_SOLUTION}
        </p>
      </ContentCard>

      <ContentCard title="What Abraxas is. and is not">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
          <div style={{ padding: "1rem", borderRadius: 12, border: "1px solid #EF444440", background: "#EF444408" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "#EF4444", marginBottom: "0.5rem" }}>
              Not this
            </div>
            <BulletList items={[
              "Another KYC vendor",
              "Storing passports on-chain",
              "Replacing Veriff's legal liability",
              "Proprietary identity format",
            ]} />
          </div>
          <div style={{ padding: "1rem", borderRadius: 12, border: `1px solid ${ACCENT}40`, background: `${ACCENT}08` }}>
            <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: ACCENT, marginBottom: "0.5rem" }}>
              This
            </div>
            <BulletList items={[
              "Trust registry & credential orchestration",
              "Trusted issuer registry (roadmap)",
              "Revocation & compliance engine (roadmap)",
              "W3C VC + did:sui open standards",
              "One API instead of five KYC integrations",
            ]} />
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Core principles">
        <BulletList items={CORE_PRINCIPLES} />
      </ContentCard>

      <ContentCard title="What Abraxas stores (never the passport)">
        <KeyValueTable rows={AIL_STORED_FIELDS.map(r => ({ k: r.field, v: r.desc, mono: true }))} />
      </ContentCard>

      <ContentCard title="How integrators use AIL">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
          When a protocol needs compliance, it asks Abraxas. the user does not upload documents again.
        </p>
        {INTEGRATOR_QUERIES.map(row => (
          <div key={row.q} style={{ marginBottom: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              {row.q}
            </div>
            <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: ACCENT }}>{row.api}</div>
          </div>
        ))}
      </ContentCard>

      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 1rem" }}>
          System architecture
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {AIL_ARCHITECTURE_LAYERS.map(layer => (
            <div key={layer.id} style={{
              padding: "1.15rem 1.25rem", borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)", background: "var(--surface-raised)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                <div style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {layer.layer}
                </div>
                <StatusPill status={layer.status} />
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.75rem" }}>
                {layer.summary}
              </p>
              <BulletList items={layer.responsibilities} />
              {layer.output && (
                <p style={{ fontFamily: MONO, fontSize: "0.68rem", color: ACCENT, margin: "0.75rem 0 0" }}>
                  → {layer.output}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <ContentCard title="Credential catalog (beyond KYC)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.75rem" }}>
          {CREDENTIAL_CATALOG.map(cat => (
            <div key={cat.category} style={{ padding: "0.875rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }}>
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT, marginBottom: "0.5rem" }}>
                {cat.category}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {cat.examples.join(" · ")}
              </div>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Identity lifecycle">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {IDENTITY_LIFECYCLE.map(item => (
            <span key={item.phase} style={{
              padding: "0.35rem 0.75rem", borderRadius: 999,
              border: `1px solid ${STATUS_COLOR[item.status]}44`,
              background: `${STATUS_COLOR[item.status]}10`,
              fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)",
            }}>
              {item.phase}
            </span>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Role-based credentials">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0 0 0.75rem", lineHeight: 1.65 }}>
          Different participants need different reusable credentials. each maps to Passport stamp bits.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {ROLE_CREDENTIALS.map(role => (
            <span key={role} style={{
              fontFamily: MONO, fontSize: "0.62rem", fontWeight: 600,
              padding: "0.3rem 0.6rem", borderRadius: 6,
              border: "1px solid var(--border)", color: "var(--text-secondary)",
            }}>
              {role}
            </span>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Trust score (roadmap)">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0 0 0.75rem", lineHeight: 1.65 }}>
          Dynamic 0-1000 score. not just initial KYC. Factors include:
        </p>
        <BulletList items={TRUST_SCORE_FACTORS} />
      </ContentCard>

      <ContentCard title="Developer API">
        <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          Live today
        </div>
        <BulletList items={DEVELOPER_API.live} />
        <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: BLUE, letterSpacing: "0.1em", textTransform: "uppercase", margin: "1rem 0 0.5rem" }}>
          Roadmap
        </div>
        <BulletList items={DEVELOPER_API.roadmap} />
      </ContentCard>

      <ContentCard title="Privacy by design">
        <BulletList items={PRIVACY_BY_DESIGN} />
      </ContentCard>

      <ContentCard title="Long-term vision">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 1rem" }}>
          Build the core as a general-purpose trust engine. Ship reusable identity (KYC/KYB) as the first application.
          Expand to real estate, metals, IP, licenses, carbon credits, supply chain, and AI agent credentials -
          all on the same infrastructure.
        </p>
        <BulletList items={REVENUE_STREAMS} />
      </ContentCard>

      <ContentCard title="Related">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {[
            { label: "Get verified", href: "/passport" },
            { label: "Sui integration", href: "/docs/sui" },
            { label: "Architecture", href: "/docs/architecture" },
            { label: "Passport spec", href: "/docs/passport-spec" },
            { label: "Security", href: "/security" },
          ].map(link => (
            <Link key={link.href} href={link.href} style={{
              padding: "0.5rem 1rem", borderRadius: 999,
              border: "1px solid var(--border)", color: ACCENT,
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none",
            }}>
              {link.label} →
            </Link>
          ))}
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
