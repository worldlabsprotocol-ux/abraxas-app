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

export const NOT_FOUND_VERIFIER_PREVIEW: VerifierResponse = {
  state: "NULL_STATE",
  query: "ABX-UNKNOWN-000",
  resolved_type: "unknown",
  did: null,
  entity_label: null,
  asset_class: null,
  verification_status: "NOT_FOUND",
  current_pipeline_stage: null,
  issuance_timestamp: null,
  last_sync_timestamp: null,
  assurance_level: 0,
  assurance_taxonomy: {},
  anchor_block: null,
  notice: "Example — no registry record exists for this identifier.",
};

export const REVOKED_VERIFIER_PREVIEW: VerifierResponse = {
  state: "RESOLVED_REVOKED",
  query: "did:sui:demo-revoked-credential",
  resolved_type: "passport",
  did: "did:sui:demo-revoked-credential",
  entity_label: "Revoked credential (example)",
  asset_class: null,
  verification_status: "REVOKED",
  current_pipeline_stage: null,
  issuance_timestamp: "2025-06-01T00:00:00Z",
  last_sync_timestamp: "2026-05-15T00:00:00Z",
  assurance_level: 2,
  assurance_taxonomy: {
    L1_IdentityClaim: { status: "REVOKED", timestamp: "2025-06-01T00:00:00Z", provider: "Abraxas_Manual_Review" },
  },
  anchor_block: null,
  revocation_reason_code: "credential_expired",
  notice: "Example — shows how revoked credentials fail closed.",
};
