import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { pageMetadata } from "@/lib/seo/metadata";

import { AUTHENTICITY_VS_AUTHORITY, INSTITUTIONAL_TRUST_LEAD } from "@/lib/home/institutionalTrustPositioning";

export const metadata = pageMetadata({
  title: "Protocol: Abraxas trust infrastructure",
  description:
    "Policy-bound trust decisions with authoritative evidence, independent verification, and current authorization—without shared identity databases.",
  path: "/protocol",
});

export default function ProtocolPage() {
  return (
    <RedesignPage accent="neutral" maxWidth={880}>
      <PageHeader
        eyebrow="Protocol"
        title="Trust is continuous"
        subtitle={`${INSTITUTIONAL_TRUST_LEAD} ${AUTHENTICITY_VS_AUTHORITY}`}
      />
      <ContentCard title="Core protocol surfaces">
        <ul>
          <li>
            <Link href="/docs/partner-flow">Partner Flow</Link>: hosted eligibility requests and holder consent
          </li>
          <li>
            <Link href="/verify">Receipt verification</Link>: independent signature and authorization checks
          </li>
          <li>
            <Link href="/api/trust/registry">Trust registry API</Link>: issuers and credential schemas
          </li>
          <li>
            <Link href="/proofs/solana-devnet">Solana devnet evidence</Link>: labeled devnet transaction proofs
          </li>
        </ul>
      </ContentCard>
      <ContentCard title="For integrators">
        <p>
          Configure policies in{" "}
          <Link href="/developers/integration-studio">Integration Studio</Link>, test in sandbox, and pursue reviewed
          production activation through <Link href="/developers/launchpad">Launchpad</Link>.
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
