import type { Metadata } from "next";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { CATEGORY_POSITIONING } from "@/lib/categoryInfrastructure";
import { DOCS_SECTIONS } from "@/lib/protocolContent";

export const metadata: Metadata = {
  title: "Developers — Verification API & Passport SDK | Abraxas",
  description: "Build on trust infrastructure: verify API, W3C credentials, quickstarts, and integration patterns for tokenized asset platforms.",
};

const VERIFY_API_POINTS = [
  "POST /api/credentials/verify — relying party JWT verify",
  "GET /api/credentials/public-key — JWKS for offline verify",
  "GET /api/trust/status — wallet + credential summary",
  "Partner verification requests + policy evaluate (approved partners)",
];

export default function DevelopersPage() {
  return (
    <RedesignPage maxWidth={880}>
      <PageHeader
        eyebrow="For builders"
        title="Build with Passport"
        subtitle={CATEGORY_POSITIONING.elevator}
      />

      <ContentCard title="I'm building a tokenized asset platform. How do I integrate?">
        <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.65rem" }}>
          Embed Passport for holder UX. Call the verify API when you need to clear a transaction. Map your risk tiers to assurance levels — you verify the credential, not Abraxas reputation.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/learn/verification-infrastructure" size="sm">Verification infrastructure →</Btn>
          <Btn href="/comparisons/passport-vs-repeated-kyc" variant="secondary" size="sm">vs repeated KYC →</Btn>
          <Btn href="/partners" variant="ghost" size="sm">Design partner program →</Btn>
        </div>
      </ContentCard>

      <div id="verify-api">
      <ContentCard title="Verify API">
        <BulletList items={VERIFY_API_POINTS} />
        <Btn href="/docs" size="sm">Full documentation →</Btn>
      </ContentCard>
      </div>

      <ContentCard title="Architecture">
        {DOCS_SECTIONS.slice(0, 3).map(s => (
          <div key={s.title} style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontWeight: 800, fontSize: "0.82rem", marginBottom: 4 }}>{s.title}</div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginBottom: "2rem" }}>
        <Btn href="/passport" size="lg">Launch Passport →</Btn>
        <Btn href="/tools/verification-cost-calculator" variant="secondary" size="lg">Cost calculator →</Btn>
      </div>
    </RedesignPage>
  );
}
