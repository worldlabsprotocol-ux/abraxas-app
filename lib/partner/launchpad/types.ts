// FILE: lib/partner/launchpad/types.ts
// Partner Launchpad domain types.

export type LaunchpadEnvironment = "sandbox" | "production";

export type LaunchpadApplicationStatus = "active" | "suspended" | "pending";

export type LaunchpadActivityEventType =
  | "verification_started"
  | "user_consented"
  | "proof_reused"
  | "proof_created"
  | "receipt_issued"
  | "receipt_verified"
  | "verification_failed"
  | "callback_completed"
  | "callback_failed"
  | "application_provisioned"
  | "credential_rotated"
  | "credential_revoked"
  | "production_access_requested";

export type ProductionAccessRequestStatus = "pending" | "approved" | "rejected";

export interface LaunchpadApplicationRow {
  id: string;
  public_slug: string;
  partner_id: string;
  application_name: string;
  display_name: string;
  environment: LaunchpadEnvironment;
  policy_id: string;
  policy_version: number;
  policy_template_id: string;
  allowed_return_urls: string[];
  api_key_id: string | null;
  status: LaunchpadApplicationStatus;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaunchpadWorkspaceView {
  partner_id: string;
  display_name: string;
  environment: LaunchpadEnvironment;
  applications: LaunchpadApplicationSummary[];
}

export interface LaunchpadApplicationSummary {
  id: string;
  public_slug: string;
  application_name: string;
  display_name: string;
  environment: LaunchpadEnvironment;
  policy_id: string;
  policy_version: number;
  policy_template_id: string;
  allowed_return_urls: string[];
  status: LaunchpadApplicationStatus;
  key_prefix: string | null;
  integration_status: "ready" | "pending" | "suspended";
}

export interface ProvisionSandboxResult {
  application_id: string;
  partner_id: string;
  public_slug: string;
  policy_id: string;
  policy_version: number;
  api_key_id: string;
  api_key: string;
  key_prefix: string;
  hosted_verify_url: string;
}
