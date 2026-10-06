// FILE: lib/partner/partnerFlowOpenApiContract.ts
// Machine-readable Partner Flow API contract metadata — paths mirror implemented routes.

import { PARTNER_CALLBACK_PARAMS } from "@/lib/protocol/compatibility";
import { SITE_URL } from "@/lib/siteUrl";
import {
  HOSTED_HANDOFF_ALLOWED_KEYS,
  HOSTED_HANDOFF_RUNTIMES,
} from "@/lib/partner/hostedHandoff/contract";
import type { HostedHandoffPartnerView } from "@/lib/partner/hostedHandoff/types";
import { NARROW_PARTNER_RESULT_ALLOWED_FIELDS } from "@/lib/partner/narrowPartnerResult/contract";
import { WEBHOOK_PAYLOAD_ALLOWED_KEYS } from "@/lib/partner/webhooks/payloadAllowlist";
import {
  WEBHOOK_EVENT_ID_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from "@/lib/partner/webhooks/webhookSigning";
import { PARTNER_INTEGRATION_TRUSTED_RECEIPT_FIELDS } from "@/lib/partner/integrationKit/contract";

export const PARTNER_FLOW_OPENAPI_SPEC_RELATIVE_PATH = "public/openapi/partner-flow.openapi.yaml";
export const PARTNER_FLOW_OPENAPI_PUBLIC_PATH = "/openapi/partner-flow.openapi.yaml";
export const PARTNER_FLOW_OPENAPI_CANONICAL_URL = `${SITE_URL}${PARTNER_FLOW_OPENAPI_PUBLIC_PATH}`;
export const PARTNER_FLOW_OPENAPI_SPEC_VERSION = "1.1.0" as const;

export type PartnerFlowApiCategory =
  | "partner_server"
  | "browser_entry"
  | "browser_session"
  | "passport_handoff"
  | "public_receipt";

export interface PartnerFlowDocumentedOperation {
  method: "GET" | "POST";
  /** OpenAPI path template (e.g. /api/receipts/{receiptId}/public) */
  path: string;
  operationId: string;
  category: PartnerFlowApiCategory;
  /** Repo path to the implementing handler or page */
  implementation: string;
  summary: string;
}

/** Operations documented in partner-flow.openapi.yaml — each maps to a real route or page. */
export const PARTNER_FLOW_DOCUMENTED_OPERATIONS: readonly PartnerFlowDocumentedOperation[] = [
  {
    method: "POST",
    path: "/api/v1/partner-handoff",
    operationId: "createPartnerHandoff",
    category: "partner_server",
    implementation: "app/api/v1/partner-handoff/route.ts",
    summary: "Create hosted Partner Flow handoff (partner bearer + application header)",
  },
  {
    method: "GET",
    path: "/api/v1/partner-handoff/{handoffRef}",
    operationId: "getPartnerHandoff",
    category: "partner_server",
    implementation: "app/api/v1/partner-handoff/[ref]/route.ts",
    summary: "Lookup handoff status and public_receipt_id (partner bearer)",
  },
  {
    method: "GET",
    path: "/partner/verify",
    operationId: "partnerFlowEntry",
    category: "browser_entry",
    implementation: "app/partner/verify/page.tsx",
    summary: "Browser redirect entry, holder starts Partner Flow",
  },
  {
    method: "GET",
    path: "/passport",
    operationId: "passportHandoff",
    category: "passport_handoff",
    implementation: "app/passport/page.tsx",
    summary: "Passport UI, ID capture and consent after evaluate returns next=passport",
  },
  {
    method: "POST",
    path: "/api/v1/partner-flow/evaluate",
    operationId: "partnerFlowEvaluate",
    category: "browser_session",
    implementation: "app/api/v1/partner-flow/evaluate/route.ts",
    summary: "Evaluate holder credential against partner policy (browser session)",
  },
  {
    method: "POST",
    path: "/api/v1/partner-flow/complete",
    operationId: "partnerFlowComplete",
    category: "browser_session",
    implementation: "app/api/v1/partner-flow/complete/route.ts",
    summary: "Complete flow after manual approval and issue session receipt",
  },
  {
    method: "POST",
    path: "/api/v1/partner-flow/refresh",
    operationId: "partnerFlowRefresh",
    category: "browser_session",
    implementation: "app/api/v1/partner-flow/refresh/route.ts",
    summary: "Re-issue session receipt when prior receipt expired but credential remains valid",
  },
  {
    method: "GET",
    path: "/api/v1/verification-requests/{verificationRequestId}",
    operationId: "verificationRequestPreview",
    category: "passport_handoff",
    implementation: "app/api/v1/verification-requests/[id]/route.ts",
    summary: "Holder preview of verification request before consent",
  },
  {
    method: "POST",
    path: "/api/v1/verification-requests/{verificationRequestId}/consent",
    operationId: "verificationRequestConsent",
    category: "passport_handoff",
    implementation: "app/api/v1/verification-requests/[id]/consent/route.ts",
    summary: "Holder consents; policy engine returns decision",
  },
  {
    method: "POST",
    path: "/api/v1/verification-requests/{verificationRequestId}/decline",
    operationId: "verificationRequestDecline",
    category: "passport_handoff",
    implementation: "app/api/v1/verification-requests/[id]/decline/route.ts",
    summary: "Holder declines verification request",
  },
  {
    method: "GET",
    path: "/api/receipts/{receiptId}/public",
    operationId: "getPublicReceipt",
    category: "public_receipt",
    implementation: "app/api/receipts/[receiptId]/public/route.ts",
    summary: "Public eligibility decision receipt (no auth, no PII)",
  },
  {
    method: "GET",
    path: "/api/receipts/{receiptId}/narrow-result",
    operationId: "getNarrowPartnerResult",
    category: "public_receipt",
    implementation: "app/api/receipts/[receiptId]/narrow-result/route.ts",
    summary: "Public narrow partner result — authorized policy facts only",
  },
] as const;

/** Implemented routes intentionally excluded from Partner Flow OpenAPI (different auth surface). */
export const PARTNER_FLOW_EXCLUDED_OPERATIONS = [
  {
    method: "POST",
    path: "/api/v1/verification-requests",
    reason: "Server-to-server integration, requires partner API key (verify:requests); see /docs/partner verification-requests",
  },
  {
    method: "GET",
    path: "/api/v1/receipts/{receiptId}",
    reason: "Partner authenticated receipt view, requires API key; browser Partner Flow uses GET /api/receipts/{receiptId}/public",
  },
  {
    method: "GET",
    path: "/api/v1/decision-receipts/{receiptId}/status",
    reason: "Partner authenticated receipt status, requires API key",
  },
  {
    method: "POST",
    path: "/api/credentials/verify",
    reason: "Credential/registry verify path, separate integration; see /docs/relying-party-verify",
  },
  {
    method: "POST",
    path: "/api/v1/authorize",
    reason: "Abraxas Connect path, separate integration; see /docs/ail",
  },
] as const;

export const PARTNER_FLOW_CALLBACK_QUERY_PARAMS = PARTNER_CALLBACK_PARAMS;

/** Drift-protected handoff create body keys — must match OpenAPI HostedHandoffCreateRequest. */
export const PARTNER_OPENAPI_HANDOFF_REQUEST_KEYS = HOSTED_HANDOFF_ALLOWED_KEYS;

/** Drift-protected handoff runtimes — must match OpenAPI HostedHandoffRuntime enum. */
export const PARTNER_OPENAPI_HANDOFF_RUNTIMES = HOSTED_HANDOFF_RUNTIMES;

/** Drift-protected handoff response fields (HostedHandoffPartnerView + ok). */
export const PARTNER_OPENAPI_HANDOFF_RESPONSE_FIELDS = [
  "ok",
  "version",
  "notice",
  "hosted_url",
  "handoff_ref",
  "verify_request",
  "runtime",
  "environment",
  "status",
  "expires_at",
  "callback_bound",
  "must_reverify",
  "is_grant",
  "activates_production",
  "activates_mainnet",
  "issues_credentials",
  "application_id",
  "public_receipt_id",
  "action",
  "policy_version",
  "binding_id",
  "pack_id",
  "result_family",
] as const satisfies readonly (keyof (HostedHandoffPartnerView & { ok: true }))[];

/** Drift-protected narrow result fields — must match OpenAPI NarrowPartnerResult. */
export const PARTNER_OPENAPI_NARROW_RESULT_FIELDS = NARROW_PARTNER_RESULT_ALLOWED_FIELDS;

/** Drift-protected webhook payload allowlist — must match OpenAPI PartnerWebhookPayload. */
export const PARTNER_OPENAPI_WEBHOOK_PAYLOAD_KEYS = WEBHOOK_PAYLOAD_ALLOWED_KEYS;

/** Drift-protected webhook verification headers. */
export const PARTNER_OPENAPI_WEBHOOK_HEADERS = [
  WEBHOOK_TIMESTAMP_HEADER,
  WEBHOOK_EVENT_ID_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
] as const;

/** Drift-protected authorization states — must match OpenAPI HolderAuthorizationState. */
export const PARTNER_OPENAPI_AUTHORIZATION_STATES = [
  "authorized",
  "verification_required",
  "denied",
] as const;

/** Fields integrators must verify on public receipt (fail-closed; sandbox via explicit opt-in). */
export const PARTNER_FLOW_RECEIPT_SECURITY_FIELDS = PARTNER_INTEGRATION_TRUSTED_RECEIPT_FIELDS;

export const PARTNER_FLOW_RECEIPT_VALIDATION_RULES = [
  { field: "signature_valid", rule: "must be true" },
  { field: "decision_result", rule: 'must be "approved"' },
  { field: "currently_valid", rule: "must be true for access (live trust)" },
  { field: "status", rule: 'must be "active" (missing fails)' },
  { field: "expires_at", rule: "required, valid ISO-8601, not expired at verification time" },
  { field: "production_usable", rule: "must be true unless allowSandbox opt-in" },
  { field: "partner_id", rule: "must match expected partner integration id" },
  { field: "policy_id", rule: "must match expected policy gate id" },
] as const;

export const PARTNER_FLOW_PUBLIC_RECEIPT_CURL_EXAMPLE = `curl -sS "${SITE_URL}/api/receipts/RECEIPT_ID/public" \\
  -H "Accept: application/json"`;

export const PARTNER_FLOW_HANDOFF_CURL_EXAMPLE = `curl -sS -X POST "${SITE_URL}/api/v1/partner-handoff" \\
  -H "Authorization: Bearer abx_test_YOUR_SERVER_CREDENTIAL" \\
  -H "X-Abraxas-Application-Id: YOUR_APPLICATION_UUID" \\
  -H "Content-Type: application/json" \\
  -d '{"runtime":"universal_https"}'`;

export const PARTNER_FLOW_PUBLIC_RECEIPT_JS_EXAMPLE = `// Server-side — verify after holder callback redirect
const receiptId = new URL(request.url).searchParams.get("receipt_id");
const res = await fetch(
  "${SITE_URL}/api/receipts/" + encodeURIComponent(receiptId) + "/public",
  { headers: { Accept: "application/json" } },
);
if (!res.ok) throw new Error("Receipt fetch failed: " + res.status);
const receipt = await res.json();

// Fail closed — see @abraxas/partner-kit verifyForAction / permitProtocolAction
if (receipt.signature_valid !== true) throw new Error("signature_invalid");
if (receipt.currently_valid !== true) throw new Error("not_currently_valid");
if (receipt.decision_result !== "approved") throw new Error("decision_not_approved");
if (receipt.status !== "active") throw new Error("status_not_active");
if (!receipt.expires_at || new Date(receipt.expires_at) <= new Date()) {
  throw new Error("receipt_expired");
}
if (receipt.production_usable !== true) throw new Error("production_not_usable");
if (receipt.partner_id !== "your-partner-id") throw new Error("partner_mismatch");
if (receipt.policy_id !== "your-policy-v1") throw new Error("policy_mismatch");`;
