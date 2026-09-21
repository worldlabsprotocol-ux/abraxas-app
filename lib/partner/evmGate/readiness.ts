// Launchpad-safe EVM gate readiness. Client fields are never authority.

import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";
import type { EvmGateDeploymentManifest } from "./manifest";
import { rejectEvmGateClientAuthority, validateEvmGateManifest } from "./validate";

export const EVM_GATE_READINESS_STATES = [
  "not_configured",
  "local_test_ready",
  "partner_deployed_recorded",
  "production_review_required",
] as const;
export type EvmGateReadinessState = (typeof EVM_GATE_READINESS_STATES)[number];

export function evaluateEvmGateReadiness(input: {
  recordedManifest?: unknown;
  clientBody?: unknown;
  productionAccessApproved?: boolean;
}): {
  state: EvmGateReadinessState;
  live: false;
  client_authority: false;
  reason: string;
} {
  if (input.clientBody !== undefined && rejectEvmGateClientAuthority(input.clientBody)) {
    return { state: "not_configured", live: false, client_authority: false, reason: "client_override_rejected" };
  }
  if (input.recordedManifest == null) {
    return { state: "not_configured", live: false, client_authority: false, reason: "not_configured" };
  }
  const parsed = validateEvmGateManifest(input.recordedManifest);
  if (!parsed.ok) {
    return { state: "not_configured", live: false, client_authority: false, reason: parsed.reason };
  }
  return readinessFromManifest(parsed.manifest, input.productionAccessApproved === true);
}

export function readinessFromManifest(
  manifest: EvmGateDeploymentManifest,
  productionAccessApproved: boolean,
): { state: EvmGateReadinessState; live: false; client_authority: false; reason: string } {
  const entry = getNetworkCapability(manifest.network_id);
  if (!entry || entry.status === "disabled") {
    return { state: "not_configured", live: false, client_authority: false, reason: "network_disabled" };
  }
  if (entry.status === "production_review_required" || entry.environment === "mainnet") {
    return {
      state: "production_review_required",
      live: false,
      client_authority: false,
      reason: productionAccessApproved ? "production_review_required" : "production_review_required",
    };
  }
  if (manifest.status === "local_test") {
    return { state: "local_test_ready", live: false, client_authority: false, reason: "local_test" };
  }
  return { state: "partner_deployed_recorded", live: false, client_authority: false, reason: "partner_deployed" };
}

export function registerEvmGateManifest(input: {
  manifest: unknown;
  clientBody?: unknown;
}): { ok: true; manifest: EvmGateDeploymentManifest; state: EvmGateReadinessState } | { ok: false; reason: string } {
  if (input.clientBody !== undefined && rejectEvmGateClientAuthority(input.clientBody)) {
    return { ok: false, reason: "client_override_rejected" };
  }
  const parsed = validateEvmGateManifest(input.manifest);
  if (!parsed.ok) return parsed;
  const ready = readinessFromManifest(parsed.manifest, false);
  if (ready.state === "not_configured") return { ok: false, reason: ready.reason };
  return { ok: true, manifest: parsed.manifest, state: ready.state };
}

export function evmGateLaunchpadPublicView() {
  return {
    states: [...EVM_GATE_READINESS_STATES],
    live: false as const,
    client_authority: false as const,
    circle_settlement: false as const,
    deploys_shared_contract: false as const,
    docs: "/docs/evm-onchain-eligibility-gate",
  };
}
