// FILE: app/docs/trading-venue/page.tsx
// Public Trading Venue Adapter docs. Venue-neutral preflight. Not an exchange.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  TRADING_VENUE_ARCHITECTURE_DIAGRAM,
  TRADING_VENUE_FLOW,
  TRADING_VENUE_LIVE_INTEGRATION_REQUIREMENTS,
  TRADING_VENUE_NO_FUNDS_BOUNDARY,
  TRADING_VENUE_NO_VENUE_PARTNERSHIP,
  TRADING_VENUE_NOT_A_MARKET,
  TRADING_VENUE_PRIVACY_CONTRACT,
  TRADING_VENUE_VERIFICATION_REUSE,
  TRADING_VENUE_WALLET_BINDING_FUTURE,
  tradingVenueServerPreflightExample,
} from "@/lib/partner/tradingVenue";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function TradingVenueDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Trading venue adapter"
        title="Ask Abraxas whether one venue action may proceed"
        subtitle={`${TRADING_VENUE_NOT_A_MARKET} ${TRADING_VENUE_NO_VENUE_PARTNERSHIP}`}
      />

      <ContentCard title="Architecture">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {TRADING_VENUE_ARCHITECTURE_DIAGRAM}
        </pre>
        <p style={{ ...body, marginTop: "0.85rem" }}>{TRADING_VENUE_FLOW}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>{TRADING_VENUE_VERIFICATION_REUSE}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>{TRADING_VENUE_NO_FUNDS_BOUNDARY}</p>
      </ContentCard>

      <ContentCard title="Action contract">
        <p style={body}>
          The venue server issues a contract with partner, policy and version, action type,
          a narrow scope, expiry, and a one-time nonce. The only sandbox action is Enable market access.
          Wallet binding stays <strong>{TRADING_VENUE_WALLET_BINDING_FUTURE.status}</strong> so a later
          Wallet Standard attachment can sit on the binding without changing receipt semantics.
        </p>
      </ContentCard>

      <ContentCard title="Privacy contract">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {TRADING_VENUE_PRIVACY_CONTRACT.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </ContentCard>

      <ContentCard title="Server side preflight">
        <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)" }}>
          {tradingVenueServerPreflightExample()}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Studio: <Link href="/developers/integration-studio">Integration Studio</Link>
          {" · "}
          Kit: <Link href="/docs/integration-kit">Partner Integration Kit</Link>
          {" · "}
          Reference: <Link href="/examples/trading-venue">Enable market access example</Link>
        </p>
      </ContentCard>

      <ContentCard title="Future live venue integration">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {TRADING_VENUE_LIVE_INTEGRATION_REQUIREMENTS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </ContentCard>
    </RedesignPage>
  );
}
