// FILE: examples/verify-with-abraxas-external/lib/flow.ts
// End-to-end external integration: configure → create → verify → narrow result → resume.

import { permitProtocolAction } from "@/lib/partner/integrationKit";
import type { ExternalVerifyConfig } from "./config";
import { createExternalPartnerKit } from "./partnerKit";
import { tryCompleteProtectedAction } from "./idempotency";

export async function startExternalVerification(input: {
  config: ExternalVerifyConfig;
  env: Record<string, string | undefined>;
  expectedContentHash?: string;
  partnerState?: string;
  fetchFn?: typeof fetch;
}) {
  const kit = createExternalPartnerKit(input.config, input.env, input.fetchFn);
  return kit.createVerificationRequest({
    returnUrl: input.config.returnUrl,
    expectedContentHash: input.expectedContentHash,
    partnerState: input.partnerState,
  });
}

export async function finishExternalVerification(input: {
  config: ExternalVerifyConfig;
  env: Record<string, string | undefined>;
  searchParams: URLSearchParams;
  expectedRequestId: string;
  protectedActionKey: string;
  fetchFn?: typeof fetch;
}) {
  const kit = createExternalPartnerKit(input.config, input.env, input.fetchFn);
  const verified = await kit.verifyCallbackWithNarrowResult({
    search: input.searchParams,
    expectedRequestId: input.expectedRequestId,
  });
  if (!verified.ok || !permitProtocolAction(verified.verification)) {
    return {
      resumed: false,
      duplicate: false,
      category: verified.category,
      errors: verified.errors,
      narrow: verified.narrow,
    };
  }
  const action = tryCompleteProtectedAction(input.protectedActionKey);
  if (!action.ok) {
    return {
      resumed: false,
      duplicate: true,
      category: null,
      errors: [] as string[],
      narrow: verified.narrow,
    };
  }
  return {
    resumed: true,
    duplicate: false,
    category: null,
    errors: [] as string[],
    narrow: verified.narrow,
  };
}
