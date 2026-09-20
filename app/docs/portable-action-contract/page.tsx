// FILE: app/docs/portable-action-contract/page.tsx
// Public portable action-contract docs. Preflight only. Never executes.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  PORTABLE_ACTION_ARCHITECTURE_DIAGRAM,
  PORTABLE_ACTION_BOUNDARY,
  PORTABLE_ACTION_NOT_EXECUTION,
  PORTABLE_ACTION_PRIVACY_CONTRACT,
  PORTABLE_ACTION_WEBHOOK_NOTICE,
  portableActionServerExample,
} from "@/lib/partner/portableActionContract";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function PortableActionContractDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Portable action contract"
        title="Preflight one named partner action"
        subtitle={`${PORTABLE_ACTION_BOUNDARY} ${PORTABLE_ACTION_NOT_EXECUTION}`}
      />

      <ContentCard title="Architecture">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {PORTABLE_ACTION_ARCHITECTURE_DIAGRAM}
        </pre>
        <p style={{ ...body, marginTop: "0.85rem" }}>{PORTABLE_ACTION_WEBHOOK_NOTICE}</p>
      </ContentCard>

      <ContentCard title="What allowed means">
        <p style={body}>
          An allowed result means the partner may perform its own named action. Abraxas never
          grants membership, submits a trade, charges a card, signs a transaction, or calls a
          protocol. Trading Venue Adapter still uses enable_market_access. Payment Authorization
          Adapter still uses authorize_checkout and authorize_recurring_payment. Solana remains a
          no-funds eligibility gate. Wallet Standard stays message-only.
        </p>
      </ContentCard>

      <ContentCard title="Examples">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          <li>Membership / access: grant_membership_access in sandbox:membership_access.</li>
          <li>Trading market access: enable_market_access in sandbox:market_access.</li>
          <li>Payment authorization: authorize_checkout or authorize_recurring_payment.</li>
          <li>Generic partner protocol: partner_protocol_action in sandbox:partner_protocol.</li>
          <li>EVM partner eligibility: enable_protocol_access, enable_member_access, enable_redemption_access.</li>
        </ul>
      </ContentCard>

      <ContentCard title="Privacy contract">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {PORTABLE_ACTION_PRIVACY_CONTRACT.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Canonical disclosure: <Link href="/docs/selective-disclosure">Selective disclosure</Link>
        </p>
      </ContentCard>

      <ContentCard title="Server side preflight">
        <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)" }}>
          {portableActionServerExample()}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Studio: <Link href="/developers/integration-studio">Integration Studio</Link>
          {" · "}
          Kit: <Link href="/docs/integration-kit">Partner Integration Kit</Link>
          {" · "}
          Venue: <Link href="/docs/trading-venue">Trading venue</Link>
          {" · "}
          Payment: <Link href="/docs/payment-authorization">Payment authorization</Link>
          {" · "}
          Networks: <Link href="/docs/multichain-mainnet-readiness">Mainnet readiness</Link>
          {" · "}
          EVM: <Link href="/docs/evm-partner-adapter">EVM partner adapter</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
