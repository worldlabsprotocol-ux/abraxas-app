// FILE: lib/demo/partnerSandboxDemoErrors.ts
// Safe error classification for partner sandbox demo routes — no raw exception disclosure.

import { createHash } from "crypto";

export const PARTNER_SANDBOX_DEMO_INTERNAL_ERROR = "partner_sandbox_demo_internal_error";

const ERROR_STATUS_BY_CODE: Record<string, number> = {
  demo_receipt_not_found: 404,
  client_subject_not_allowed: 400,
  client_partner_policy_not_allowed: 400,
  receipt_id_required: 400,
  receipt_id_invalid: 400,
  demo_credential_not_active: 400,
  partner_sandbox_demo_subject_invalid: 400,
  demo_partner_not_allowed: 403,
  demo_policy_not_allowed: 403,
  demo_receipt_partner_not_allowed: 403,
  demo_receipt_policy_not_allowed: 403,
  demo_receipt_not_sandbox: 403,
  partner_sandbox_demo_subject_not_configured: 503,
  demo_public_receipt_unavailable: 503,
};

export function isRecognizedPartnerSandboxDemoErrorCode(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(ERROR_STATUS_BY_CODE, code);
}

export function classifyPartnerSandboxDemoError(error: unknown): {
  status: number;
  error: string;
} {
  const code = error instanceof Error ? error.message.trim() : "";
  if (code && isRecognizedPartnerSandboxDemoErrorCode(code)) {
    return { status: ERROR_STATUS_BY_CODE[code], error: code };
  }
  return { status: 500, error: PARTNER_SANDBOX_DEMO_INTERNAL_ERROR };
}

export function partnerSandboxDemoErrorFingerprint(error: unknown): string {
  const kind = error instanceof Error ? error.name : typeof error;
  return createHash("sha256").update(`partner_sandbox_demo:${kind}`).digest("hex").slice(0, 12);
}

export function logPartnerSandboxDemoInternalError(operation: string, error: unknown): void {
  console.warn(
    `[partnerSandboxDemo] operation=${operation} category=${PARTNER_SANDBOX_DEMO_INTERNAL_ERROR} fingerprint=${partnerSandboxDemoErrorFingerprint(error)}`,
  );
}
