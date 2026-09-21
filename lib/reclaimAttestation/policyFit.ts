// FILE: lib/reclaimAttestation/policyFit.ts

import { inferPolicyPackFromPolicyId, resolvePolicyPack, type PolicyPack } from "@/lib/partner/launchpad/policyPacks";
import { mappingForPolicy } from "./mapping";
import { reclaimIsIntegrationReady } from "./config";

const PACK_RESULT: Record<string, string> = {
  age_18_retail: "age_18",
  age_21_retail: "age_21",
};

export function packForReclaim(policyId: string): PolicyPack | null {
  return resolvePolicyPack(policyId) ?? inferPolicyPackFromPolicyId(policyId);
}

export function reclaimRouteForPolicy(policyId: string, environment: "sandbox" | "production" = "sandbox") {
  const pack = packForReclaim(policyId);
  if (!pack) return null;
  const resultClass = PACK_RESULT[pack.id];
  if (!resultClass) return null;
  const mapping = mappingForPolicy({
    method_category: "privacy_preserving",
    result_category: resultClass,
    assurance_level: pack.minimum_assurance,
    environment,
  });
  if (!mapping) return null;
  return {
    pack,
    mapping,
    resultClass,
    available: reclaimIsIntegrationReady(),
  };
}
