// FILE: lib/partner/portableActionContract/preflight.ts
// Shared preflight gates. Webhooks, callbacks, and client contracts are never grants.

import { permitProtocolAction, type AbraxasPartnerKit, type PartnerKitSafeResult } from "@/lib/partner/integrationKit";
import type { PartnerIntegrationOutcome } from "@/lib/partner/integrationKit/contract";
import { consumeTradingVenueNonce } from "@/lib/partner/tradingVenue/nonceStore";
import { resolveWalletBindingForAction } from "@/lib/partner/walletStandard/resolve";
import { WalletStandardStoreUnavailableError } from "@/lib/partner/walletStandard/errors";
import { evaluateNetworkAction, mapNetworkReasonToPortable } from "@/lib/partner/networkCapability/evaluate";
import type { NetworkContext } from "@/lib/partner/networkCapability/types";
import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";
import {
  PORTABLE_ACTION_CONTRACT_KEYS,
  PORTABLE_ACTION_RECEIPT_REQUIREMENT,
  PORTABLE_ACTION_REJECTED_CONTRACT_KEYS,
  PORTABLE_ACTION_TYPE_SCOPES,
  isPortableActionScope,
  isPortableActionType,
  isPortableEnvironment,
  isPortableWalletBindingMode,
  type PortableActionBinding,
  type PortableActionClientResult,
  type PortableActionContract,
  type PortableActionSafeReasonCode,
  type PortableActionType,
} from "./contract";

export function portableReasonFromOutcome(outcome: PartnerIntegrationOutcome): PortableActionSafeReasonCode {
  switch (outcome) {
    case "permitted":
      return "permitted";
    case "denied":
      return "policy_denied";
    case "expired":
      return "receipt_expired";
    case "revoked":
      return "receipt_revoked";
    case "wrong_partner":
      return "partner_mismatch";
    case "wrong_policy":
    case "wrong_policy_version":
    case "policy_version_missing":
    case "policy_version_unknown":
    case "policy_version_draft":
    case "policy_version_deprecated":
    case "policy_version_not_yet_effective":
    case "policy_version_not_adopted":
      return "policy_mismatch";
    case "environment_mismatch":
      return "environment_mismatch";
    case "retry":
      return "retry";
    case "invalid_signature":
    case "invalid":
      return "invalid";
  }
}

function denied(
  reason: PortableActionSafeReasonCode,
  actionType: PortableActionType | "rejected",
  actionScope: string,
  nonceState: PortableActionBinding["nonce_state"],
  expiresAt: string | null = null,
  walletBinding: PortableActionBinding["wallet_binding"] = "not_attached",
): PortableActionClientResult {
  return {
    allowed: false,
    reason,
    action_binding: {
      action_type: actionType,
      action_scope: actionScope,
      nonce_state: nonceState,
      wallet_binding: walletBinding,
    },
    expires_at: expiresAt,
  };
}

export function normalizePortableActionContract(input: {
  kit: AbraxasPartnerKit;
  contract: unknown;
}): PortableActionContract | { ok: false; reason: PortableActionSafeReasonCode } {
  if (!input.contract || typeof input.contract !== "object" || Array.isArray(input.contract)) {
    return { ok: false, reason: "invalid" };
  }
  const raw = input.contract as Record<string, unknown>;
  const keys = Object.keys(raw);
  if (keys.some((key) => (PORTABLE_ACTION_REJECTED_CONTRACT_KEYS as readonly string[]).includes(key))) {
    return { ok: false, reason: "invalid" };
  }
  if (keys.some((key) => !(PORTABLE_ACTION_CONTRACT_KEYS as readonly string[]).includes(key))) {
    return { ok: false, reason: "invalid" };
  }
  const actionType = typeof raw.action_type === "string" ? raw.action_type : "";
  const actionScope = typeof raw.action_scope === "string" ? raw.action_scope : "";
  const nonce = typeof raw.nonce === "string" ? raw.nonce : "";
  const expiresAt = typeof raw.expires_at === "string" ? raw.expires_at : "";
  if (!nonce || !expiresAt) return { ok: false, reason: "invalid" };
  const walletBinding = raw.wallet_binding === undefined
    ? "not_attached"
    : typeof raw.wallet_binding === "string" && isPortableWalletBindingMode(raw.wallet_binding)
      ? raw.wallet_binding
      : null;
  if (!walletBinding) return { ok: false, reason: "action_mismatch" };
  const environment = raw.environment === undefined
    ? input.kit.options.environment
    : typeof raw.environment === "string" && isPortableEnvironment(raw.environment)
      ? raw.environment
      : null;
  if (!environment) return { ok: false, reason: "environment_mismatch" };
  if (
    raw.receipt_requirement !== undefined
    && raw.receipt_requirement !== PORTABLE_ACTION_RECEIPT_REQUIREMENT
  ) {
    return { ok: false, reason: "invalid" };
  }
  let network_context: NetworkContext | undefined;
  if (raw.network_context !== undefined) {
    if (!raw.network_context || typeof raw.network_context !== "object" || Array.isArray(raw.network_context)) {
      return { ok: false, reason: "invalid" };
    }
    const nc = raw.network_context as Record<string, unknown>;
    const ncKeys = Object.keys(nc);
    if (ncKeys.some((key) => key !== "network_id" && key !== "environment")) {
      return { ok: false, reason: "invalid" };
    }
    if (typeof nc.network_id !== "string" || !nc.network_id) return { ok: false, reason: "invalid" };
    const known = getNetworkCapability(nc.network_id);
    if (!known) return { ok: false, reason: "invalid" };
    if (typeof nc.environment === "string" && nc.environment !== known.environment) {
      return { ok: false, reason: "environment_mismatch" };
    }
    network_context = { network_id: known.network_id, environment: known.environment };
  }
  return {
    partner_id: typeof raw.partner_id === "string" ? raw.partner_id : "",
    policy_id: typeof raw.policy_id === "string" ? raw.policy_id : "",
    policy_version: typeof raw.policy_version === "number" ? raw.policy_version : Number.NaN,
    action_type: actionType as PortableActionType,
    action_scope: actionScope as PortableActionContract["action_scope"],
    receipt_requirement: PORTABLE_ACTION_RECEIPT_REQUIREMENT,
    issued_at: typeof raw.issued_at === "string" ? raw.issued_at : expiresAt,
    expires_at: expiresAt,
    nonce,
    wallet_binding: walletBinding,
    environment,
    ...(network_context ? { network_context } : {}),
  };
}

export async function preflightPortableAction(input: {
  kit: AbraxasPartnerKit;
  result: PartnerKitSafeResult;
  contract: unknown;
  action_type?: string;
  action_scope?: string;
  binding_ref?: string | null;
}): Promise<PortableActionClientResult> {
  const normalized = normalizePortableActionContract({ kit: input.kit, contract: input.contract });
  if ("ok" in normalized && normalized.ok === false) {
    return denied(normalized.reason, "rejected", String(input.action_scope ?? ""), "rejected");
  }
  const contract = normalized as PortableActionContract;
  const requestedType = input.action_type ?? contract.action_type;
  const requestedScope = input.action_scope ?? contract.action_scope;
  if (!isPortableActionType(requestedType) || !isPortableActionScope(requestedScope)) {
    return denied("action_mismatch", "rejected", String(requestedScope), "rejected");
  }
  if (PORTABLE_ACTION_TYPE_SCOPES[requestedType] !== requestedScope) {
    return denied("action_mismatch", requestedType, requestedScope, "rejected", contract.expires_at);
  }
  if (contract.partner_id !== input.kit.options.partnerId) {
    return denied("partner_mismatch", requestedType, requestedScope, "rejected", contract.expires_at);
  }
  if (
    contract.policy_id !== input.kit.options.policyId
    || contract.policy_version !== (input.kit.options.policyVersion ?? 1)
  ) {
    return denied("policy_mismatch", requestedType, requestedScope, "rejected", contract.expires_at);
  }
  if (contract.environment !== input.kit.options.environment) {
    return denied("environment_mismatch", requestedType, requestedScope, "rejected", contract.expires_at);
  }
  if (contract.action_type !== requestedType || contract.action_scope !== requestedScope) {
    return denied("action_mismatch", requestedType, requestedScope, "rejected", contract.expires_at);
  }
  if (Date.parse(contract.expires_at) <= Date.now()) {
    return denied("action_expired", requestedType, requestedScope, "rejected", contract.expires_at);
  }
  if (!permitProtocolAction(input.result)) {
    return denied(
      portableReasonFromOutcome(input.result.outcome),
      requestedType,
      requestedScope,
      "rejected",
      contract.expires_at,
    );
  }
  if (contract.network_context) {
    const network = evaluateNetworkAction({
      networkId: contract.network_context.network_id,
      context: {
        productionAccessApproved: input.kit.options.environment === "production",
        kitEnvironment: input.kit.options.environment,
        receiptCurrentlyValid: true,
        durableReplaySatisfied: true,
        partnerExecutionIntegration: false,
        actionType: requestedType,
      },
    });
    if (!network.ok) {
      const mapped = mapNetworkReasonToPortable(network.reason);
      return denied(
        mapped as PortableActionSafeReasonCode,
        requestedType,
        requestedScope,
        "rejected",
        contract.expires_at,
      );
    }
  }

  const wallet = await resolveWalletBindingForAction({
    mode: contract.wallet_binding,
    bindingRef: input.binding_ref,
    partnerId: input.kit.options.partnerId,
    actionContractNonce: contract.nonce,
    consume: false,
  });
  if (!wallet.ok) {
    if (wallet.status === "store_unavailable") {
      return denied("store_unavailable", requestedType, requestedScope, "rejected", contract.expires_at);
    }
    const reason: PortableActionSafeReasonCode =
      wallet.status === "missing" ? "wallet_binding_missing"
      : wallet.status === "expired" ? "wallet_binding_expired"
      : wallet.status === "mismatched" ? "wallet_binding_mismatch"
      : wallet.status === "replayed" ? "wallet_binding_replayed"
      : wallet.status === "cross_partner" ? "wallet_binding_cross_partner"
      : "invalid";
    const walletState: PortableActionBinding["wallet_binding"] =
      wallet.status === "cross_partner" ? "cross_partner"
      : wallet.status === "replayed" ? "replayed"
      : wallet.status === "expired" ? "expired"
      : wallet.status === "mismatched" ? "mismatched"
      : "missing";
    return denied(reason, requestedType, requestedScope, "rejected", contract.expires_at, walletState);
  }

  let nonceState: "consumed" | "replayed" | "invalid" | "expired";
  try {
    nonceState = await consumeTradingVenueNonce(
      input.kit.options.partnerId,
      contract.nonce,
      contract.expires_at,
    );
  } catch (error) {
    if (error instanceof WalletStandardStoreUnavailableError) {
      return denied("store_unavailable", requestedType, requestedScope, "rejected", contract.expires_at);
    }
    throw error;
  }
  if (nonceState === "replayed") {
    return denied("replayed", requestedType, requestedScope, "replayed", contract.expires_at);
  }
  if (nonceState === "expired") {
    return denied("action_expired", requestedType, requestedScope, "rejected", contract.expires_at);
  }
  if (nonceState === "invalid") {
    return denied("invalid", requestedType, requestedScope, "rejected", contract.expires_at);
  }
  if (wallet.status === "bound") {
    await resolveWalletBindingForAction({
      mode: contract.wallet_binding,
      bindingRef: input.binding_ref,
      partnerId: input.kit.options.partnerId,
      actionContractNonce: contract.nonce,
      consume: true,
    });
  }
  const walletState: PortableActionBinding["wallet_binding"] = wallet.status === "bound"
    ? "bound"
    : wallet.status === "optional_unused"
      ? "optional"
      : "not_attached";
  return {
    allowed: true,
    reason: "permitted",
    action_binding: {
      action_type: requestedType,
      action_scope: requestedScope,
      nonce_state: "consumed",
      wallet_binding: walletState,
    },
    expires_at: contract.expires_at,
  };
}
