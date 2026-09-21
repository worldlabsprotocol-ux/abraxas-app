import { isInstitutionalPolicyId } from "@/lib/organizationEligibility/chainCommitments";
import type { OnchainGateSafeReason } from "./contract";
import {
  solanaObservationHasV2InstitutionalCapability,
  solanaObservationIsV1Only,
  type EvmChainObservation,
  type SolanaChainObservation,
} from "./adapters";

export const INSTITUTIONAL_V2_LABEL = "Requires institutional V2 attestations" as const;
export const STANDARD_GATE_LABEL = "Standard eligibility gate." as const;

export const ONCHAIN_GATE_INSTITUTIONAL_CLASSES = ["institutional_v2", "standard"] as const;
export type OnchainGateInstitutionalClass = (typeof ONCHAIN_GATE_INSTITUTIONAL_CLASSES)[number];

export function institutionalClassFromFlag(requireInstitutional: boolean): OnchainGateInstitutionalClass {
  return requireInstitutional ? "institutional_v2" : "standard";
}

export function institutionalLabel(requireInstitutional: boolean): string {
  return requireInstitutional ? INSTITUTIONAL_V2_LABEL : STANDARD_GATE_LABEL;
}

export function observedRequireInstitutional(input: {
  gateType: "evm" | "solana";
  evmObservation?: EvmChainObservation | null;
  solanaObservation?: SolanaChainObservation | null;
}): boolean {
  if (input.gateType === "solana") {
    if (!input.solanaObservation) return false;
    return solanaObservationHasV2InstitutionalCapability(input.solanaObservation);
  }
  return input.evmObservation?.requireInstitutional === true;
}

export function deriveRequireInstitutional(input: {
  gateType: "evm" | "solana";
  policyId: string;
  evmObservation?: EvmChainObservation | null;
  solanaObservation?: SolanaChainObservation | null;
}): { ok: true; require_institutional: boolean } | { ok: false; reason: OnchainGateSafeReason } {
  const serverRequires = isInstitutionalPolicyId(input.policyId);
  if (input.gateType === "solana") {
    if (!input.solanaObservation) return { ok: false, reason: "deployment_verification_unavailable" };
    if (serverRequires && (
      solanaObservationIsV1Only(input.solanaObservation)
      || !solanaObservationHasV2InstitutionalCapability(input.solanaObservation)
    )) {
      return { ok: false, reason: "institutional_required" };
    }
  } else if (serverRequires && input.evmObservation?.requireInstitutional !== true) {
    return { ok: false, reason: "institutional_required" };
  }
  return {
    ok: true,
    require_institutional: serverRequires || observedRequireInstitutional(input),
  };
}
