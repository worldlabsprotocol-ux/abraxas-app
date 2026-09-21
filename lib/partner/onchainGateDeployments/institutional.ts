import { isInstitutionalPolicyId } from "@/lib/organizationEligibility/chainCommitments";
import type { OnchainGateSafeReason } from "./contract";
import {
  solanaObservationHasV2InstitutionalCapability,
  solanaObservationIsV1Only,
  type EvmChainObservation,
  type SolanaChainObservation,
} from "./adapters";

export {
  INSTITUTIONAL_V2_LABEL,
  STANDARD_GATE_LABEL,
  ONCHAIN_GATE_INSTITUTIONAL_CLASSES,
  institutionalClassFromFlag,
  institutionalLabel,
  type OnchainGateInstitutionalClass,
} from "./institutionalClass";

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
