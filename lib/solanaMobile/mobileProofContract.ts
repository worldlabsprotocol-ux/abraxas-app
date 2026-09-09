// FILE: lib/solanaMobile/mobileProofContract.ts
// Shared proof contracts for Solana Mobile MVP — aligned with browse + purchase receipts.

export const BROWSE_ARTIFACT_TYPE = "browse_access_receipt" as const;
export const PURCHASE_ARTIFACT_TYPE = "eligibility_decision_receipt" as const;

export const GOOD_TROUBLE_PARTNER_ID = "good-trouble-cannabis";
export const BROWSE_POLICY_ID = "good-trouble-browse-v1";
export const PURCHASE_POLICY_ID = "good-trouble-retail-v1";

export type AssuranceLevel = "L0" | "L1" | "L2" | "L3" | "L4";

export interface BrowseAccessProof {
  artifact_type: typeof BROWSE_ARTIFACT_TYPE;
  purpose: "browse";
  valid_for_purchase: false;
  assurance_level: "L0";
  partner_id: string;
  policy_id: string;
  age_band: "over_21";
  receipt_id: string;
  issued_at: string;
  expires_at: string;
}

export interface EligibilityDecisionProof {
  artifact_type: typeof PURCHASE_ARTIFACT_TYPE;
  purpose: "purchase";
  assurance_level: AssuranceLevel;
  partner_id: string;
  policy_id: string;
  decision_result: "approved" | "denied";
  over_21: boolean;
  receipt_id: string;
  issued_at: string;
  expires_at: string;
  valid_for_purchase: true;
}

export type MobileProof = BrowseAccessProof | EligibilityDecisionProof;

export const NEVER_SHARED_FIELDS = [
  "date_of_birth",
  "dob",
  "legal_name",
  "address",
  "document_number",
  "passport_image",
  "selfie",
  "oauth_sub",
] as const;
