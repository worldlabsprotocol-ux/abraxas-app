// FILE: lib/partner/externalActivation/contract.ts
// Backend-derived developer activation contract. One canonical self-serve path.

import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";

export const EXTERNAL_ACTIVATION_PATH = "/developers/integration-studio" as const;
export const EXTERNAL_ACTIVATION_QUICKSTART = "/docs/VERIFY_WITH_ABRAXAS_QUICKSTART" as const;
export const EXTERNAL_ACTIVATION_DEFAULT_PATH: IntegrationStudioPathId = "verify_with_abraxas";
export const EXTERNAL_ACTIVATION_FAST_PROOF_PACK = "sandbox_economic_demo" as const;

export const DEVELOPER_ACTIVATION_STATES = [
  "application_created",
  "policy_selected",
  "callback_configured",
  "credential_issued",
  "integration_generated",
  "first_request_created",
  "first_receipt_issued",
  "first_result_verified",
  "production_requested",
  "production_activated",
] as const;

export type DeveloperActivationStateId = (typeof DEVELOPER_ACTIVATION_STATES)[number];

export interface DeveloperActivationStage {
  id: DeveloperActivationStateId;
  label: string;
  complete: boolean;
  at: string | null;
  source: string;
}

export interface DeveloperActivationView {
  contract_version: "1.0.0";
  current_state: DeveloperActivationStateId;
  stages: DeveloperActivationStage[];
  sandbox_complete: boolean;
  first_proof_complete: boolean;
  production_requested: boolean;
  production_activated: boolean;
  primary_action: {
    label: string;
    detail: string;
    cta: string;
    href: string | null;
  };
  next_action: {
    label: string;
    detail: string;
    href: string | null;
  } | null;
}

export interface DeveloperIntegrationSummary {
  application_id: string;
  application_name: string;
  partner_id: string;
  public_slug: string;
  policy_pack_id: string;
  policy_label: string;
  policy_id: string;
  policy_version: number;
  environment: "sandbox";
  callback_url: string | null;
  callback_configured: boolean;
  application_id_field: string;
  credential_status: "active" | "never_issued" | "revoked";
  credential_prefix: string | null;
  integration_method: "verify_with_abraxas";
  result_family: string;
  expected_narrow_fields: string[];
  withheld_fields: string[];
}

export interface DeveloperTimeToProofMetrics {
  application_created_at: string;
  first_verification_request_at: string | null;
  first_receipt_issued_at: string | null;
  first_verified_result_at: string | null;
  time_to_first_request_ms: number | null;
  time_to_first_receipt_ms: number | null;
  time_to_first_verified_result_ms: number | null;
}

export interface DeveloperIntegrationHealthItem {
  id: string;
  label: string;
  status: "ready" | "pending" | "failed";
  detail: string | null;
}

export interface DeveloperIntegrationHealthView {
  items: DeveloperIntegrationHealthItem[];
  recent_failure_category: string | null;
  sandbox_labeled: true;
}

export const FIRST_PROOF_NOTICE =
  "SANDBOX TEST — This first proof issues a real persisted sandbox receipt labeled sandbox_only. It is not Production authorization and cannot grant production actions." as const;

export const FIRST_PROOF_SUCCESS_TITLE = "FIRST VERIFICATION COMPLETE" as const;
