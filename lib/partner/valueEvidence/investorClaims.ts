// FILE: lib/partner/valueEvidence/investorClaims.ts
// Dynamic investor claim registry — regenerated from current metrics.

import type { InvestorClaim } from "./contract";
import type { PartnerPilotSummary } from "@/lib/partner/pilotEvidence";
import type { ConversionCounts } from "./conversion";
import type { DurationMetric } from "./contract";

export function buildInvestorClaimRegistry(input: {
  pilotSandbox: PartnerPilotSummary;
  pilotProduction: PartnerPilotSummary | null;
  velocity: Record<string, DurationMetric>;
  conversionCounts: ConversionCounts;
  policyExpansionCount: number;
  generatedAt?: Date;
}): InvestorClaim[] {
  const now = (input.generatedAt ?? new Date()).toISOString();
  const dataThrough = input.pilotSandbox.time_window.to ?? now;
  const window = { from: input.pilotSandbox.time_window.from, to: input.pilotSandbox.time_window.to };
  const claims: InvestorClaim[] = [];

  const firstVerify = input.velocity.application_created_to_first_successful_verification;
  if (firstVerify.quality === "measured" && firstVerify.duration_ms != null) {
    claims.push({
      claim_id: "median_time_to_first_sandbox_verification",
      claim: `Partner reached first successful sandbox verification in ${firstVerify.duration_ms}ms from application creation.`,
      status: "supported",
      evidence_source: "partner_integration_events",
      quality: "measured",
      time_window: window,
      scope: `application:${input.pilotSandbox.application_id}`,
      generated_at: now,
      data_through: dataThrough,
      numerator: 1,
      denominator: 1,
    });
  } else {
    claims.push({
      claim_id: "median_time_to_first_sandbox_verification",
      claim: "Partner reached first successful sandbox verification in X.",
      status: "not_supported",
      evidence_source: "partner_integration_events",
      quality: "unavailable",
      time_window: window,
      scope: `application:${input.pilotSandbox.application_id}`,
      generated_at: now,
      data_through: dataThrough,
      numerator: null,
      denominator: null,
    });
  }

  const started = input.conversionCounts.sandbox_started;
  const prodActive = input.conversionCounts.production_active;
  claims.push({
    claim_id: "production_conversion_share",
    claim: started > 0
      ? `${prodActive} of ${started} integrations with sandbox activity reached production active.`
      : "Y% of design partners that started integration reached production.",
    status: started > 0 ? "supported" : "not_supported",
    evidence_source: "partner_lifecycle_resolver",
    quality: started > 0 ? "derived" : "unavailable",
    time_window: window,
    scope: "portfolio",
    generated_at: now,
    data_through: dataThrough,
    numerator: prodActive,
    denominator: started,
  });

  const reuseRate = input.pilotSandbox.metrics.reuse_rate.value;
  const reuseDenom = input.pilotSandbox.metrics.evidence_reuse_count.value
    + input.pilotSandbox.metrics.evidence_refresh_required_count.value;
  claims.push({
    claim_id: "evidence_reuse_rate",
    claim: reuseRate != null
      ? `${(reuseRate * 100).toFixed(1)}% of observed reuse opportunities used existing verified evidence.`
      : "N% of eligible verification requests reused existing evidence.",
    status: reuseRate != null ? "supported" : "not_supported",
    evidence_source: "partner_integration_events",
    quality: reuseRate != null ? "derived" : "unavailable",
    time_window: window,
    scope: `application:${input.pilotSandbox.application_id}`,
    generated_at: now,
    data_through: dataThrough,
    numerator: input.pilotSandbox.metrics.evidence_reuse_count.value,
    denominator: reuseDenom || null,
  });

  claims.push({
    claim_id: "multi_policy_partners",
    claim: input.policyExpansionCount > 0
      ? `${input.policyExpansionCount} partner(s) consumed more than one policy in production scope.`
      : "Z production partners have expanded into multiple policies.",
    status: input.policyExpansionCount > 0 ? "supported" : "not_supported",
    evidence_source: "policy_consumption",
    quality: input.policyExpansionCount > 0 ? "measured" : "unavailable",
    time_window: window,
    scope: "portfolio",
    generated_at: now,
    data_through: dataThrough,
    numerator: input.policyExpansionCount,
    denominator: null,
  });

  claims.push({
    claim_id: "privacy_preserving_receipts",
    claim: "Abraxas withheld underlying identity attributes while returning policy-specific eligibility results.",
    status: input.pilotSandbox.privacy_facts.length > 0 ? "supported" : "not_supported",
    evidence_source: "policy_disclosure_contract",
    quality: "measured",
    time_window: window,
    scope: `application:${input.pilotSandbox.application_id}`,
    generated_at: now,
    data_through: dataThrough,
    numerator: null,
    denominator: null,
  });

  return claims;
}
