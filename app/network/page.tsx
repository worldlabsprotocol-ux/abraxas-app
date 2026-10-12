import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { SOLANA_GATE_V2_RELEASE } from "@/lib/partner/onchainGateDeployments/solanaV2Release";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Network: Abraxas evidence",
  description: "Public trust registry APIs and labeled Solana devnet proof surfaces.",
  path: "/network",
});

export default function NetworkPage() {
  return (
    <RedesignPage accent="verify" maxWidth={880}>
      <PageHeader
        eyebrow="Network"
        title="Evidence you can inspect"
        subtitle="Registry snapshots and devnet proofs are labeled by network and finality. Nothing here implies mainnet production deployment."
      />
      <ContentCard title="Trust registry">
        <p>
          <Link href="/api/trust/registry">Public registry JSON</Link>: trusted issuers and credential schemas indexed by
          Abraxas.
        </p>
      </ContentCard>
      <ContentCard title="Solana devnet (labeled)">
        <p>
          Reviewed gate release artifact: <code>{SOLANA_GATE_V2_RELEASE.program_id}</code> on Solana devnet. Verify a
          finalized transaction on the{" "}
          <Link href="/proofs/solana-devnet">devnet proof page</Link>.
        </p>
      </ContentCard>
      <ContentCard title="Independent verification">
        <p>
          Use the <Link href="/verify">receipt workbench</Link> to validate partner decision receipts server-side.
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
