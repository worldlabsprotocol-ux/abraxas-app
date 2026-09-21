"use client";
// FILE: app/docs/hosted-partner-flow-handoff/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { HOSTED_HANDOFF_NOTICE } from "@/lib/partner/hostedHandoff/contract";
import { hostedHandoffHttpExamples } from "@/lib/partner/hostedHandoff/examples";
import { PUBLIC_FONT_SANS } from "@/lib/design/publicSurface";
import { ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = PUBLIC_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export default function HostedHandoffDocsPage() {
  const examples = hostedHandoffHttpExamples();
  return (
    <RedesignPage accent="developer" maxWidth={860}>
      <PageHeader
        eyebrow="Developers · Partner Flow"
        title="Hosted Partner Flow universal handoff"
        subtitle="Your backend creates a short-lived handoff. The holder approves a narrow result. Your backend verifies the new receipt."
      />
      <ContentCard title="What this is">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          {HOSTED_HANDOFF_NOTICE}
        </p>
      </ContentCard>
      <ContentCard title="Sequence">
        <BulletList items={[
          "Partner backend creates a handoff for one configured sandbox or Production-reviewed app.",
          "The holder opens a Hosted Partner Flow URL that contains only an opaque verify_request.",
          "The holder reviews the request brief and gives fresh consent.",
          "Abraxas stores a partner-bound result. The callback or deep link is a completion signal only.",
          "Partner backend re-fetches and verifies the current public receipt with Partner Kit.",
        ]} />
      </ContentCard>
      <ContentCard title="Canonical HTTPS">
        <pre className="abx-code-scroll" style={{ fontFamily: MONO, fontSize: "0.68rem", whiteSpace: "pre-wrap", margin: 0 }}>
          {examples.universal_https}
        </pre>
      </ContentCard>
      <PublicJourneyNextSteps title="Continue with Partner Flow" />
    </RedesignPage>
  );
}
