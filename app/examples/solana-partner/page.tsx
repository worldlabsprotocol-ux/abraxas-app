// FILE: app/examples/solana-partner/page.tsx
// Public Solana partner reference. Gated action only. No mint, transfer, or custody.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { AbraxasSolanaPartnerAdapter, SOLANA_REF_PARTNER_ID, SOLANA_REF_POLICY_ID } from "@/lib/partner/solana";
import { SolanaPartnerExampleClient } from "@/app/examples/solana-partner/SolanaPartnerExampleClient";

export const dynamic = "force-dynamic";

export default function SolanaPartnerExamplePage() {
  const adapter = new AbraxasSolanaPartnerAdapter({
    partnerId: SOLANA_REF_PARTNER_ID,
    policyId: SOLANA_REF_POLICY_ID,
    policyVersion: 1,
    environment: "sandbox",
  });
  const startUrl = adapter.startPolicyVerification("/examples/solana-partner");

  return (
    <RedesignPage accent="developer" maxWidth={880}>
      <PageHeader
        eyebrow="Developers · Solana"
        title="Claim access after a signed receipt"
        subtitle="Without a valid Abraxas receipt the partner action stays closed. With one, the server returns allow and the partner can continue. No tokens move."
      />
      <SolanaPartnerExampleClient startUrl={startUrl} />
    </RedesignPage>
  );
}
