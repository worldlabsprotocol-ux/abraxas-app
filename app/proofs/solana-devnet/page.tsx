import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { SolanaDevnetProofClient } from "@/components/partner/SolanaDevnetProofClient";

export const dynamic = "force-dynamic";

export default function SolanaDevnetProofPage({
  searchParams,
}: {
  searchParams: { signature?: string | string[] };
}) {
  const signature = typeof searchParams.signature === "string" ? searchParams.signature.trim() : "";
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Solana devnet"
        title="Verify institutional access on Solana"
        subtitle="Check a finalized Abraxas authorization and protocol-access transaction against the reviewed devnet bindings and current onchain accounts."
      />
      <ContentCard title="Transaction proof">
        <SolanaDevnetProofClient signature={signature} />
      </ContentCard>
      <ContentCard title="What this proves">
        <p>
          A verified result means a successful finalized transaction contained the reviewed Ed25519 verification,
          gate authorization, and protocol-access activation instructions in order. The current authorization and
          entitlement accounts must match the signed attestation. Expiration is shown separately from historical
          execution. This check does not prove a broadcast replay attempt, production approval, or mainnet access.
        </p>
        <p>
          No transaction signature yet? See the <Link href="/docs/solana-onchain-eligibility-gate">Solana gate documentation</Link>.
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
