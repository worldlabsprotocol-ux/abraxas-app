// FILE: lib/partner/partnerFlowOpenApiContract.ts
// Machine-readable Partner Flow API contract metadata — paths mirror implemented routes.

import { PARTNER_CALLBACK_PARAMS } from "@/lib/protocol/compatibility";
import { SITE_URL } from "@/lib/siteUrl";

export const PARTNER_FLOW_OPENAPI_SPEC_RELATIVE_PATH = "public/openapi/partner-flow.openapi.yaml";
export const PARTNER_FLOW_OPENAPI_PUBLIC_PATH = "/openapi/partner-flow.openapi.yaml";
export const PARTNER_FLOW_OPENAPI_CANONICAL_URL = `${SITE_URL}${PARTNER_FLOW_OPENAPI_PUBLIC_PATH}`;

export type PartnerFlowApiCategory =
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
    method: "GET",
    path: "/partner/verify",
    operationId: "partnerFlowEntry",
    category: "browser_entry",
    implementation: "app/partner/verify/page.tsx",
    summary: "Browser redirect entry — holder starts Partner Flow",
  },
  {
    method: "GET",
    path: "/passport",
    operationId: "passportHandoff",
    category: "passport_handoff",
    implementation: "app/passport/page.tsx",
    summary: "Passport UI — ID capture and consent after evaluate returns next=passport",
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
] as const;

/** Implemented routes intentionally excluded from Partner Flow OpenAPI (different auth surface). */
export const PARTNER_FLOW_EXCLUDED_OPERATIONS = [
  {
    method: "POST",
    path: "/api/v1/verification-requests",
    reason: "Server-to-server integration — requires partner API key (verify:requests); see /docs/partner-verification-requests",
  },
  {
    method: "GET",
    path: "/api/v1/receipts/{receiptId}",
    reason: "Partner-authenticated receipt view — requires API key; browser Partner Flow uses GET /api/receipts/{receiptId}/public",
  },
  {
    method: "GET",
    path: "/api/v1/decision-receipts/{receiptId}/status",
    reason: "Partner-authenticated receipt status — requires API key",
  },
  {
    method: "POST",
    path: "/api/credentials/verify",
    reason: "Credential/registry verify path — separate integration; see /docs/relying-party-verify",
  },
  {
    method: "POST",
    path: "/api/v1/authorize",
    reason: "Abraxas Connect path — separate integration; see /docs/ail",
  },
] as const;

export const PARTNER_FLOW_CALLBACK_QUERY_PARAMS = PARTNER_CALLBACK_PARAMS;

/** Fields integrators must verify on public receipt (fail-closed; sandbox via explicit opt-in). */
export const PARTNER_FLOW_RECEIPT_SECURITY_FIELDS = [
  "signature_valid",
  "decision_result",
  "status",
  "expires_at",
  "production_usable",
  "partner_id",
  "policy_id",
] as const;

export const PARTNER_FLOW_RECEIPT_VALIDATION_RULES = [
  { field: "signature_valid", rule: "must be true" },
  { field: "decision_result", rule: 'must be "approved"' },
  { field: "status", rule: 'must be "active" (missing fails)' },
  { field: "expires_at", rule: "required, valid ISO-8601, not expired at verification time" },
  { field: "production_usable", rule: "must be true unless allowSandbox opt-in" },
  { field: "partner_id", rule: "must match expected partner integration id" },
  { field: "policy_id", rule: "must match expected policy gate id" },
] as const;

export const PARTNER_FLOW_PUBLIC_RECEIPT_CURL_EXAMPLE = `curl -sS "${SITE_URL}/api/receipts/RECEIPT_ID/public" \\
  -H "Accept: application/json"`;

export const PARTNER_FLOW_PUBLIC_RECEIPT_JS_EXAMPLE = `// Server-side — verify after holder callback redirect
const receiptId = new URL(request.url).searchParams.get("receipt_id");
const res = await fetch(
  "${SITE_URL}/api/receipts/" + encodeURIComponent(receiptId) + "/public",
  { headers: { Accept: "application/json" } },
);
if (!res.ok) throw new Error("Receipt fetch failed: " + res.status);
const receipt = await res.json();

// Fail closed — see lib/partner/verifyPartnerFlowReceipt.ts
if (receipt.signature_valid !== true) throw new Error("signature_invalid");
if (receipt.decision_result !== "approved") throw new Error("decision_not_approved");
if (receipt.status !== "active") throw new Error("status_not_active");
if (!receipt.expires_at || new Date(receipt.expires_at) <= new Date()) {
  throw new Error("receipt_expired");
}
if (receipt.production_usable !== true) throw new Error("production_not_usable");
if (receipt.partner_id !== "your-partner-id") throw new Error("partner_mismatch");
if (receipt.policy_id !== "your-policy-v1") throw new Error("policy_mismatch");`;
