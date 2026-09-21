// FILE: lib/reclaimAttestation/mapping.ts
// Source-controlled Reclaim provider/version → Abraxas method/result mapping.
// Runtime input cannot select provider ID, version, regex, field, website, or policy.

import type { AssuranceLevel } from "@/lib/credentials/claimSchema";
import type { PolicyFitCategory, PolicyFitEnvironment } from "@/lib/partner/integrationStudio/policyFit/contract";

export interface ReclaimProviderMapping {
  mapping_id: string;
  provider_id: string;
  provider_version: string;
  environments: readonly PolicyFitEnvironment[];
  method_category: "privacy_preserving";
  result_categories: readonly PolicyFitCategory[];
  assurance_level: AssuranceLevel;
  required_extracted_keys: readonly string[];
  required_extracted_equals: Readonly<Record<string, string>>;
  reviewed_live: false;
}

export const RECLAIM_SANDBOX_MAPPING: ReclaimProviderMapping = {
  mapping_id: "reclaim.sandbox.age_gate",
  provider_id: "reclaim-sandbox-http-provider",
  provider_version: "1",
  environments: ["sandbox"],
  method_category: "privacy_preserving",
  result_categories: ["age_18", "age_21"],
  assurance_level: "L1",
  required_extracted_keys: ["eligible"],
  required_extracted_equals: { eligible: "true" },
  reviewed_live: false,
};

export const RECLAIM_PROVIDER_MAPPINGS: readonly ReclaimProviderMapping[] = [
  RECLAIM_SANDBOX_MAPPING,
];

export function mappingForPolicy(input: {
  method_category: string;
  result_category: string;
  assurance_level: string;
  environment: string;
}): ReclaimProviderMapping | null {
  return RECLAIM_PROVIDER_MAPPINGS.find((mapping) =>
    mapping.method_category === input.method_category
    && mapping.result_categories.includes(input.result_category as PolicyFitCategory)
    && mapping.assurance_level === input.assurance_level
    && mapping.environments.includes(input.environment as PolicyFitEnvironment)
    && mapping.reviewed_live === false
  ) ?? null;
}

export function mappingById(mappingId: string): ReclaimProviderMapping | null {
  return RECLAIM_PROVIDER_MAPPINGS.find((mapping) => mapping.mapping_id === mappingId) ?? null;
}

export function extractedShapeMatches(
  mapping: ReclaimProviderMapping,
  extracted: Record<string, string> | null | undefined,
): boolean {
  if (!extracted) return false;
  for (const key of mapping.required_extracted_keys) {
    if (!(key in extracted)) return false;
    const expected = mapping.required_extracted_equals[key];
    if (expected != null && extracted[key] !== expected) return false;
  }
  return true;
}
