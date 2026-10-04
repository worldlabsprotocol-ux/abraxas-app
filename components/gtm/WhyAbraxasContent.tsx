"use client";
// FILE: components/gtm/WhyAbraxasContent.tsx
// Category explanation for buyers — distinct from /proof evidence surfaces.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  GTM_HANDS_ON_REUSE_HREF,
  GTM_ONE_SENTENCE_DESCRIPTION,
  GTM_PRIMARY_CTA_HREF,
} from "@/lib/gtm/contract";
import {
  PERSONA_MESSAGES,
  WHY_NOT_KYC_PROVIDER,
  WHY_NOT_STORE_OURSELVES,
} from "@/lib/gtm/proofPack";

const FONT = ABRAXAS_FONT_SANS;

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.86rem",
  lineHeight: 1.65,
  color: "var(--text-secondary)",
  margin: 0,
};

const PILLARS = [
  {
    title: "Keep your existing KYC provider",
    detail:
      "Your provider still verifies the customer. Abraxas sits after that step and controls how trusted evidence becomes application-specific answers.",
  },
  {
    title: "Each application gets only what its policy allows",
    detail:
      "Applications receive signed eligibility results — not birth dates, document images, or full provider payloads unless a policy truly requires more.",
  },
  {
    title: "Reuse is re-evaluation, not copying approvals",
    detail:
      "Compatible evidence may satisfy a second application with fresh consent. Each application still receives its own result, freshness checks, and revocation boundaries.",
  },
  {
    title: "Your server verifies before granting access",
    detail:
      "Browser callbacks are continuation signals only. Relying applications verify signed public results server-side before treating a customer as eligible.",
  },
] as const;

export function WhyAbraxasContent() {
  return (
    <div style={{ display: "grid", gap: "1rem", textAlign: "left" }}>
      <ContentCard title="Why Abraxas exists">
        <p style={{ ...body, color: "var(--text-primary)", fontWeight: 600 }}>
          {GTM_ONE_SENTENCE_DESCRIPTION}
        </p>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Multi-app platforms already pay for KYC. The expensive part is repeating verification,
          passing identity files between products, and rebuilding gates for every launch.
          Abraxas is the reusable eligibility layer above verification evidence.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginTop: "0.85rem" }}>
          <Btn href={GTM_PRIMARY_CTA_HREF} size="lg">See reference proof</Btn>
          <Btn href={GTM_HANDS_ON_REUSE_HREF} variant="secondary" size="lg">
            Try reuse in sandbox
          </Btn>
        </div>
      </ContentCard>

      <ContentCard title="What changes for your applications">
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.65rem" }}>
          {PILLARS.map((pillar) => (
            <li key={pillar.title} style={body}>
              <strong style={{ color: "var(--text-primary)" }}>{pillar.title}.</strong>{" "}
              {pillar.detail}
            </li>
          ))}
        </ul>
      </ContentCard>

      <ContentCard title={WHY_NOT_KYC_PROVIDER.title}>
        <p style={body}>{WHY_NOT_KYC_PROVIDER.body}</p>
      </ContentCard>

      <ContentCard title={WHY_NOT_STORE_OURSELVES.title}>
        <p style={body}>{WHY_NOT_STORE_OURSELVES.body}</p>
      </ContentCard>

      <ContentCard title="How different roles benefit">
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.45rem" }}>
          {Object.entries(PERSONA_MESSAGES).map(([role, message]) => (
            <li key={role} style={body}>
              <strong style={{ color: "var(--text-primary)", textTransform: "capitalize" }}>{role}:</strong>{" "}
              {message}
            </li>
          ))}
        </ul>
      </ContentCard>

      <ContentCard title="See the evidence">
        <p style={body}>
          Reference proof shows what the architecture can do in a harness. Your sandbox evaluation
          proves whether your team can reach the same reuse outcome with server-verifiable results.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginTop: "0.75rem" }}>
          <Btn href={GTM_PRIMARY_CTA_HREF} size="lg">Answer four proof questions</Btn>
          <Link href="/developers" style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.82rem", alignSelf: "center" }}>
            Build in sandbox →
          </Link>
        </div>
      </ContentCard>
    </div>
  );
}
