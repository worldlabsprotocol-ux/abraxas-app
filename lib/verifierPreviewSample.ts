// FILE: lib/verifierPreviewSample.ts
// Static sample for /verify preview — matches live Cielo registry response.

import type { VerifierResponse } from "@/lib/verifyRegistry";

export const CIELO_VERIFIER_PREVIEW: VerifierResponse = {
  state: "RESOLVED_VALID",
  query: "ABX-RE-HOSP-001",
  resolved_type: "asset",
  did: "did:sui:cielo-abx-re-hosp-001",
  entity_label: "Cielo Sunrise",
  asset_class: "REAL_ESTATE_HOSPITALITY",
  verification_status: "RESOLVED_VALID",
  current_pipeline_stage: "MARKETPLACE_LIVE",
  issuance_timestamp: "2025-11-01T00:00:00Z",
  last_sync_timestamp: "2026-07-03T04:15:00Z",
  assurance_level: 3,
  assurance_taxonomy: {
    L1_IdentityClaim: { status: "VERIFIED", timestamp: "2025-11-01T00:00:00Z", provider: "Veriff_Biometric_IDV" },
    L2_LegalReview: { status: "VERIFIED", timestamp: "2025-11-15T00:00:00Z", provider: "Fannin_County_Deed_Review" },
    L3_ProfessionalAttestation: { status: "VERIFIED", timestamp: "2025-12-01T00:00:00Z", authority: "Independent_Appraisal_V5" },
    L4_ActiveMonitoring: { status: "ACTIVE", lastSync: "2026-07-03T04:15:00Z", oracleSource: "Airbnb_Listing_CrossCheck" },
  },
  anchor_block: null,
  metadata_uri: "/flagship",
  notice:
    "Example result — paste ABX-RE-HOSP-001 above to run a live check against the registry API.",
};
