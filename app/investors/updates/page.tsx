"use client";
// FILE: app/investors/updates/page.tsx
// Investor update template. send monthly before you raise.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const UPDATE_SECTIONS = [
  {
    title: "What shipped",
    prompt: "List concrete product releases with links to /metrics or PRs.",
    example: [
      "Investor data room live at /investors",
      "Cielo USDC pay on Sui mainnet. one-click zkLogin",
      "Live metrics dashboard pulling Supabase + Bags API",
    ],
  },
  {
    title: "Traction & metrics",
    prompt: "Pull numbers from /api/metrics/investor. never fabricate.",
    example: [
      "X zkLogin wallets registered",
      "Y credentials issued · Z captured Cielo stays",
      "$N USDC revenue on featured stay",
    ],
  },
  {
    title: "Partners & pipeline",
    prompt: "Name only what you can evidence (LOI, pilot, or public integration).",
    example: [
      "N design partner applications via /integrations",
      "Veriff · Utila · CV5 audit trail unchanged",
    ],
  },
  {
    title: "Risks & blockers",
    prompt: "Honesty builds trust. list what slowed you and how you're addressing it.",
    example: [
      "Move mainnet audit not yet published. scope documented at /security",
      "First external protocol integration still in recruiting",
    ],
  },
  {
    title: "Next milestones",
    prompt: "Dependency order, not calendar dates.",
    example: [
      "Complete first mainnet Cielo E2E with external tester",
      "Close design partner LOI with RWA marketplace",
      "Publish Move audit findings",
    ],
  },
  {
    title: "Specific asks",
    prompt: "Make it easy for investors to help.",
    example: [
      "Intro to RWA fund with hospitality or music catalog focus",
      "RWA-specialized counsel for Reg D framework review",
      "Feedback on pitch deck slide 8 (economics)",
    ],
  },
];

export default function InvestorUpdatesPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Investor relations"
        title="Monthly update template"
        subtitle="Send this to potential investors, advisors, and design partners every month. even before you formally raise. Familiarity converts cold pitches into warm ones."
      />

      <ContentCard title="Subject line">
        <code style={{ fontFamily: MONO, fontSize: "0.82rem", color: ACCENT }}>
          Abraxas Update. [Month] · [1 headline metric or ship]
        </code>
      </ContentCard>

      {UPDATE_SECTIONS.map(section => (
        <ContentCard key={section.title} title={section.title}>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: "0 0 0.65rem" }}>
            {section.prompt}
          </p>
          <BulletList items={section.example} />
        </ContentCard>
      ))}

      <ContentCard title="Attach / link every time">
        <BulletList items={[
          "Data room: abraxas-app.vercel.app/investors",
          "Live metrics: /metrics",
          "Cielo case study: /case-studies/cielo",
          "Ops health: /ops/cielo-e2e",
        ]} />
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/metrics" size="lg">Pull live metrics →</Btn>
        <Btn href="/investors/pitch" variant="secondary" size="lg">Pitch deck</Btn>
        <Link href="mailto:verify@abraxas-app.vercel.app?subject=Abraxas%20investor%20update%20list"
          style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, alignSelf: "center", textDecoration: "none" }}>
          Join update list →
        </Link>
      </div>
    </RedesignPage>
  );
}
