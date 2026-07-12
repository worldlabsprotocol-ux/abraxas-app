import type { Metadata } from "next";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { partnersInExecutionCount } from "@/lib/partnerStatus";
import { ABRAXAS_TAGLINE } from "@/lib/messaging/bible";

export const metadata: Metadata = {
  title: "Community · Abraxas",
  description: "Ecosystem updates, AMA formats, and conversation starters for the Abraxas reusable verification community.",
};

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function CommunityPage() {
  const partnerCount = partnersInExecutionCount();

  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Community"
        title="Build in public — with receipts"
        subtitle={`${ABRAXAS_TAGLINE} Conversation, not broadcasting. Every update ties back to live proof on the site.`}
      />

      <ContentCard title="Where to start">
        <BulletList items={[
          "Walk the Cielo reference loop — /cielo/verified-rate",
          "Browse the public registry — /#registry",
          "Read the learn hub — /blog",
          "Integrate or partner — /integrations and /design-partner",
        ]} />
      </ContentCard>

      <ContentCard title="Ecosystem status (accurate)">
        <p style={body}>
          Genesis proof: Cielo Sunrise — $1.1M appraisal, live STR, Superhost, USDC-on-Sui pilot.
          {partnerCount > 0 && ` ${partnerCount} design partner${partnerCount === 1 ? "" : "s"} in final onboarding.`}
          {" "}Names publish when approved.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/case-studies/cielo" size="sm">Cielo case study →</Btn>
          <Btn href="/blog/founder" variant="secondary" size="sm">Operator notes →</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Formats (repo templates)">
        <BulletList items={[
          "content/community/x-ama-template.md — X / AMA question bank",
          "content/community/ecosystem-update-format.md — monthly update structure",
          "content/press/PITCH_GUIDE.md — press pitch guide (quality outlets)",
        ]} />
      </ContentCard>

      <ContentCard title="Conversation prompts">
        <BulletList items={[
          "What verification do you repeat today that should be reusable?",
          "Where does your workflow break — mint, verify, or settle?",
          "What would change if guests proved eligibility once across channels?",
        ]} />
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2rem" }}>
        <Btn href="/design-partner" size="lg">Talk to the team →</Btn>
        <Btn href="/blog" variant="secondary" size="lg">Learn hub →</Btn>
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
