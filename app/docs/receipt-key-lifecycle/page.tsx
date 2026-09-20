// FILE: app/docs/receipt-key-lifecycle/page.tsx
// Receipt verification-key lifecycle. Public material only. Not a key dashboard.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  RECEIPT_KEY_LIFECYCLE_ARCHITECTURE,
  RECEIPT_KEY_OPERATOR_STEPS,
  RECEIPT_KEY_PARTNER_NOTICE,
  RECEIPT_VERIFICATION_KEY_ALGORITHM,
  receiptVerificationKeyExample,
} from "@/lib/decisionReceipts/verificationKeyLifecycle";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function ReceiptKeyLifecycleDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Receipt verification keys"
        title="Rotate and retire receipt-signing verification keys"
        subtitle={`${RECEIPT_KEY_PARTNER_NOTICE} Algorithm remains ${RECEIPT_VERIFICATION_KEY_ALGORITHM}. Historical receipts are not re-signed.`}
      />

      <ContentCard title="What this is">
        <p style={body}>
          Abraxas signs eligibility receipts with an environment-scoped Ed25519 key. Partners verify
          the public receipt, including signature_valid and currently_valid. This registry lets
          operators rotate or revoke verification keys without exposing private signing material
          and without silently trusting unknown key IDs.
        </p>
        <p style={{ ...body, marginTop: "0.6rem" }}>
          This is not a key-management dashboard, browser key editor, self-service Production issuer,
          or blockchain key registry.
        </p>
      </ContentCard>

      <ContentCard title="Architecture">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {RECEIPT_KEY_LIFECYCLE_ARCHITECTURE}
        </pre>
      </ContentCard>

      <ContentCard title="Operator rotation">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {RECEIPT_KEY_OPERATOR_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </ContentCard>

      <ContentCard title="Partner trust document">
        <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)" }}>
          {receiptVerificationKeyExample()}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Public receipt: <Link href="/docs/partner-flow">Partner Flow</Link>
          {" · "}
          Kit: <Link href="/docs/integration-kit">Integration Kit</Link>
          {" · "}
          Actions: <Link href="/docs/portable-action-contract">Portable action contract</Link>
          {" · "}
          Mainnet: <Link href="/docs/multichain-mainnet-readiness">Mainnet readiness</Link>
        </p>
      </ContentCard>
      <PublicJourneyNextSteps />
    </RedesignPage>
  );
}
