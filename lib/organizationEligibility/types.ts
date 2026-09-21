import type { OrganizationEligibilityStatus, OrganizationPublicResult, OrganizationResultCategory } from "./contract";

export interface OrganizationEligibilityRecord {
  organization_ref: string;
  actor_ref: string;
  partner_hmac: string;
  audience_hash: string;
  issuer_ref: string;
  method_category: string;
  assurance_level: string;
  result_category: OrganizationResultCategory;
  policy_id: string;
  policy_version: number;
  purpose: string;
  action: string;
  action_scope: string;
  environment: "sandbox" | "production";
  status: OrganizationEligibilityStatus;
  consent_bound: boolean;
  currently_valid: boolean;
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
  withdrawn_at: string | null;
  derivation_hash: string;
  presentation_ref: string | null;
  subject_binding_hash: string | null;
}

export interface OrganizationPublicView {
  schema_version: "1.0.0";
  organization_ref: string;
  actor_ref: string;
  result_category: OrganizationResultCategory;
  result: OrganizationPublicResult;
  currently_valid: boolean;
  policy_id: string;
  policy_version: number;
  action: string;
  action_scope: string;
  environment: "sandbox" | "production";
  audience_hash: string;
  issued_at: string;
  expires_at: string;
  subject_binding_hash: string | null;
  selective_disclosure_summary: string;
  live: false;
  utila_integration: false;
}
