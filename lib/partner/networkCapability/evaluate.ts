// FILE: lib/partner/networkCapability/evaluate.ts
// Strict Mainnet/testnet/planned gates. Fail closed. Never execute.

import { getNetworkCapability } from "./registry";
import type {
  NetworkCapabilityEntry,
  NetworkContext,
  NetworkReadinessReason,
} from "./types";

export interface NetworkActionContext {
  productionAccessApproved: boolean;
  kitEnvironment: "sandbox" | "production";
  receiptCurrentlyValid: boolean;
  durableReplaySatisfied: boolean;
  partnerExecutionIntegration: boolean;
  actionType: string;
}

export function networkIsMainnet(entry: NetworkCapabilityEntry): boolean {
  return entry.environment === "mainnet";
}

export function evaluateNetworkAction(input: {
  networkId: string;
  context: NetworkActionContext;
}): { ok: true; reason: "eligible"; entry: NetworkCapabilityEntry; network_context: NetworkContext }
  | { ok: false; reason: NetworkReadinessReason; entry: NetworkCapabilityEntry | null } {
  const entry = getNetworkCapability(input.networkId);
  if (!entry) return { ok: false, reason: "not_configured", entry: null };
  if (entry.status === "planned" || entry.environment === "planned") {
    return { ok: false, reason: "planned", entry };
  }
  if (entry.status === "disabled") {
    return { ok: false, reason: "disabled", entry };
  }
  if (entry.status === "production_review_required" || (networkIsMainnet(entry) && !input.context.productionAccessApproved)) {
    return { ok: false, reason: "production_review_required", entry };
  }
  if (networkIsMainnet(entry) && input.context.kitEnvironment !== "production") {
    return { ok: false, reason: "environment_mismatch", entry };
  }
  if (entry.environment === "testnet" && input.context.kitEnvironment === "production") {
    return { ok: false, reason: "environment_mismatch", entry };
  }
  if (entry.environment === "sandbox" && input.context.kitEnvironment === "production") {
    return { ok: false, reason: "environment_mismatch", entry };
  }
  if (!(entry.supported_actions as readonly string[]).includes(input.context.actionType)) {
    return { ok: false, reason: "unsupported_action", entry };
  }
  if (!input.context.receiptCurrentlyValid) {
    return { ok: false, reason: "receipt_not_current", entry };
  }
  if (!input.context.durableReplaySatisfied) {
    return { ok: false, reason: "replay_required", entry };
  }
  if (networkIsMainnet(entry) && !input.context.partnerExecutionIntegration) {
    return { ok: false, reason: "partner_execution_required", entry };
  }
  if (entry.status !== "configured" && entry.status !== "available") {
    return { ok: false, reason: "not_configured", entry };
  }
  return {
    ok: true,
    reason: "eligible",
    entry,
    network_context: { network_id: entry.network_id, environment: entry.environment },
  };
}

export function mapNetworkReasonToPortable(reason: NetworkReadinessReason): string {
  if (reason === "environment_mismatch") return "environment_mismatch";
  if (reason === "unsupported_action") return "action_mismatch";
  if (reason === "receipt_not_current") return "invalid";
  if (reason === "replay_required") return "replayed";
  if (reason === "client_override_rejected") return "invalid";
  if (reason === "production_review_required") return "invalid";
  return "invalid";
}
