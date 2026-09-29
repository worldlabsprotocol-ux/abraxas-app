// FILE: lib/partner/partnerActivitySignal/preflight.ts
// Bind a consented activity category to a current Abraxas receipt. Optional layer only.
//
// Trusted evaluation order:
// 1. Normalize + verify binding_integrity_hash (server-issued binding only).
// 2. Match binding partner/policy/environment/purpose/scope to server kit configuration.
// 3. Match binding receipt_id + receipt_payload_hash to the verified Abraxas receipt.
// 4. Require permitProtocolAction(result) on the live receipt evaluation.
// 5. Validate consented signal category against binding + allowed category intersection.
// 6. Consume durable nonce once.

import { permitProtocolAction, type AbraxasPartnerKit, type PartnerKitSafeResult } from "@/lib/partner/integrationKit";
import { portableReasonFromOutcome } from "@/lib/partner/portableActionContract/preflight";
import { consumeTradingVenueNonce } from "@/lib/partner/tradingVenue/nonceStore";
import { WalletStandardStoreUnavailableError } from "@/lib/partner/walletStandard/errors";
import {
  validatePartnerActivitySignal,
  type PartnerActivitySafeReasonCode,
  type PartnerActivitySignal,
} from "./contract";
import {
  normalizePartnerActivitySignalBinding,
  type PartnerActivitySignalBinding,
} from "./bind";
import {
  deniedActivityResult,
  permittedActivityResult,
  type PartnerActivityClientVisibleResult,
} from "./clientVisible";

const MAX_BINDING_TTL_MS = 60 * 60 * 1000;

function activityNoncePartnerId(partnerId: string): string {
  return `${partnerId.trim()}:activity_signal`;
}

function mapNormalizeFailure(reason: "invalid" | "invalid_activity_signal" | "binding_integrity_mismatch"): PartnerActivitySafeReasonCode {
  if (reason === "invalid_activity_signal") return "invalid_activity_signal";
  if (reason === "binding_integrity_mismatch") return "binding_integrity_mismatch";
  return "invalid";
}

export async function preflightPartnerActivitySignal(input: {
  kit: AbraxasPartnerKit;
  result: PartnerKitSafeResult;
  receipt_payload_hash: string;
  signal: unknown;
  binding: unknown;
  allowed_categories: readonly string[];
  expected_purpose: string;
  expected_action_scope: string;
  now?: number;
}): Promise<PartnerActivityClientVisibleResult> {
  const normalizedBinding = normalizePartnerActivitySignalBinding({ binding: input.binding });
  if ("ok" in normalizedBinding) {
    return deniedActivityResult(mapNormalizeFailure(normalizedBinding.reason), "");
  }
  const binding: PartnerActivitySignalBinding = normalizedBinding;
  const actionScope = binding.action_scope;
  const now = input.now ?? Date.now();

  if (binding.partner_id !== input.kit.options.partnerId) {
    return deniedActivityResult("partner_mismatch", actionScope, "rejected", binding.expires_at);
  }
  if (
    binding.policy_id !== input.kit.options.policyId
    || binding.policy_version !== (input.kit.options.policyVersion ?? 1)
  ) {
    return deniedActivityResult("policy_mismatch", actionScope, "rejected", binding.expires_at);
  }
  if (binding.environment !== input.kit.options.environment) {
    return deniedActivityResult("environment_mismatch", actionScope, "rejected", binding.expires_at);
  }
  if (binding.purpose !== input.expected_purpose.trim() || binding.action_scope !== input.expected_action_scope.trim()) {
    return deniedActivityResult("receipt_binding_mismatch", actionScope, "rejected", binding.expires_at);
  }
  if (Date.parse(binding.issued_at) > now + 5_000) {
    return deniedActivityResult("invalid", actionScope, "rejected", binding.expires_at);
  }
  if (Date.parse(binding.expires_at) <= now) {
    return deniedActivityResult("binding_expired", actionScope, "rejected", binding.expires_at);
  }
  if (Date.parse(binding.expires_at) - Date.parse(binding.issued_at) > MAX_BINDING_TTL_MS) {
    return deniedActivityResult("invalid", actionScope, "rejected", binding.expires_at);
  }

  const payloadHash = input.receipt_payload_hash.trim().toLowerCase();
  if (!/^0x[0-9a-fA-F]{64}$/.test(payloadHash)) {
    return deniedActivityResult("receipt_binding_mismatch", actionScope, "rejected", binding.expires_at);
  }
  if (binding.receipt_payload_hash !== payloadHash) {
    return deniedActivityResult("receipt_binding_mismatch", actionScope, "rejected", binding.expires_at);
  }
  if (!input.result.receipt_id || binding.receipt_id !== input.result.receipt_id) {
    return deniedActivityResult("receipt_binding_mismatch", actionScope, "rejected", binding.expires_at);
  }

  if (!permitProtocolAction(input.result)) {
    const reason = portableReasonFromOutcome(input.result.outcome) as PartnerActivitySafeReasonCode;
    return deniedActivityResult(reason, actionScope, "rejected", binding.expires_at);
  }

  if (input.allowed_categories.length === 0) {
    return deniedActivityResult("activity_category_denied", actionScope, "rejected", binding.expires_at);
  }

  const parsedSignal = validatePartnerActivitySignal(input.signal);
  if (!parsedSignal.ok) {
    return deniedActivityResult(
      parsedSignal.code === "raw_activity_forbidden" ? "raw_activity_forbidden" : "invalid_activity_signal",
      actionScope,
      "rejected",
      binding.expires_at,
    );
  }
  const signal: PartnerActivitySignal = parsedSignal.signal;
  if (signal.type !== binding.activity_signal_type) {
    return deniedActivityResult("receipt_binding_mismatch", actionScope, "rejected", binding.expires_at);
  }
  if (!(input.allowed_categories as readonly string[]).includes(signal.type)) {
    return deniedActivityResult("activity_category_denied", actionScope, "rejected", binding.expires_at);
  }

  let nonceState: "consumed" | "replayed" | "invalid" | "expired";
  try {
    nonceState = await consumeTradingVenueNonce(
      activityNoncePartnerId(binding.partner_id),
      binding.nonce,
      binding.expires_at,
    );
  } catch (error) {
    if (error instanceof WalletStandardStoreUnavailableError) {
      return deniedActivityResult("store_unavailable", actionScope, "rejected", binding.expires_at);
    }
    throw error;
  }
  if (nonceState === "replayed") {
    return deniedActivityResult("replayed", actionScope, "replayed", binding.expires_at);
  }
  if (nonceState === "expired") {
    return deniedActivityResult("binding_expired", actionScope, "rejected", binding.expires_at);
  }
  if (nonceState === "invalid") {
    return deniedActivityResult("invalid", actionScope, "rejected", binding.expires_at);
  }

  return permittedActivityResult(signal.type, actionScope, binding.expires_at);
}
