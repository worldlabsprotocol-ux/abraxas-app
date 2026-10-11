// Versioned institutional integration contract — provider-neutral, reuses existing APIs.

export const INSTITUTIONAL_INTEGRATION_CONTRACT_VERSION = "institutional_integration_v1" as const;

export const INSTITUTIONAL_INTEGRATION_NOTICE =
  "Integrators must verify signed receipts server-side and recheck current validity before every protected action. "
  + "Authentic signatures are not sufficient for permit decisions.";

/** HTTP surfaces — no parallel receipt or auth models. */
export const INSTITUTIONAL_API_ROUTES = {
  consume: "POST /api/v1/institutional/eligibility/consume",
  receipt_status: "GET /api/v1/decision-receipts/{receipt_id}/status",
  public_receipt: "GET /api/receipts/{receipt_id}/public",
  partner_flow_evaluate: "POST /api/v1/partner-flow/evaluate",
} as const;

export type InstitutionalIntegrationAuth = {
  scheme: "Bearer abx_* | X-Abraxas-Api-Key";
  required_scope: "verify:requests";
  application_binding: "launchpad application id must match credential or be omitted when key-bound";
};

export type InstitutionalIntegrationRequest = {
  receipt_id: string;
  policy_id: string;
  policy_version?: number;
  application_id?: string;
  purpose?: string;
  action_scope?: string;
  correlation_id?: string;
  /** Required durable replay nonce (16–128 chars, [A-Za-z0-9._-]). */
  replay_nonce: string;
};

export type InstitutionalIntegrationErrorCode =
  | "invalid_json"
  | "receipt_id_and_policy_required"
  | "replay_nonce_required"
  | "invalid_api_key"
  | "missing_scope"
  | "application_mismatch"
  | "application_not_found"
  | "application_unavailable"
  | "receipt_not_found"
  | "partner_mismatch"
  | "policy_mismatch"
  | "policy_version_mismatch"
  | "subject_mismatch"
  | "consent_required"
  | "invalid_nonce"
  | "nonce_expired"
  | "replay_rejected"
  | "replay_store_unavailable"
  | "not_currently_actionable";

export const INSTITUTIONAL_HTTP_STATUS_BY_ERROR: Record<InstitutionalIntegrationErrorCode, number> = {
  invalid_json: 400,
  receipt_id_and_policy_required: 400,
  replay_nonce_required: 400,
  invalid_api_key: 401,
  missing_scope: 403,
  application_mismatch: 403,
  application_not_found: 403,
  application_unavailable: 403,
  receipt_not_found: 404,
  partner_mismatch: 403,
  policy_mismatch: 403,
  policy_version_mismatch: 403,
  subject_mismatch: 403,
  consent_required: 403,
  invalid_nonce: 400,
  nonce_expired: 400,
  replay_rejected: 409,
  replay_store_unavailable: 503,
  not_currently_actionable: 403,
};

export type InstitutionalWebhookVerification = {
  algorithm: "HMAC-SHA256";
  headers: ["X-Abraxas-Signature", "X-Abraxas-Timestamp"];
  reference: "lib/partner/webhooks/webhookSigning";
};

export type InstitutionalIntegrationContract = {
  version: typeof INSTITUTIONAL_INTEGRATION_CONTRACT_VERSION;
  decision_schema: "institutional_eligibility_decision_v1";
  replay_reservation_policy: "permit_path_only";
  auth: InstitutionalIntegrationAuth;
  routes: typeof INSTITUTIONAL_API_ROUTES;
  request: InstitutionalIntegrationRequest;
  outcomes: ("permit" | "deny" | "refresh_required")[];
  webhook: InstitutionalWebhookVerification;
  errors: InstitutionalIntegrationErrorCode[];
};

export function getInstitutionalIntegrationContract(): InstitutionalIntegrationContract {
  return {
    version: INSTITUTIONAL_INTEGRATION_CONTRACT_VERSION,
    decision_schema: "institutional_eligibility_decision_v1",
    replay_reservation_policy: "permit_path_only",
    auth: {
      scheme: "Bearer abx_* | X-Abraxas-Api-Key",
      required_scope: "verify:requests",
      application_binding: "launchpad application id must match credential or be omitted when key-bound",
    },
    routes: INSTITUTIONAL_API_ROUTES,
    request: {
      receipt_id: "",
      policy_id: "",
      replay_nonce: "",
    },
    outcomes: ["permit", "deny", "refresh_required"],
    webhook: {
      algorithm: "HMAC-SHA256",
      headers: ["X-Abraxas-Signature", "X-Abraxas-Timestamp"],
      reference: "lib/partner/webhooks/webhookSigning",
    },
    errors: Object.keys(INSTITUTIONAL_HTTP_STATUS_BY_ERROR) as InstitutionalIntegrationErrorCode[],
  };
}
