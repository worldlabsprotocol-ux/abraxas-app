// FILE: app/docs/trading-venue-profiles/page.tsx
// Venue integration profiles. Preflight only. No partnership or execution.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  VENUE_MAINNET_EXTERNAL_REQUIREMENTS,
  VENUE_PROFILE_ARCHITECTURE,
  VENUE_PROFILE_NEXT_STEPS,
  VENUE_PROFILE_NO_PARTNERSHIP,
  VENUE_PROFILE_PREFLIGHT_ONLY,
  publicVenueProfileMatrix,
  tradingVenueProfileExample,
} from "@/lib/partner/tradingVenue/profiles";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function TradingVenueProfilesDocsPage() {
  const matrix = publicVenueProfileMatrix();
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Trading venue profiles"
        title="Preflight a named venue action through a server-owned profile"
        subtitle={`${VENUE_PROFILE_PREFLIGHT_ONLY} ${VENUE_PROFILE_NO_PARTNERSHIP}`}
      />

      <ContentCard title="Architecture">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {VENUE_PROFILE_ARCHITECTURE}
        </pre>
      </ContentCard>

      <ContentCard title="Profiles">
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {matrix.map((row) => (
            <div key={row.profile_id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.75rem" }}>
              <strong style={{ fontFamily: FONT }}>{row.label}</strong>
              <p style={{ ...body, marginTop: "0.35rem", fontFamily: MONO, fontSize: "0.75rem" }}>
                {row.profile_id} · {row.ecosystem} · {row.posture.replace(/_/g, " ")} · live: never
              </p>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Hyperliquid-class profile">
        <p style={body}>
          `hyperliquid_trading_venue` is sandbox preflight for enable_market_access. Abraxas does not
          call Hyperliquid APIs, read accounts or positions, fetch market data, or submit orders.
          Hyperliquid does not endorse, use, or partner with Abraxas by appearing in this registry.
        </p>
      </ContentCard>

      <ContentCard title="Sandbox next steps">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
          {VENUE_PROFILE_NEXT_STEPS.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </ContentCard>

      <ContentCard title="Before any venue Mainnet integration">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
          {VENUE_MAINNET_EXTERNAL_REQUIREMENTS.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", marginTop: "0.85rem", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)" }}>
          {tradingVenueProfileExample("hyperliquid_trading_venue")}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Adapter: <Link href="/docs/trading-venue">Trading venue adapter</Link>
          {" · "}
          Actions: <Link href="/docs/portable-action-contract">Portable action contract</Link>
          {" · "}
          Mainnet: <Link href="/docs/multichain-mainnet-readiness">Mainnet readiness</Link>
          {" · "}
          Studio: <Link href="/developers/integration-studio">Integration Studio</Link>
          {" · "}
          Kits: <Link href="/docs/starter-kit">Starter kits</Link>
        </p>
      </ContentCard>
      <PublicJourneyNextSteps />
    </RedesignPage>
  );
}
