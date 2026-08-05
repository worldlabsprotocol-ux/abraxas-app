"use client";
// FILE: app/docs/integration-readiness/page.tsx
// Public integration readiness summary — links to reconciliation doc and partner paths.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import {
  CANONICAL_PRODUCTION_ORIGIN,
  HOW_TO_INTEGRATE_STEPS,
  INTEGRATION_STATUS_SECTIONS,
  INTEGRATION_WIRING_CHECKLIST,
  INTEGRATION_WIRING_COMPLETE_CRITERIA,
  RELEASE_GATE_CHECKLIST,
} from "@/lib/integrationReadiness";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

export default function IntegrationReadinessPage() {
  return (
    <RedesignPage maxWidth={920}>
      <PageHeader
        eyebrow="Integrators · Status"
        title="Integration readiness"
        subtitle="Evidence-based status for abraxasworld.xyz — what is live, what awaits pilot proof, and which release gates stay open."
      />

      <p style={{ ...body, marginBottom: "1rem" }}>
        Canonical host:{" "}
        <code style={{ fontFamily: MONO, fontSize: "0.75rem" }}>{CANONICAL_PRODUCTION_ORIGIN}</code>
        . Full reconciliation (including stale-origin audit):{" "}
        <code style={{ fontFamily: MONO, fontSize: "0.72rem" }}>docs/INTEGRATION_READINESS_RECONCILIATION.md</code>{" "}
        in the repository.
      </p>

      {INTEGRATION_STATUS_SECTIONS.map((section) => (
        <ContentCard key={section.id} title={`${section.emoji} ${section.phase}`}>
          <p style={{ ...body, marginBottom: "0.75rem" }}>{section.description}</p>
          <BulletList items={[...section.items]} />
        </ContentCard>
      ))}

      <ContentCard title="How another protocol integrates">
        <ol style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.65rem" }}>
          {HOW_TO_INTEGRATE_STEPS.map((step) => (
            <li key={step.step} style={body}>
              <Link href={step.href} style={{ color: "var(--accent)", fontWeight: 700 }}>
                {step.title}
              </Link>
              {" — "}
              {step.detail}
            </li>
          ))}
        </ol>
      </ContentCard>

      <ContentCard title="Integration wiring checklist">
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          Operator + integrator tasks before calling a partner wired. Separate from release gates below.
        </p>
        <BulletList items={INTEGRATION_WIRING_CHECKLIST.map((row) => `${row.label} (${row.owner})`)} />
        <p style={{ ...body, marginTop: "0.85rem", fontWeight: 600 }}>Wiring complete when:</p>
        <BulletList items={[...INTEGRATION_WIRING_COMPLETE_CRITERIA]} />
      </ContentCard>

      <ContentCard title="Release gates (not complete)">
        <BulletList items={RELEASE_GATE_CHECKLIST.map((g) => `${g.label} — open`)} />
      </ContentCard>
    </RedesignPage>
  );
}
