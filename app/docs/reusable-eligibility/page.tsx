// FILE: app/docs/reusable-eligibility/page.tsx
// Consent-bound reusable facts. Not a global identity graph.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { REUSE_CONSENT_STILL_REQUIRED, REUSE_PASSPORT_NOTICE } from "@/lib/passport/reusableEligibility/contract";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function ReusableEligibilityDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Privacy · Reusable eligibility"
        title="Reuse a private result only with fresh consent"
        subtitle="A holder may reuse a current private verification for a later compatible request. The new partner receives only that policy’s result. This is not a global identity, KYC file, or partner graph."
      />

      <ContentCard title="When reuse is offered">
        <p style={body}>
          Hosted Partner Flow offers reuse only after the server finds a compatible fact:
          exact same pack and version, or one reviewed compatibility edge. Client fields cannot
          mark a fact compatible.
        </p>
      </ContentCard>

      <ContentCard title="Fresh consent">
        <p style={body}>{REUSE_CONSENT_STILL_REQUIRED}</p>
      </ContentCard>

      <ContentCard title="Passport">
        <p style={body}>{REUSE_PASSPORT_NOTICE}</p>
      </ContentCard>

      <ContentCard title="Related">
        <p style={body}>
          <Link href="/docs/policy-compatibility">Policy compatibility</Link>
          {" · "}
          <Link href="/docs/selective-disclosure">Selective disclosure</Link>
          {" · "}
          <Link href="/docs/partner-flow">Partner Flow</Link>
          {" · "}
          <Link href="/docs/why-verification">Why verification</Link>
        </p>
      </ContentCard>
      <PublicJourneyNextSteps />
    </RedesignPage>
  );
}
