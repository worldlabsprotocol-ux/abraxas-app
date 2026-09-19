// FILE: app/examples/trading-venue/page.tsx
// Public venue preflight reference. Enable market access only. No trades.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { AbraxasTradingVenueAdapter, VENUE_REF_PARTNER_ID, VENUE_REF_POLICY_ID } from "@/lib/partner/tradingVenue";
import { TradingVenueExampleClient } from "@/app/examples/trading-venue/TradingVenueExampleClient";

export const dynamic = "force-dynamic";

export default function TradingVenueExamplePage() {
  const adapter = new AbraxasTradingVenueAdapter({
    partnerId: VENUE_REF_PARTNER_ID,
    policyId: VENUE_REF_POLICY_ID,
    policyVersion: 1,
    environment: "sandbox",
  });
  const startUrl = adapter.startPolicyVerification("/examples/trading-venue");

  return (
    <RedesignPage accent="developer" maxWidth={880}>
      <PageHeader
        eyebrow="Developers · Trading venue"
        title="Enable market access after a signed receipt"
        subtitle="A venue asks Abraxas whether one sandbox action may proceed. This is not an exchange, wallet, or order router."
      />
      <TradingVenueExampleClient startUrl={startUrl} />
    </RedesignPage>
  );
}
