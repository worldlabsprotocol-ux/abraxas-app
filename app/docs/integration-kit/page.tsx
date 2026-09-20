// FILE: app/docs/integration-kit/page.tsx
// Partner Integration Kit: pack, hosted verify, signed receipt, server verify.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import {
  CONFORMANCE_COMMAND_EXAMPLE,
  PARTNER_INTEGRATION_GOOGLE_BOUNDARY,
  PARTNER_INTEGRATION_REPLAY_BEHAVIOR,
  PARTNER_INTEGRATION_SOURCE_LEVEL,
  genericTypescriptExample,
} from "@/lib/partner/integrationKit";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function IntegrationKitDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Integration Kit"
        title="Verify a narrow signed receipt on your server"
        subtitle="Choose a policy pack, redirect the holder to Abraxas, then grant a protocol action only after server verification succeeds."
      />
      <ContentCard title="Loop">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.5rem" }}>
          <li>Select a policy pack in Partner Launchpad.</li>
          <li>Redirect the holder to the hosted verification URL.</li>
          <li>Receive callback keys only. They are not authorization.</li>
          <li>Fetch GET /api/receipts/{"{id}"}/public and evaluate with AbraxasPartnerKit.</li>
          <li>If a webhook arrives, verify the HMAC, ignore duplicates, then fetch the public receipt. Never grant access from the webhook body.</li>
        </ol>
        <p style={{ ...body, marginTop: "0.85rem" }}>{PARTNER_INTEGRATION_SOURCE_LEVEL}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>{PARTNER_INTEGRATION_GOOGLE_BOUNDARY}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>{PARTNER_INTEGRATION_REPLAY_BEHAVIOR}</p>
      </ContentCard>
      <ContentCard title="Generic TypeScript">
        <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)" }}>
          {genericTypescriptExample({ partnerId: "your-partner-id", policyId: "your-policy-v1", environment: "sandbox" })}
        </pre>
        <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", marginTop: "0.75rem" }}>
          {CONFORMANCE_COMMAND_EXAMPLE}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Studio: <Link href="/developers/integration-studio">Integration Studio</Link>
          {" · "}
          Launchpad: <Link href="/developers/launchpad">Partner Launchpad</Link>
          {" · "}
          Solana: <Link href="/docs/solana">Solana integration</Link>
          {" · "}
          Keys: <Link href="/docs/receipt-key-lifecycle">Receipt key lifecycle</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
