// FILE: lib/partner/integrationKit/requestCorrelationValidation.ts
// Universal integration correlation — no process-local Map for production paths.

import {
  isOpaqueVerifyRequest,
  PARTNER_REQUEST_ID_PREFIX,
  validatePartnerRequestCorrelation,
} from "./requestCorrelation.js";
import type { PartnerRequestStateStore } from "./partnerRequestStateStore.js";
import {
  resolvePartnerRequestState,
  validatePartnerRequestState,
} from "./partnerRequestStateStore.js";

export async function validateUniversalRequestCorrelation(input: {
  expectedRequestId?: string;
  callbackRequestId?: string | null;
  partnerId: string;
  policyId: string;
  environment: "sandbox" | "production";
  purpose?: string;
  requestStateStore?: PartnerRequestStateStore;
}): Promise<string[]> {
  if (!input.expectedRequestId?.trim()) return [];

  const expected = input.expectedRequestId.trim();
  const callbackId = input.callbackRequestId?.trim() || null;

  if (callbackId && callbackId !== expected) {
    return ["request_correlation_mismatch"];
  }

  if (isOpaqueVerifyRequest(expected)) {
    // Abraxas durable hosted handoff (vr_*). Partner persists request_id server-side;
    // receipt signature + partner/policy binding is the authorization boundary.
    return [];
  }

  if (expected.startsWith(PARTNER_REQUEST_ID_PREFIX)) {
    if (input.requestStateStore) {
      const state = await resolvePartnerRequestState(input.requestStateStore, expected);
      const validated = validatePartnerRequestState(state, {
        partnerId: input.partnerId,
        policyId: input.policyId,
        environment: input.environment,
        purpose: input.purpose,
      });
      return validated.ok ? [] : validated.errors;
    }

    if (process.env.VITEST) {
      const legacy = validatePartnerRequestCorrelation({
        requestId: expected,
        expectedPartnerId: input.partnerId,
        expectedPolicyId: input.policyId,
        expectedEnvironment: input.environment,
        expectedPurpose: input.purpose,
      });
      return legacy.ok ? [] : legacy.errors;
    }

    return ["request_state_store_required"];
  }

  return ["invalid_request_id"];
}
