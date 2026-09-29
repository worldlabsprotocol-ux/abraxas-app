// FILE: lib/partner/pilotEvidence/export.ts
// Investor diligence export — admin-only, privacy-safe JSON.

import { integrationObservabilityLeaks } from "@/lib/partner/integrationObservability/sanitize";
import { PARTNER_VALUE_METRIC_DEFINITIONS } from "./metricDefinitions";
import type { PartnerPilotSummary } from "./contract";
import { PILOT_EVIDENCE_VERSION } from "./contract";

export interface InvestorDiligenceExport {
  contract_version: typeof PILOT_EVIDENCE_VERSION;
  export_kind: "investor_diligence";
  exported_at: string;
  partner_id: string;
  application_id: string;
  environment: "sandbox" | "production";
  metric_definitions: typeof PARTNER_VALUE_METRIC_DEFINITIONS;
  summary: PartnerPilotSummary;
}

export function buildInvestorDiligenceExport(summary: PartnerPilotSummary): InvestorDiligenceExport | { ok: false; code: "redacted" } {
  const payload: InvestorDiligenceExport = {
    contract_version: PILOT_EVIDENCE_VERSION,
    export_kind: "investor_diligence",
    exported_at: new Date().toISOString(),
    partner_id: summary.partner_id,
    application_id: summary.application_id,
    environment: summary.environment,
    metric_definitions: PARTNER_VALUE_METRIC_DEFINITIONS,
    summary,
  };
  if (pilotEvidenceLeaks(payload).length > 0) {
    return { ok: false, code: "redacted" };
  }
  return payload;
}

function stripPrivacyFactLabels(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) return payload;
  const clone = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  const scrubFacts = (facts: unknown) => {
    if (!Array.isArray(facts)) return facts;
    return facts.map((fact) => {
      if (typeof fact !== "object" || fact === null) return fact;
      const row = { ...(fact as Record<string, unknown>) };
      row.partner_does_not_receive = ["withheld_categories"];
      return row;
    });
  };
  if (clone.privacy_facts) clone.privacy_facts = scrubFacts(clone.privacy_facts);
  const summary = clone.summary;
  if (typeof summary === "object" && summary !== null && "privacy_facts" in summary) {
    (summary as Record<string, unknown>).privacy_facts = scrubFacts(
      (summary as Record<string, unknown>).privacy_facts,
    );
  }
  return clone;
}

export function pilotEvidenceLeaks(payload: unknown): string[] {
  const leaks = integrationObservabilityLeaks(stripPrivacyFactLabels(payload));
  const blob = JSON.stringify(payload).toLowerCase();
  if (/\b\d{5}(-\d{4})?\b/.test(blob)) leaks.push("postal_code_pattern");
  if (/fake arr|fake acv|fake roi|cost savings|revenue impact/.test(blob)) {
    leaks.push("commercial_fiction");
  }
  return leaks;
}
