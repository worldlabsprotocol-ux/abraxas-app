// FILE: app/docs/payment-authorization/page.tsx
// Public Payment Authorization Adapter docs. Not a processor.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  PAYMENT_AUTHORIZATION_ARCHITECTURE_DIAGRAM,
  PAYMENT_AUTHORIZATION_CIRCLE_SEPARATION,
  PAYMENT_AUTHORIZATION_FLOW,
  PAYMENT_AUTHORIZATION_LIVE_INTEGRATION_REQUIREMENTS,
  PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY,
  PAYMENT_AUTHORIZATION_NOT_A_PROCESSOR,
  PAYMENT_AUTHORIZATION_PRIVACY_CONTRACT,
  PAYMENT_AUTHORIZATION_VERIFICATION_REUSE,
  paymentAuthorizationServerExample,
} from "@/lib/partner/paymentAuthorization";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function PaymentAuthorizationDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Payment and commerce"
        title="Ask Abraxas whether one payment action may proceed"
        subtitle={`${PAYMENT_AUTHORIZATION_NOT_A_PROCESSOR} ${PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY}`}
      />

      <ContentCard title="Architecture">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", maxWidth: "100%", boxSizing: "border-box", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {PAYMENT_AUTHORIZATION_ARCHITECTURE_DIAGRAM}
        </pre>
        <p style={{ ...body, marginTop: "0.85rem" }}>{PAYMENT_AUTHORIZATION_FLOW}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>{PAYMENT_AUTHORIZATION_VERIFICATION_REUSE}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>{PAYMENT_AUTHORIZATION_CIRCLE_SEPARATION}</p>
      </ContentCard>

      <ContentCard title="Action contract">
        <p style={body}>
          The merchant server issues a contract with partner, policy and version, action type,
          a narrow payment scope, expiry, and a one-time durable nonce. Sandbox actions are
          authorize checkout and authorize recurring payment. An allowed result is not a charge.
        </p>
      </ContentCard>

      <ContentCard title="Privacy contract">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {PAYMENT_AUTHORIZATION_PRIVACY_CONTRACT.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </ContentCard>

      <ContentCard title="Server side preflight">
        <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", maxWidth: "100%", boxSizing: "border-box", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)" }}>
          {paymentAuthorizationServerExample()}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Studio: <Link href="/developers/integration-studio">Integration Studio</Link>
          {" · "}
          Kit: <Link href="/docs/integration-kit">Partner Integration Kit</Link>
          {" · "}
          Reference: <Link href="/examples/payment-authorization">Checkout authorization example</Link>
        </p>
      </ContentCard>

      <ContentCard title="Future live payment partner integration">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {PAYMENT_AUTHORIZATION_LIVE_INTEGRATION_REQUIREMENTS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </ContentCard>
    </RedesignPage>
  );
}
