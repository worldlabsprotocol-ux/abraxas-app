// FILE: app/docs/circle-arc-testnet/page.tsx
// Circle Arc testnet settlement — receipt gated, review first, explicit confirm.

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

export const dynamic = "force-dynamic";

export default function CircleArcTestnetDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers"
        title="Circle Arc testnet settlement"
        subtitle="Testnet only. Receipt gated. Review first. An explicit confirmation is required before any transfer. Funds never move automatically. Abraxas is not a custodian of customer funds."
      />
      <ContentCard title="What this is">
        <p style={body}>
          {CIRCLE_INFRASTRUCTURE_LABEL}. Network {CIRCLE_NETWORK}. Creating an intent only records a pending review row.
          Submit is a separate server step that requires `confirm_testnet_transfer`. Browser responses, callback parameters,
          client transaction hashes, and mocked provider objects cannot mark an intent settled.
        </p>
        <p style={{ ...body, marginTop: "0.6rem" }}>
          Launchpad shows only safe evidence: provider request reference, Circle transaction reference, network, currency, integer amount, state, timestamp, receipt ID, policy ID/version, and idempotency key.
        </p>
      </ContentCard>
      <ContentCard title="Fail closed">
        <p style={body}>
          Unsigned, denied, expired, revoked, wrong-partner, wrong-policy, and login-only receipts cannot settle.
          Circle does not ask for identity. Use a policy-qualified signed receipt. Duplicate intents return {CIRCLE_PUBLIC_CODES.duplicate}.
          Production Vercel never activates Circle.
        </p>
        <p style={{ ...body, marginTop: "0.6rem" }}>
          <Link href="/docs/partner-flow" style={{ color: "var(--accent)" }}>Partner Flow docs</Link>
          {" · "}
          <Link href="/developers/launchpad" style={{ color: "var(--accent)" }}>Partner Launchpad</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
