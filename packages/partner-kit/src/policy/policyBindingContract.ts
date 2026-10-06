export const POLICY_BINDING_ERROR_CODES = [
  "POLICY_BINDING_NOT_FOUND",
  "POLICY_BINDING_NOT_ACTIVE",
  "POLICY_BINDING_ENVIRONMENT_MISMATCH",
  "PRODUCTION_BINDING_NOT_AUTHORIZED",
  "AMBIGUOUS_POLICY_BINDING",
  "POLICY_BINDING_TENANT_MISMATCH",
  "RECEIPT_POLICY_MISMATCH",
  "RECEIPT_RESULT_FAMILY_MISMATCH",
  "RECEIPT_PACK_MISMATCH",
] as const;

export type PolicyBindingErrorCode = (typeof POLICY_BINDING_ERROR_CODES)[number];

export interface ResolvedApplicationPolicyBinding {
  binding_id: string;
  application_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  pack_id: string;
  result_family: string;
  environment: "sandbox" | "production";
  status: "active" | "retired" | "pending_review";
  binding_role: "primary" | "secondary";
  production_authorized: boolean;
  policy_production_eligible: boolean;
  created_at: string | null;
}
