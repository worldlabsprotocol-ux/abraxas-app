// FILE: lib/partner/valueEvidence/networkEvidence.ts
// Network reuse prerequisites — no network effect score.

import type { PartnerPilotSummary } from "@/lib/partner/pilotEvidence";

export function assessNetworkReuseEvidence(input: {
  summaries: PartnerPilotSummary[];
}): {
  network_reuse_evidence: "measured" | "partial" | "unavailable";
  indicators: Record<string, boolean | number>;
  limitations: string[];
} {
  const reuseAcrossPartners = input.summaries.filter((s) => s.metrics.evidence_reuse_count.value > 0).length;
  const multiPolicy = input.summaries.filter((s) => s.metrics.unique_policy_count.value > 1).length;
  const repeatRequests = input.summaries.filter((s) => s.metrics.repeat_request_count.value > 0).length;

  const indicators = {
    partners_with_reuse_events: reuseAcrossPartners,
    partners_with_multi_policy: multiPolicy,
    partners_with_repeat_requests: repeatRequests,
    cross_partner_holder_reuse: false,
    compatibility_graph_usage: false,
  };

  let status: "measured" | "partial" | "unavailable" = "unavailable";
  if (reuseAcrossPartners > 1 || multiPolicy > 0) status = "partial";
  if (reuseAcrossPartners > 1 && multiPolicy > 0) status = "measured";

  return {
    network_reuse_evidence: status,
    indicators,
    limitations: [
      "Cross-partner holder reuse not measured — no holder correlation in partner events",
      "Compatibility graph usage not separately telemetried",
      "Does not imply network effects business classification",
    ],
  };
}
