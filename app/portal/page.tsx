"use client";
// FILE: app/portal/page.tsx
// Owner portal hub — verify once, track progress, control what partners see.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

const OWNER_STEPS = [
  "Submit your asset intake once — define evidence scope, not a blind document dump.",
  "Track every review stage in this portal with your reference ID and email.",
  "When verified, partners ask Abraxas for eligibility — you control scoped sharing.",
  "Stop re-forwarding the same owner package through lenders, tribal review, and investors.",
];

export default function OwnerPortalPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Owner portal"
        title="Verify once. Stay in the loop."
        subtitle="For land developers, tribal stewards, and asset owners — not a black-box form on someone else's site. You submit once, track progress, and control what approved parties can see."
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "1.25rem" }}>
        <Btn href="/portal/apply" size="lg">Start land / asset intake →</Btn>
        <Btn href="/portal/status" variant="secondary" size="lg">Track my application →</Btn>
      </div>

      <ContentCard title="Why this exists">
        <p style={body}>
          The same bottleneck you hit in real deals — forwarding verified owner information through a chain
          of command because every counterparty needs their own copy — is what Abraxas removes. You prove
          once. Relying parties get minimum proof. Sensitive documents do not sit in every inbox.
        </p>
        <BulletList items={OWNER_STEPS} />
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
