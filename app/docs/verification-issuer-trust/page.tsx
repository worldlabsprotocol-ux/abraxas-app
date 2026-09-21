// FILE: app/docs/verification-issuer-trust/page.tsx

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { CSSProperties } from "react";
import { VERIFICATION_ISSUER_TRUST_NOTICE } from "@/lib/verification/issuerTrust/contract";

const FONT = ABRAXAS_FONT_SANS;
const body: CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function VerificationIssuerTrustDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Protocol · Issuer trust"
        title="Which verification methods a policy may trust"
        subtitle={VERIFICATION_ISSUER_TRUST_NOTICE}
      />
      <ContentCard title="What the registry is">
        <p style={body}>
          The Verification Issuer Trust Registry is server-owned configuration. It names method
          families, assurance, result categories, subject-binding, environments, and disclosure
          boundaries. It does not store API keys, OAuth, endpoints, evidence, or wallets.
        </p>
      </ContentCard>
      <ContentCard title="Qualification">
        <p style={body}>
          Partner Flow still qualifies methods on the server. A holder sees only that the policy
          requires an approved verification method. Google remains account access, not eligibility.
          Private evidence stays withheld.
        </p>
      </ContentCard>
      <ContentCard title="Planned versus integrated">
        <p style={body}>
          Integrated records map to verification paths that already exist in this repository.
          Planned or review-required records are operator planning only. They are not holder or
          partner selectable verified routes. A registry entry is not a provider partnership or a
          live verification guarantee.
        </p>
      </ContentCard>
      <ContentCard title="Where this connects">
        <p style={body}>
          <Link href="/docs/policy-release-candidates">Release candidates</Link>
          {" · "}
          <Link href="/docs/policy-proposals">Policy proposals</Link>
          {" · "}
          <Link href="/docs/selective-disclosure">Selective disclosure</Link>
          {" · "}
          <Link href="/docs/reusable-eligibility">Reusable eligibility</Link>
          {" · "}
          <Link href="/docs/partner-flow">Partner Flow</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
