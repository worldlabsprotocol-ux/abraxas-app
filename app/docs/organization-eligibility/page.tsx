// FILE: app/docs/organization-eligibility/page.tsx

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  ORGANIZATION_ELIGIBILITY_NOTICE,
  ORGANIZATION_NO_WALLET_KYB,
  ORGANIZATION_UTILA_NOTICE,
  ORGANIZATION_PUBLIC_RESULT_FIELDS,
  ORGANIZATION_DEMO_SQL_EDITOR,
  ORGANIZATION_MIGRATION_FILE,
} from "@/lib/organizationEligibility/contract";
import { organizationPolicyPublicCatalog } from "@/lib/organizationEligibility/policies";
import { organizationEligibilityServerExample } from "@/lib/organizationEligibility/examples";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function OrganizationEligibilityDocsPage() {
  const catalog = organizationPolicyPublicCatalog();
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Protocol · Organization eligibility"
        title="Private organization and authorized-signer eligibility"
        subtitle={ORGANIZATION_ELIGIBILITY_NOTICE}
      />
      <ContentCard title="What this is">
        <p style={body}>{ORGANIZATION_NO_WALLET_KYB}</p>
        <p style={body}>{ORGANIZATION_UTILA_NOTICE}</p>
      </ContentCard>
      <ContentCard title="Reviewed policy contracts">
        <ul style={{ ...body, paddingLeft: 18 }}>
          {catalog.contracts.map((row) => (
            <li key={row.id} style={{ marginBottom: 8 }}>
              <code>{row.id}</code> — minimum {row.minimum_method} {row.minimum_assurance}. Not self-publishable. Not automatically active.
            </li>
          ))}
        </ul>
        <p style={body}>
          Catalog path is Policy Proposal → Release Candidate → reviewed source change. Missing reviewed issuer mapping fails closed. Reclaim stays sandbox or integration-ready until a reviewed organization provider mapping exists.
        </p>
      </ContentCard>
      <ContentCard title="Client-visible result fields">
        <p style={body}>{ORGANIZATION_PUBLIC_RESULT_FIELDS.join(", ")}</p>
      </ContentCard>
      <ContentCard title="Migration">
        <p style={body}>
          DEMO-first file <code>{ORGANIZATION_MIGRATION_FILE}</code>. Apply in the DEMO SQL editor only:{" "}
          <Link href={ORGANIZATION_DEMO_SQL_EDITOR}>{ORGANIZATION_DEMO_SQL_EDITOR}</Link>. Do not auto-apply.
        </p>
      </ContentCard>
      <ContentCard title="Server example">
        <pre style={{ ...body, whiteSpace: "pre-wrap", fontFamily: "var(--font-mono, monospace)", fontSize: "0.75rem" }}>
          {organizationEligibilityServerExample()}
        </pre>
      </ContentCard>
      <ContentCard title="Where this connects">
        <p style={body}>
          <Link href="/docs/eligibility-presentation-protocol">Eligibility presentation</Link>
          {" · "}
          <Link href="/docs/verification-issuer-trust">Issuer trust</Link>
          {" · "}
          <Link href="/docs/portable-action-contract">Portable action contract</Link>
          {" · "}
          <Link href="/docs/evm-onchain-eligibility-gate">EVM gate</Link>
          {" · "}
          <Link href="/docs/solana-onchain-eligibility-gate">Solana gate</Link>
        </p>
        <PublicJourneyNextSteps />
      </ContentCard>
    </RedesignPage>
  );
}
