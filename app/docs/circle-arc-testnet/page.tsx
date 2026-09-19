// FILE: app/docs/circle-arc-testnet/page.tsx
// Circle Arc testnet settlement — DEMO infrastructure, not a claimed live integration.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { CIRCLE_PUBLIC_CODES } from "@/lib/settlement/circle/codes";
import { CIRCLE_INFRASTRUCTURE_LABEL, CIRCLE_NETWORK } from "@/lib/settlement/circle/constants";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function CircleArcTestnetDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · DEMO / testnet"
        title="Circle Arc testnet settlement"
        subtitle="Receipt-gated DEMO infrastructure. Abraxas is not a custodian of customer funds. This page does not claim a live Circle integration."
      />
      <ContentCard title="What this is">
        <p style={body}>
          {CIRCLE_INFRASTRUCTURE_LABEL}. Network {CIRCLE_NETWORK}. Creating an intent only records a pending review row. An explicit submit step is required before Circle is called. Browser responses, callback parameters, client transaction hashes, and mocked provider objects cannot mark an intent settled.
        </p>
        <p style={{ ...body, marginTop: "0.6rem" }}>
          Launchpad shows only safe evidence: provider request reference, Circle transaction reference, network, currency, integer amount, state, timestamp, receipt ID, policy ID/version, and idempotency key.
        </p>
      </ContentCard>
      <ContentCard title="Fail closed">
        <p style={body}>
          Unsigned, denied, expired, revoked, wrong-partner, wrong-policy, login-only, and self-attested receipts cannot settle. Circle does not ask for identity. Use a policy-qualified signed receipt. The sandbox economic demo pack is not age verification and cannot be used in Production. Duplicate intents return {CIRCLE_PUBLIC_CODES.duplicate}. Missing Circle credentials return {CIRCLE_PUBLIC_CODES.unavailable} on Preview without activating production. The Circle idempotency key is generated on the server.
        </p>
      </ContentCard>
      <ContentCard title="Operator setup">
        <p style={body}>
          Credentials belong in Vercel Preview and Cloud Agent runtime only. Follow the operator runbook. Do not paste secrets in chat, URLs, or screenshots.
        </p>
        <p style={{ ...body, marginTop: "0.6rem" }}>
          <Link href="/developers/launchpad" style={{ color: "var(--accent)" }}>Partner Launchpad</Link>
          . Operator steps live in the repository file docs/CIRCLE_ARC_TESTNET_OPERATOR.md.
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
