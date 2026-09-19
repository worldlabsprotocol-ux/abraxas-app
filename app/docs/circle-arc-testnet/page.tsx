// FILE: app/docs/circle-arc-testnet/page.tsx
// Circle Arc testnet settlement — DEMO infrastructure, not a claimed live integration.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { CIRCLE_PUBLIC_CODES } from "@/lib/settlement/circle/codes";
import { CIRCLE_INFRASTRUCTURE_LABEL, CIRCLE_NETWORK } from "@/lib/settlement/circle/constants";
import { PUBLIC_DEMO_ORIGIN, isPublicProductProduction } from "@/lib/product/publicOrigin";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export const dynamic = "force-dynamic";

export default function CircleArcTestnetDocsPage() {
  if (isPublicProductProduction()) {
    return (
      <RedesignPage accent="developer" maxWidth={900}>
        <PageHeader
          eyebrow="Developers"
          title="Circle Arc testnet settlement"
          subtitle="There is no Production Circle path. Testnet settlement evidence lives on the public DEMO environment only. Testnet transfer submission is disabled."
        />
        <ContentCard title="Public DEMO">
          <p style={body}>
            Review testnet documentation on{" "}
            <a href={`${PUBLIC_DEMO_ORIGIN}/docs/circle-arc-testnet`} style={{ color: "var(--accent)" }}>
              {PUBLIC_DEMO_ORIGIN}/docs/circle-arc-testnet
            </a>
            . Production never submits Circle transfers.
          </p>
          <p style={{ ...body, marginTop: "0.6rem" }}>
            <Link href="/docs/partner-flow" style={{ color: "var(--accent)" }}>Partner Flow docs</Link>
            {" · "}
            <Link href="/design-partner" style={{ color: "var(--accent)" }}>Design partner onboarding</Link>
          </p>
        </ContentCard>
      </RedesignPage>
    );
  }

  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · DEMO environment"
        title="Circle Arc testnet settlement"
        subtitle="Receipt-gated DEMO infrastructure. Test data only. Testnet transfer submission is disabled on the public DEMO environment. Abraxas is not a custodian of customer funds."
      />
      <ContentCard title="What this is">
        <p style={body}>
          {CIRCLE_INFRASTRUCTURE_LABEL}. Network {CIRCLE_NETWORK}. Creating an intent only records a pending review row. An explicit submit step is required before Circle is called, and public DEMO blocks that submit. Browser responses, callback parameters, client transaction hashes, and mocked provider objects cannot mark an intent settled.
        </p>
        <p style={{ ...body, marginTop: "0.6rem" }}>
          Launchpad shows only safe evidence: provider request reference, Circle transaction reference, network, currency, integer amount, state, timestamp, receipt ID, policy ID/version, and idempotency key.
        </p>
      </ContentCard>
      <ContentCard title="Fail closed">
        <p style={body}>
          Unsigned, denied, expired, revoked, wrong-partner, wrong-policy, login-only, and self-attested receipts cannot settle. Circle does not ask for identity. Use a policy-qualified signed receipt. Duplicate intents return {CIRCLE_PUBLIC_CODES.duplicate}. Production never activates Circle.
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
