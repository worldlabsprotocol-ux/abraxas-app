// FILE: lib/partner/integrationKit/partnerRequestStateStore.ts
// Partner-owned durable request correlation. Required for redirect mode across serverless instances.

import { randomBytes } from "node:crypto";
import { PARTNER_REQUEST_ID_PREFIX } from "./requestCorrelation.js";

export interface PartnerVerificationRequestState {
  requestId: string;
  partnerId: string;
  policyId: string;
  environment: "sandbox" | "production";
  returnUrl: string;
  purpose?: string;
  expiresAt: string;
}

/** Partner implements this with Postgres, Redis, KV, etc. Never rely on process memory in production. */
export interface PartnerRequestStateStore {
  put(state: PartnerVerificationRequestState): Promise<void> | void;
  get(requestId: string): Promise<PartnerVerificationRequestState | null> | PartnerVerificationRequestState | null;
  consume?(requestId: string): Promise<PartnerVerificationRequestState | null> | PartnerVerificationRequestState | null;
}

/** TEST/LOCAL ONLY — simulates durable storage in unit tests. Not safe for multi-instance production. */
export class MemoryPartnerRequestStateStore implements PartnerRequestStateStore {
  private readonly store = new Map<string, PartnerVerificationRequestState>();

  put(state: PartnerVerificationRequestState): void {
    this.store.set(state.requestId, state);
  }

  get(requestId: string): PartnerVerificationRequestState | null {
    const state = this.store.get(requestId.trim());
    if (!state) return null;
    if (new Date(state.expiresAt).getTime() <= Date.now()) {
      this.store.delete(requestId);
      return null;
    }
    return state;
  }

  consume(requestId: string): PartnerVerificationRequestState | null {
    const state = this.get(requestId);
    if (state) this.store.delete(requestId);
    return state;
  }

  resetForTests(): void {
    this.store.clear();
  }
}

export function generatePartnerRequestId(): string {
  return `${PARTNER_REQUEST_ID_PREFIX}${randomBytes(16).toString("base64url")}`;
}

export async function resolvePartnerRequestState(
  store: PartnerRequestStateStore | undefined,
  requestId: string,
): Promise<PartnerVerificationRequestState | null> {
  if (!store) return null;
  const state = store.get(requestId);
  return state instanceof Promise ? await state : state;
}

export function validatePartnerRequestState(
  state: PartnerVerificationRequestState | null,
  expected: {
    partnerId: string;
    policyId: string;
    environment: "sandbox" | "production";
    purpose?: string;
  },
): { ok: true; state: PartnerVerificationRequestState } | { ok: false; errors: string[] } {
  if (!state) return { ok: false, errors: ["request_correlation_missing"] };
  const errors: string[] = [];
  if (new Date(state.expiresAt).getTime() <= Date.now()) errors.push("expired_request");
  if (state.partnerId !== expected.partnerId) errors.push("request_correlation_partner_mismatch");
  if (state.policyId !== expected.policyId) errors.push("request_correlation_policy_mismatch");
  if (state.environment !== expected.environment) errors.push("request_correlation_environment_mismatch");
  if (expected.purpose && state.purpose && state.purpose !== expected.purpose) {
    errors.push("request_correlation_purpose_mismatch");
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, state };
}
