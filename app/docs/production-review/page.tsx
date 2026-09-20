// FILE: app/docs/production-review/page.tsx
// Operator Production-review control plane. Not an automatic launch.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PRODUCTION_REVIEW_NOTICE, PRODUCTION_REVIEW_PATH } from "@/lib/partner/launchpad/productionReview/contract";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function ProductionReviewDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Operators · Production review"
        title="Review a pending Production-access request"
        subtitle={PRODUCTION_REVIEW_NOTICE}
      />
      <ContentCard title="Before and after">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
          <li>Partner completes sandbox readiness and submits a reviewed Production request in Launchpad.</li>
          <li>An authorized operator opens the operator-only queue and inspects server-derived evidence.</li>
          <li>Approve or reject only a pending request. Replay returns the existing decision.</li>
          <li>Approval does not issue a production key, activate Mainnet, or execute anything. Those remain later explicit steps.</li>
          <li>Rejection lets the partner remediate and submit a new request. Historical decisions stay recorded.</li>
        </ol>
      </ContentCard>
      <ContentCard title="What the operator sees">
        <p style={body}>
          Safe app label, pinned policy and version, selected capabilities, sandbox readiness class,
          test-console and webhook health classes, policy-version compatibility, requested network
          postures, a sanitized note, timestamp, and an opaque request reference. Keys, receipts,
          claims, signatures, wallets, callback URLs, OAuth data, and raw database errors are withheld.
        </p>
      </ContentCard>
      <ContentCard title="Authorization">
        <p style={body}>
          This surface reuses existing server-side admin authorization. A browser role flag is never
          authority. It is not part of partner Launchpad navigation.
          {" "}
          <Link href={PRODUCTION_REVIEW_PATH}>Operator queue</Link>
          {" · "}
          <Link href="/docs/production-credentials">Production credentials</Link>
          {" · "}
          <Link href="/docs/multichain-mainnet-readiness">Mainnet readiness</Link>
          {" · "}
          <Link href="/docs/sandbox-conformance">Sandbox partner contract</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
