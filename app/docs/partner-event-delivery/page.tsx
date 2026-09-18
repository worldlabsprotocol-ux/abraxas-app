// FILE: app/docs/partner-event-delivery/page.tsx
// Partner Event Delivery: signed lifecycle events, never authorization.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import {
  PARTNER_EVENT_ENDPOINT_REQUIREMENTS,
  PARTNER_EVENT_NOT_AUTHORIZATION,
  PARTNER_EVENT_SCHEMA_VERSION,
  expressWebhookHandlerExample,
  nextjsWebhookHandlerExample,
} from "@/lib/partner/eventDelivery";
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

export default function PartnerEventDeliveryDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Event Delivery"
        title="Receive signed lifecycle events, then verify the receipt"
        subtitle="A webhook tells you something changed. Your server still fetches the public receipt and evaluates it before any partner action."
      />
      <ContentCard title="Contract">
        <p style={body}>Schema version {PARTNER_EVENT_SCHEMA_VERSION}.</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          Production payload types: receipt.issued, receipt.revoked. Stored as partner.receipt.issued and partner.receipt.revoked.
        </p>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          receipt.expired, decision.denied, and integration.health_changed are unsupported lifecycle events on Production schemas (skip code event_type_not_supported). Production compatibility remains limited to receipt.issued, receipt.revoked, and TEST EVENT.
        </p>
        <p style={{ ...body, marginTop: "0.5rem" }}>{PARTNER_EVENT_NOT_AUTHORIZATION}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>Delivery is best effort. It is not guaranteed.</p>
        <ul style={{ ...body, marginTop: "0.75rem", paddingLeft: "1.2rem" }}>
          {PARTNER_EVENT_ENDPOINT_REQUIREMENTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ContentCard>
      <ContentCard title="Next.js webhook receiver">
        <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)" }}>
          {nextjsWebhookHandlerExample({ partnerId: "your-partner-id", policyId: "your-policy-v1", environment: "sandbox" })}
        </pre>
      </ContentCard>
      <ContentCard title="Express webhook receiver">
        <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)" }}>
          {expressWebhookHandlerExample({ partnerId: "your-partner-id", policyId: "your-policy-v1", environment: "sandbox" })}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Launchpad: <Link href="/developers/launchpad">Partner Launchpad</Link>
          {" · "}
          Kit: <Link href="/docs/integration-kit">Integration Kit</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
