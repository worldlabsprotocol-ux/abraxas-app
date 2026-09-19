// FILE: app/verification/page.tsx
// Public receipt verification. No operator secrets or Vercel bootstrap checklist.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ACCOUNT_ACCESS_FIRST_PAINT } from "@/lib/product/publicOrigin";

export const dynamic = "force-dynamic";

export default function VerificationPage() {
  return (
    <RedesignPage accent="developer" maxWidth={820}>
      <PageHeader
        eyebrow="Receipt verification"
        title="Verify a signed Abraxas result"
        subtitle="Partners check a public receipt on the server. Holders and developers can inspect the same allow or deny outcome here without seeing raw claims."
      />
      <ContentCard title="What you receive">
        <p style={{ fontFamily: "var(--font-sans), system-ui, sans-serif", fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.85rem" }}>
          {ACCOUNT_ACCESS_FIRST_PAINT}
        </p>
        <p style={{ fontFamily: "var(--font-sans), system-ui, sans-serif", fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1rem" }}>
          Enter a receipt on the public verifier. The partner Integration Kit remains the authorization path.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/verify?mode=receipt" size="lg">Open receipt verifier →</Btn>
        </div>
        <PublicJourneyNextSteps title="Integrate this check" />
      </ContentCard>
    </RedesignPage>
  );
}
