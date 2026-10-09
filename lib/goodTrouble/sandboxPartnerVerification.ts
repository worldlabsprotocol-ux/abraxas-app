// FILE: lib/goodTrouble/sandboxPartnerVerification.ts
// Canonical Good Trouble sandbox partner backend — server-side receipt verification only.

import {
  AbraxasPartnerKit,
  MemoryPartnerRequestStateStore,
  PARTNER_INTEGRATION_FORBIDDEN_CALLBACK_KEYS,
  PARTNER_INTEGRATION_GOOGLE_BOUNDARY,
  PARTNER_INTEGRATION_KIT_VERSION,
  PARTNER_INTEGRATION_REPLAY_BEHAVIOR,
  permitProtocolAction,
  type PartnerKitSafeResult,
  type PartnerRequestStateStore,
} from "@/lib/partner/integrationKit";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
  GOOD_TROUBLE_SANDBOX_APPLICATION_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import { SITE_URL } from "@/lib/siteUrl";

export { GOOD_TROUBLE_SANDBOX_APPLICATION_ID };

/** Active L0 self-attestation policy pin for hosted purchase (not government-ID verified age). */
export const GOOD_TROUBLE_SANDBOX_POLICY_VERSION = 2 as const;

export const GOOD_TROUBLE_SANDBOX_PURCHASE_PURPOSE = "purchase" as const;

export type GoodTroubleSandboxAccessAction = "permit" | "deny";

export interface GoodTroubleSandboxVerificationResult {
  action: GoodTroubleSandboxAccessAction;
  grant: boolean;
  outcome: PartnerKitSafeResult["outcome"];
  errors: string[];
  receipt_id: string | null;
  /** Callback query params never authorize access by themselves. */
  callback_trusted: false;
  /** Set when receipt verification passed but protected action idempotency rejected replay. */
  protected_action_replayed?: boolean;
  verification: PartnerKitSafeResult;
}

/** Partner-owned one-time grant idempotency (checkout unlock, session mint, etc.). */
export interface GoodTroubleProtectedActionStore {
  tryComplete(actionKey: string): Promise<{ ok: true } | { ok: false; reason: "duplicate" }>
    | { ok: true } | { ok: false; reason: "duplicate" };
}

export function createGoodTroubleSandboxPartnerKit(input?: {
  fetchFn?: typeof fetch;
  baseUrl?: string;
  requestStateStore?: PartnerRequestStateStore;
}): AbraxasPartnerKit {
  return new AbraxasPartnerKit({
    partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    policyVersion: GOOD_TROUBLE_SANDBOX_POLICY_VERSION,
    requirePolicyVersion: true,
    environment: "sandbox",
    applicationId: GOOD_TROUBLE_SANDBOX_APPLICATION_ID,
    policyPackId: POLICY_PACKS.age_21_retail.id,
    resultFamily: GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
    baseUrl: input?.baseUrl ?? SITE_URL,
    fetchFn: input?.fetchFn,
    requestStateStore: input?.requestStateStore,
    reportVerificationTelemetry: false,
  });
}

const GOOD_TROUBLE_PARTNER_LOCAL_CALLBACK_KEYS = new Set(["gtv"]);

function callbackSearchParams(
  search: URLSearchParams | Record<string, string | string[] | undefined>,
): URLSearchParams {
  if (search instanceof URLSearchParams) return search;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.append(key, value);
    }
  }
  return params;
}

/**
 * Parse Good Trouble Wix callback query params. `gtv` is partner-local flow state only —
 * never treated as Abraxas authorization (receipt_id still required for verifyForAction).
 */
export function parseGoodTroublePartnerCallback(
  search: URLSearchParams | Record<string, string | string[] | undefined>,
): { ok: true; receipt_id: string; request_id: string | null } | { ok: false; errors: string[] } {
  const params = callbackSearchParams(search);
  const errors: string[] = [];
  for (const key of Array.from(params.keys())) {
    const lower = key.toLowerCase();
    if (PARTNER_INTEGRATION_FORBIDDEN_CALLBACK_KEYS.some((forbidden) => lower.includes(forbidden))) {
      errors.push("pii_in_callback");
    }
    if (GOOD_TROUBLE_PARTNER_LOCAL_CALLBACK_KEYS.has(lower)) continue;
    const allowed = [
      "receipt_id",
      "request_id",
      "decision",
      "status",
      "decision_id",
      "receipt_expires_at",
      "credential_id",
      "policy_id",
      "partner_id",
    ];
    if (!allowed.includes(key)) {
      errors.push("unknown_callback_param");
    }
  }
  const receiptId = params.get("receipt_id")?.trim() ?? "";
  if (!receiptId) errors.push("receipt_id_missing");
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    receipt_id: receiptId,
    request_id: params.get("request_id")?.trim() || null,
  };
}

function toAccessResult(
  verification: PartnerKitSafeResult,
  extra?: Pick<GoodTroubleSandboxVerificationResult, "protected_action_replayed">,
): GoodTroubleSandboxVerificationResult {
  const grant = permitProtocolAction(verification) && !extra?.protected_action_replayed;
  return {
    action: grant ? "permit" : "deny",
    grant,
    outcome: verification.outcome,
    errors: verification.errors,
    receipt_id: verification.receipt_id ?? null,
    callback_trusted: false,
    verification,
    ...extra,
  };
}

/**
 * Verify a holder callback or direct receipt reference for Good Trouble sandbox purchase.
 * Never treats callback parameters alone as authorization.
 */
export async function verifyGoodTroubleSandboxAccess(input: {
  search: URLSearchParams | Record<string, string | string[] | undefined>;
  /** Durable partner store: persisted request_id from handoff creation (vr_* or req_*). */
  expectedRequestId?: string;
  fetchFn?: typeof fetch;
  requestStateStore?: PartnerRequestStateStore;
  /** Optional durable idempotency for one-time partner actions after verification succeeds. */
  protectedActionKey?: string;
  protectedActionStore?: GoodTroubleProtectedActionStore;
  baseUrl?: string;
}): Promise<GoodTroubleSandboxVerificationResult> {
  const kit = createGoodTroubleSandboxPartnerKit({
    fetchFn: input.fetchFn,
    baseUrl: input.baseUrl,
    requestStateStore: input.requestStateStore,
  });

  const parsed = parseGoodTroublePartnerCallback(input.search);
  if (!parsed.ok) {
    return toAccessResult({
      kit_version: PARTNER_INTEGRATION_KIT_VERSION,
      outcome: "invalid",
      action: "deny",
      errors: parsed.errors,
      receipt_id: null,
      decision_result: null,
      status: null,
      policy_id: null,
      partner_id: null,
      production_usable: null,
      callback_trusted: false,
      google_sign_in_is_not_eligibility: PARTNER_INTEGRATION_GOOGLE_BOUNDARY,
      replay_behavior: PARTNER_INTEGRATION_REPLAY_BEHAVIOR,
    });
  }

  const verification = await kit.verifyForAction({
    receiptId: parsed.receipt_id,
    expectedRequestId: input.expectedRequestId,
    callbackRequestId: parsed.request_id,
    expectedPurpose: GOOD_TROUBLE_SANDBOX_PURCHASE_PURPOSE,
    expectedResultFamily: GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
  });

  if (!permitProtocolAction(verification)) {
    return toAccessResult(verification);
  }

  if (input.protectedActionKey && input.protectedActionStore) {
    const action = await input.protectedActionStore.tryComplete(input.protectedActionKey);
    if (!action.ok) {
      return toAccessResult(verification, { protected_action_replayed: true });
    }
  }

  return toAccessResult(verification);
}

/** TEST/LOCAL ONLY — in-memory request correlation for unit tests and demos. */
export function createGoodTroubleSandboxRequestStore(): MemoryPartnerRequestStateStore {
  return new MemoryPartnerRequestStateStore();
}

/** TEST/LOCAL ONLY — simulates durable protected-action idempotency. */
export function createGoodTroubleProtectedActionStore(): GoodTroubleProtectedActionStore {
  const completed = new Set<string>();
  return {
    tryComplete(actionKey: string) {
      if (completed.has(actionKey)) {
        return { ok: false, reason: "duplicate" };
      }
      completed.add(actionKey);
      return { ok: true };
    },
  };
}
