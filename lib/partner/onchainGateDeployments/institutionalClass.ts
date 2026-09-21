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
