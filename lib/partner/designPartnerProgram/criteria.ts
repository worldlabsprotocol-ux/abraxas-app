// FILE: lib/partner/designPartnerProgram/criteria.ts
// Evaluate pilot success criteria from measured evidence.

import type { PartnerPilotSummary } from "@/lib/partner/pilotEvidence";
import type { ApplicationValueEvidence } from "@/lib/partner/valueEvidence/build";
import type { CriteriaRow } from "./store";
import type { CriterionType, EvaluatedCriterion, EvidenceProvenance } from "./contract";

function nowIso(): string {
  return new Date().toISOString();
}

export function evaluateCriterion(input: {
  row: CriteriaRow;
  pilotSandbox: PartnerPilotSummary;
  pilotProduction: PartnerPilotSummary | null;
  valueEvidence: ApplicationValueEvidence;
}): EvaluatedCriterion {
  const { row, pilotSandbox, pilotProduction, valueEvidence } = input;
  const env = valueEvidence.lifecycle.technical_stage === "production_active" ? pilotProduction ?? pilotSandbox : pilotSandbox;
  const metrics = env.metrics;

  if (row.criterion_type === "custom_operator_confirmed") {
    const quality: EvidenceProvenance = row.operator_confirmed ? "operator_asserted" : "unavailable";
    return {
      criterion_type: row.criterion_type,
      target: row.target,
      measurement_source: row.measurement_source,
      status: row.operator_confirmed ? "met" : "pending",
      measured_value: row.operator_confirmed,
      quality,
      evaluated_at: row.operator_confirmed_at,
    };
  }

  switch (row.criterion_type as CriterionType) {
    case "integration_completed": {
      const met = pilotSandbox.integration_status !== "not_started";
      return {
        criterion_type: row.criterion_type,
        target: row.target,
        measurement_source: "partner_integration_events",
        status: met ? "met" : "pending",
        measured_value: pilotSandbox.integration_status,
        quality: met ? "system_measured" : "unavailable",
        evaluated_at: met ? nowIso() : null,
      };
    }
    case "first_successful_verification": {
      const count = metrics.successful_receipt_verifications.value;
      const met = count > 0;
      return {
        criterion_type: row.criterion_type,
        target: row.target,
        measurement_source: "partner_integration_events",
        status: met ? "met" : count === 0 && metrics.verification_attempts.value > 0 ? "not_met" : "pending",
        measured_value: count,
        quality: met ? "system_measured" : metrics.verification_attempts.value > 0 ? "system_measured" : "unavailable",
        evaluated_at: met ? nowIso() : null,
      };
    }
    case "minimum_successful_verifications": {
      const min = Number(row.target.min_count ?? row.target.minimum ?? 1);
      const count = metrics.successful_receipt_verifications.value;
      const hasData = metrics.verification_attempts.value > 0 || count > 0;
      return {
        criterion_type: row.criterion_type,
        target: row.target,
        measurement_source: "partner_integration_events",
        status: !hasData ? "pending" : count >= min ? "met" : "not_met",
        measured_value: count,
        quality: hasData ? "system_measured" : "unavailable",
        evaluated_at: hasData ? nowIso() : null,
      };
    }
    case "verification_success_rate": {
      const minRate = Number(row.target.min_rate ?? row.target.minimum ?? 0.9);
      const rate = metrics.verification_success_rate.value;
      return {
        criterion_type: row.criterion_type,
        target: row.target,
        measurement_source: "partner_integration_events",
        status: rate == null ? "unavailable" : rate >= minRate ? "met" : "not_met",
        measured_value: rate,
        quality: rate == null ? "unavailable" : "derived",
        evaluated_at: rate != null ? nowIso() : null,
      };
    }
    case "evidence_reuse_observed": {
      const count = metrics.evidence_reuse_count.value;
      return {
        criterion_type: row.criterion_type,
        target: row.target,
        measurement_source: "partner_integration_events",
        status: count > 0 ? "met" : metrics.total_requests.value > 0 ? "not_met" : "pending",
        measured_value: count,
        quality: metrics.total_requests.value > 0 ? "system_measured" : "unavailable",
        evaluated_at: metrics.total_requests.value > 0 ? nowIso() : null,
      };
    }
    case "production_activation": {
      const activated = Boolean(valueEvidence.lifecycle.technical_stage === "production_active"
        || pilotSandbox.production_status.activated);
      return {
        criterion_type: row.criterion_type,
        target: row.target,
        measurement_source: "partner_launchpad_applications.production_activated_at",
        status: activated ? "met" : "pending",
        measured_value: activated,
        quality: activated ? "system_measured" : "unavailable",
        evaluated_at: activated ? nowIso() : null,
      };
    }
    case "policy_supported": {
      const policyId = String(row.target.policy_id ?? row.target.policy_pack ?? "");
      const found = pilotSandbox.policy_consumption.some((p) => p.policy_id === policyId || p.pack_id === policyId);
      return {
        criterion_type: row.criterion_type,
        target: row.target,
        measurement_source: "policy_consumption",
        status: found ? "met" : pilotSandbox.metrics.total_requests.value > 0 ? "not_met" : "pending",
        measured_value: found,
        quality: pilotSandbox.metrics.total_requests.value > 0 ? "system_measured" : "unavailable",
        evaluated_at: pilotSandbox.metrics.total_requests.value > 0 ? nowIso() : null,
      };
    }
    case "privacy_requirement_satisfied": {
      const met = pilotSandbox.privacy_facts.length > 0;
      return {
        criterion_type: row.criterion_type,
        target: row.target,
        measurement_source: "policy_disclosure_contract",
        status: met ? "met" : "pending",
        measured_value: pilotSandbox.privacy_facts.length,
        quality: met ? "system_measured" : "unavailable",
        evaluated_at: met ? nowIso() : null,
      };
    }
    default:
      return {
        criterion_type: row.criterion_type,
        target: row.target,
        measurement_source: row.measurement_source,
        status: "unavailable",
        measured_value: null,
        quality: "unavailable",
        evaluated_at: null,
      };
  }
}

export function evaluateAllCriteria(input: {
  criteria: CriteriaRow[];
  pilotSandbox: PartnerPilotSummary;
  pilotProduction: PartnerPilotSummary | null;
  valueEvidence: ApplicationValueEvidence;
}): EvaluatedCriterion[] {
  return input.criteria.map((row) => evaluateCriterion({
    row,
    pilotSandbox: input.pilotSandbox,
    pilotProduction: input.pilotProduction,
    valueEvidence: input.valueEvidence,
  }));
}

export function deriveTechnicalOutcome(criteria: EvaluatedCriterion[]): import("./contract").TechnicalOutcome {
  if (criteria.length === 0) return "insufficient_evidence";
  const measurable = criteria.filter((c) => c.status !== "unavailable" && c.status !== "pending");
  if (measurable.length === 0) return "insufficient_evidence";
  const met = measurable.filter((c) => c.status === "met").length;
  const notMet = measurable.filter((c) => c.status === "not_met").length;
  if (notMet === 0 && met === measurable.length) return "criteria_met";
  if (met > 0 && notMet > 0) return "criteria_partially_met";
  if (notMet > 0 && met === 0) return "criteria_not_met";
  return "insufficient_evidence";
}
