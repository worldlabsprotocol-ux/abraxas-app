// FILE: lib/partner/twoAppEvaluation/payloadComparison.ts
// Safe source vs application payload comparison — categories only, no raw KYC.

import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import type { TwoAppPayloadComparison } from "./contract";
import type { TwoAppReuseMetrics } from "./contract";

const SOURCE_EVIDENCE_CATEGORIES = [
  "Identity attributes required by verification provider",
  "Provider attestation metadata",
  "Internal subject binding references",
] as const;

const APPLICATION_RECEIVES_CATEGORIES = [
  "Policy-specific eligibility result",
  "Receipt / result identifier",
  "Validity and freshness information",
  "Approved public metadata fields only",
] as const;

export function buildPayloadComparison(input: {
  targetPolicyPack: string;
  metrics: TwoAppReuseMetrics;
}): TwoAppPayloadComparison {
  const pack = POLICY_PACKS[input.targetPolicyPack as keyof typeof POLICY_PACKS];
  const observedFields = pack
    ? [pack.disclosed_result, pack.receipt_claim].filter(Boolean)
    : [];

  const quality: TwoAppPayloadComparison["quality"] =
    input.metrics.metrics_quality === "observed"
      ? "observed"
      : input.metrics.metrics_quality === "partial"
        ? "conceptual"
        : "not_yet_observed";

  return {
    source_evidence_may_include: SOURCE_EVIDENCE_CATEGORIES,
    application_receives: APPLICATION_RECEIVES_CATEGORIES,
    observed_field_inventory: observedFields,
    quality,
  };
}
