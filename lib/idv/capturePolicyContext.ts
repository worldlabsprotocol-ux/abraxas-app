// FILE: lib/idv/capturePolicyContext.ts
// Partner/policy context passed from Passport into biometric capture.

export interface CapturePolicyContext {
  verificationRequestId?: string | null;
  policyId?: string | null;
  partnerId?: string | null;
  /** When set (e.g. 21), capture collects authoritative DOB for product_eligibility issuance. */
  minimumAge?: number | null;
}

export function capturePolicyFormFields(ctx: CapturePolicyContext): Record<string, string> {
  const fields: Record<string, string> = {};
  const requestId = ctx.verificationRequestId?.trim();
  const policyId = ctx.policyId?.trim();
  const partnerId = ctx.partnerId?.trim();
  if (requestId) fields.verification_request_id = requestId;
  if (policyId) fields.policy_id = policyId;
  if (partnerId) fields.partner_id = partnerId;
  return fields;
}
