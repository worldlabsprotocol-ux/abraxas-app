// FILE: app/partner/tiered-age-preview/page.tsx
// Preview-only Tier 1 browse self-attestation — real SelfAttestationBrowseForm, not purchase eligibility.

import { notFound } from "next/navigation";
import { PartnerJourneyLayout } from "@/components/partner/PartnerJourneyLayout";
import { SelfAttestationBrowseForm } from "@/components/partner/SelfAttestationBrowseForm";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_BRAND,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";
import { isTieredAgePreviewAllowed } from "@/lib/partner/partnerPreviewGate";

export const TIERED_AGE_PREVIEW_PURPOSE = "browse" as const;

export default function TieredAgePreviewPage() {
  if (!isTieredAgePreviewAllowed()) {
    notFound();
  }

  const partnerName = GOOD_TROUBLE_BRAND.name;

  return (
    <div id="tiered-age-browse-preview" style={{ padding: "1rem" }}>
      <PartnerJourneyLayout
        partnerName={partnerName}
        intro="Tier 1 browse preview — self-attestation only (L0)."
        statusMessage="Preview environment: browsing access only. Checkout requires separate L2+ verification."
        partnerHomeUrl={GOOD_TROUBLE_BRAND.website}
        partnerReturnLabel={`Return to ${partnerName}`}
      >
        <div
          role="status"
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            border: "1px solid var(--border-subtle, #444)",
            background: "var(--surface-muted, rgba(255,255,255,0.04))",
            fontSize: "0.85rem",
            lineHeight: 1.6,
          }}
        >
          <strong>Preview only.</strong> This page renders the production{" "}
          <code>SelfAttestationBrowseForm</code> for{" "}
          <code>purpose={TIERED_AGE_PREVIEW_PURPOSE}</code>,{" "}
          <code>partner_id={GOOD_TROUBLE_PARTNER_ID}</code>, and{" "}
          <code>policy_id={GOOD_TROUBLE_BROWSE_POLICY_ID}</code>. It does not create
          or simulate regulated purchase eligibility.
        </div>

        <SelfAttestationBrowseForm
          partnerId={GOOD_TROUBLE_PARTNER_ID}
          policyId={GOOD_TROUBLE_BROWSE_POLICY_ID}
          partnerName={partnerName}
          returnUrl={GOOD_TROUBLE_BRAND.website}
        />
      </PartnerJourneyLayout>
    </div>
  );
}
