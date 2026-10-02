// FILE: lib/gtm/contract.ts
// GTM alignment contract — discovery, proof labels, routing, and copy constants.

export const GTM_SCHEMA_VERSION = "1.0.0" as const;

export const GTM_DISCOVERY_STORAGE_KEY = "abx_gtm_discovery_v1" as const;

export const GTM_ONE_SENTENCE_DESCRIPTION =
  "Turn existing KYC into reusable, app-specific verified answers without passing around identity files." as const;

export const GTM_PRIMARY_COMMERCIAL_MESSAGE =
  "Stop re-verifying the same customer across every app." as const;

export const GTM_PRIMARY_CTA_LABEL = "See reuse across two apps" as const;
export const GTM_PRIMARY_CTA_HREF = "/proof" as const;

export const GTM_SECONDARY_CTA_LABEL = "Build in sandbox" as const;
export const GTM_SECONDARY_CTA_HREF =
  "/developers/integration-studio?outcome=reuse_across_app&source=gtm-home" as const;

export const GTM_TERTIARY_CTA_LABEL = "Talk through your stack" as const;
export const GTM_TERTIARY_CTA_HREF = "/integrate" as const;

export const PROOF_CLASSIFICATION_LABELS = {
  production_proof: "Production proof",
  reference_proof: "Reference proof",
  technical_proof: "Technical proof",
  architectural_proof: "Architectural proof",
} as const;

export type ProofClassification = keyof typeof PROOF_CLASSIFICATION_LABELS;

export const GTM_INDUSTRY_OPTIONS = [
  { id: "fintech_digital_assets", label: "Fintech / digital assets / payments" },
  { id: "wallet_infrastructure", label: "Wallet or custody infrastructure" },
  { id: "marketplace", label: "Marketplace or platform" },
  { id: "age_restricted_commerce", label: "Age-restricted commerce" },
  { id: "media_content", label: "Media / content platform" },
  { id: "other", label: "Other regulated digital product" },
] as const;

export type GtmIndustryCategory = (typeof GTM_INDUSTRY_OPTIONS)[number]["id"];

export const GTM_APP_COUNT_OPTIONS = [
  { id: "1", label: "1" },
  { id: "2_3", label: "2–3" },
  { id: "4_plus", label: "4+" },
] as const;

export type GtmAppCountBand = (typeof GTM_APP_COUNT_OPTIONS)[number]["id"];

export const GTM_KYC_VENDOR_OPTIONS = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
] as const;

export type GtmHasKycVendor = (typeof GTM_KYC_VENDOR_OPTIONS)[number]["id"];

export const GTM_PRIMARY_PAIN_OPTIONS = [
  { id: "repeat_verification", label: "Repeat verification" },
  { id: "over_collection", label: "Too much identity data moving between applications" },
  { id: "slow_launches", label: "Slow launches / repeated integration work" },
  { id: "auditability", label: "Auditability / proving why an action was allowed" },
  { id: "other", label: "Something else" },
] as const;

export type GtmPrimaryPain = (typeof GTM_PRIMARY_PAIN_OPTIONS)[number]["id"];

export interface GtmDiscoveryAnswers {
  industry: GtmIndustryCategory;
  app_count_band: GtmAppCountBand;
  has_kyc_vendor: GtmHasKycVendor;
  primary_pain: GtmPrimaryPain;
  completed_at?: string;
}

export type GtmProofPackId =
  | "institutional_reuse"
  | "narrow_disclosure"
  | "policy_integration"
  | "generic_reusable";

export interface GtmRoutingResult {
  proof_pack: GtmProofPackId;
  recommended_studio_href: string;
  headline: string;
  summary: string;
  show_institutional_reference: boolean;
  show_good_trouble: boolean;
  emphasize_keep_provider: boolean;
}

export const GTM_ACQUISITION_EVENT_TYPES = [
  "discovery_started",
  "discovery_completed",
  "proof_pack_viewed",
  "sandbox_created",
  "reuse_demo_started",
  "reuse_demo_completed",
  "design_partner_cta_clicked",
] as const;

export type GtmAcquisitionEventType = (typeof GTM_ACQUISITION_EVENT_TYPES)[number];

export interface GtmAcquisitionEventAttributes {
  industry_category?: GtmIndustryCategory;
  app_count_band?: GtmAppCountBand;
  has_kyc_vendor?: GtmHasKycVendor;
  primary_pain?: GtmPrimaryPain;
  proof_pack?: GtmProofPackId;
  recommended_path?: string;
  environment?: "sandbox" | "production" | "reference";
}

export const GTM_PROHIBITED_CLAIM_PATTERNS = [
  /\breplace your kyc provider\b/i,
  /\breplace (your )?kyc\b/i,
  /\bone kyc forever\b/i,
  /\bnever store identity\b/i,
  /\bzero custody\b/i,
  /\bbank-?grade\b/i,
  /\bregulator(y)? approved\b/i,
  /\bhipaa ready\b/i,
  /\bproduction institutional customer\b/i,
  /\blive utila integration\b/i,
  /\bkyc\/kyb complete\b/i,
  /\bkyt replacement\b/i,
] as const;
