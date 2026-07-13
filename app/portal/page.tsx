"use client";
// FILE: app/portal/page.tsx
// Owner portal hub — self-serve launch, verify once, settle on-chain.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

const OWNER_STEPS = [
  "Sign in with Google (same as Passport) — no seed phrase.",
  "Name your asset or business — publish to the registry instantly (L1 owner-listed).",
  "Connect wallet and complete Passport verification when you're ready for partners.",
  "Optional Abraxas review upgrades assurance — not required to get started.",
  "When a deal is ready, move USDC on Sui — same rail as Cielo Sunrise.",
];

export default function OwnerPortalPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Owner portal"
        title="List now. Verify once. Settle on-chain."
        subtitle="No waiting queue — your asset or business appears on the public registry immediately. Abraxas review is an upgrade path, not a gate to getting started."
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "1.25rem" }}>
        <Btn href="/portal/apply" size="lg">Launch your listing →</Btn>
        <Btn href="/portal/journey" variant="secondary" size="lg">My full journey →</Btn>
        <Btn href="/portal/status" variant="ghost" size="lg">Track status →</Btn>
      </div>

      <ContentCard title="End-to-end loop">
        <BulletList items={[
          "Launch at /portal/apply — land, business, tribal, or mineral classes.",
          "Listing goes live on /verify and the homepage registry explorer immediately.",
          "Passport wallet (zkLogin) links to your application for settlement.",
          "Request Abraxas review when you want full verification — honest L1 → L3 upgrade.",
          "Deal ready → Circle USDC on Sui captures to verified treasury.",
        ]} />
        <div style={{ marginTop: "0.75rem" }}>
          <Btn href="/case-studies/cielo" variant="secondary" size="sm">See Cielo reference (hospitality) →</Btn>
        </div>
      </ContentCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        <ContentCard title="What you do">
          <BulletList items={[
            "Complete the intake with asset class, jurisdiction, and evidence scope.",
            "Save your application reference — bookmark the status page.",
            "Respond when Abraxas requests scoped evidence (not repeated full dossiers).",
          ]} />
        </ContentCard>
        <ContentCard title="What Abraxas does">
          <BulletList items={[
            "Assign a named reviewer before any public VERIFIED status.",
            "Publish a stable verify URL when approved — like Cielo for hospitality.",
            "Route partner eligibility checks through policy APIs, not your email.",
          ]} />
        </ContentCard>
        <ContentCard title="What partners see">
          <BulletList items={[
            "Eligibility decisions and attestations — not your full document folder.",
            "Consent-based Passport access when you approve sharing.",
            "Audit trail that you can inspect from this portal.",
          ]} />
        </ContentCard>
      </div>

      <ContentCard title="Reference: Cielo Sunrise (hospitality)">
        <p style={body}>
          Cielo is our genesis dogfood asset — guests verify once, operators see eligibility, USDC settles on Sui.
          Land and mineral workflows follow the same trust pattern with different evidence scope.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/case-studies/cielo" variant="secondary" size="sm">Cielo case study →</Btn>
          <Btn href="/cielo/status" variant="ghost" size="sm">Track a Cielo booking →</Btn>
          <Btn href="/verify/ABX-RE-HOSP-001" variant="ghost" size="sm">Verify Cielo record →</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Design partner onboarding">
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          If you are meeting with Abraxas as a design partner, start here — then we co-build the tribal / land
          vertical with measured outcomes.
        </p>
        <Link href="/design-partner" style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT, textDecoration: "none" }}>
          Design partner program →
        </Link>
      </ContentCard>

      <div style={{ marginBottom: "2rem" }}>
        <Btn href="/integrations/external-assets" variant="ghost" size="sm">General external asset intake →</Btn>
      </div>
    </RedesignPage>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: "0 0 0.75rem",
};
