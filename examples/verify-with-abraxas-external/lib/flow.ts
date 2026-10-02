// FILE: examples/verify-with-abraxas-external/lib/flow.ts
// End-to-end external integration: configure → create → verify → narrow result → resume.

import { permitProtocolAction } from "@/lib/partner/integrationKit";
import type { PartnerVerificationRequestState } from "@/lib/partner/integrationKit/partnerRequestStateStore";
import type { ExternalVerifyConfig } from "./config";
import { createExternalPartnerKit } from "./partnerKit";
import type { ExternalPartnerRequestStore } from "./partnerRequestStore";
import type { ProtectedActionStore } from "./protectedActionStore";

export interface ExternalVerificationStores {
  /** Simulates Postgres/Redis — must be shared across serverless instances. */
  partnerRequestStore: ExternalPartnerRequestStore;
  /** Simulates durable idempotency for protected actions. */
  protectedActionStore: ProtectedActionStore;
}

/** Persist pending request_id from any serverless instance before redirecting the holder. */
export async function persistPendingVerificationRequest(
  store: ExternalPartnerRequestStore,
  state: PartnerVerificationRequestState,
): Promise<void> {
  await store.put(state);
}

/** Load request_id on callback from shared durable storage (any instance). */
export async function loadPendingVerificationRequest(
  store: ExternalPartnerRequestStore,
  requestId: string,
): Promise<PartnerVerificationRequestState | null> {
  const state = store.get(requestId);
  return state instanceof Promise ? await state : state;
}

export async function startExternalVerification(input: {
  config: ExternalVerifyConfig;
  env: Record<string, string | undefined>;
  stores: ExternalVerificationStores;
  expectedContentHash?: string;
  partnerState?: string;
  fetchFn?: typeof fetch;
}) {
  const kit = createExternalPartnerKit(input.config, input.env, input.fetchFn);
  const request = await kit.createVerificationRequest({
    returnUrl: input.config.returnUrl,
    expectedContentHash: input.expectedContentHash,
    partnerState: input.partnerState,
    mode: "hosted_handoff",
  });
  if (!request.ok) return request;

  await persistPendingVerificationRequest(input.stores.partnerRequestStore, {
    requestId: request.request_id,
    partnerId: input.config.partnerId,
    policyId: input.config.policyId,
    environment: input.config.environment,
    returnUrl: input.config.returnUrl,
    expiresAt: request.expires_at ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
  return request;
}

export async function finishExternalVerification(input: {
  config: ExternalVerifyConfig;
  env: Record<string, string | undefined>;
  stores: ExternalVerificationStores;
  searchParams: URLSearchParams;
  /** Loaded from partner durable storage — survives process restarts and instance changes. */
  expectedRequestId: string;
  protectedActionKey: string;
  fetchFn?: typeof fetch;
}) {
  const pending = await loadPendingVerificationRequest(
    input.stores.partnerRequestStore,
    input.expectedRequestId,
  );
  if (!pending) {
    return {
      resumed: false,
      duplicate: false,
      category: "invalid_callback" as const,
      errors: ["pending_request_missing"],
      narrow: null,
    };
  }

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
  const action = await input.stores.protectedActionStore.tryComplete(input.protectedActionKey);
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
