// FILE: app/docs/starter-kit/page.tsx

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  STARTER_KIT_CANONICAL_CONTRACT,
  STARTER_KIT_DOES_NOT_DO,
  STARTER_KIT_MINIMUM_REQUIREMENTS,
  STARTER_KIT_NOTICES,
  STARTER_KIT_PLATFORM_MATRIX,
} from "@/lib/partner/starterKit/contract";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function StarterKitDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Integration Studio"
        title="Partner starter kit generator"
        subtitle={STARTER_KIT_CANONICAL_CONTRACT}
      />
      <ContentCard title="Minimum platform requirements">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
          {STARTER_KIT_MINIMUM_REQUIREMENTS.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </ContentCard>
      <ContentCard title="Supported platforms">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {STARTER_KIT_PLATFORM_MATRIX.map((item) => (
            <li key={item.id}>
              <strong>{item.label}</strong>
              {item.canonical ? " (canonical)" : ""} — {item.note}
            </li>
          ))}
        </ul>
      </ContentCard>
      <ContentCard title="What it generates">
        <p style={body}>
          README, server route, .env.example, receipt verification, safe errors, optional webhook
          verification, a local receipt fixture, and a deployment checklist. Partner IDs, app IDs,
          keys, callbacks, and secrets are placeholders only. Reclaim proofs are verified on the
          Abraxas callback. Partners never receive the raw proof or app secrets.
        </p>
        <p style={{ ...body, marginTop: "0.65rem" }}>{STARTER_KIT_NOTICES.google}</p>
      </ContentCard>
      <ContentCard title="What this starter kit does not do">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
          {STARTER_KIT_DOES_NOT_DO.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </ContentCard>
      <ContentCard title="Open Studio">
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          Generate a zip in Integration Studio. Partner Flow docs stay the receipt contract.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/developers/integration-studio" size="sm">Open Integration Studio →</Btn>
          <Btn href="/docs/partner-flow" variant="secondary" size="sm">Partner Flow docs →</Btn>
          <Link href="/docs/trading-venue-profiles" style={{ alignSelf: "center", color: "var(--accent)", fontWeight: 700 }}>
            Trading venue profiles
          </Link>
          <Link href="/docs/multichain-mainnet-readiness" style={{ alignSelf: "center", color: "var(--accent)", fontWeight: 700 }}>
            Multi-chain Mainnet readiness
          </Link>
          <Link href="/developers/launchpad" style={{ alignSelf: "center", color: "var(--accent)", fontWeight: 700 }}>
            Partner Launchpad
          </Link>
        </div>
        <PublicJourneyNextSteps />
      </ContentCard>
    </RedesignPage>
  );
}
