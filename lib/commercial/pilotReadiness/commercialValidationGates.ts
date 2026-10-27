// FILE: lib/commercial/pilotReadiness/commercialValidationGates.ts
// Build 875 — evidence gates; never fabricate customer outcomes.

export type CommercialEvidenceStatus = "unvalidated" | "observed" | "committed" | "validated";

export type CommercialValidationGate = {
  id: string;
  label: string;
  requiredEvidence: string;
  status: CommercialEvidenceStatus;
  notes: string;
};

export type CommercialValidationMilestone = {
  id: string;
  label: string;
  successMetric: string;
  status: CommercialEvidenceStatus;
};

const UNVALIDATED = "unvalidated" as const;

export function commercialValidationGates(): CommercialValidationGate[] {
  return [
    {
      id: "problem_severity",
      label: "Customer problem severity",
      requiredEvidence: "Interview notes: cost of current verification workflow + failure modes",
      status: UNVALIDATED,
      notes: "No customer interviews recorded in repo.",
    },
    {
      id: "integration_feasibility",
      label: "Integration feasibility for target buyer",
      requiredEvidence: "Partner completes sandbox integration without Abraxas writing their app",
      status: UNVALIDATED,
      notes: "Build 873 automated Demo reference ≠ unaided external developer.",
    },
    {
      id: "buyer_authority",
      label: "Buyer authority",
      requiredEvidence: "Named economic buyer or delegated budget holder on interview",
      status: UNVALIDATED,
      notes: "",
    },
    {
      id: "budget_availability",
      label: "Budget availability",
      requiredEvidence: "Explicit budget range or pilot line item (not hypothetical)",
      status: UNVALIDATED,
      notes: "",
    },
    {
      id: "pilot_commitment",
      label: "Pilot commitment",
      requiredEvidence: "Signed pilot/evaluation agreement + start date",
      status: UNVALIDATED,
      notes: "Draft legal templates exist; no executed contract in repo.",
    },
    {
      id: "repeat_verification_usage",
      label: "Repeat verification usage",
      requiredEvidence: "Metering or partner report: >1 receipt per holder/policy in pilot window",
      status: UNVALIDATED,
      notes: "",
    },
    {
      id: "willingness_to_pay",
      label: "Willingness to pay",
      requiredEvidence: "Interview + optional pricing card reaction (non-leading)",
      status: UNVALIDATED,
      notes: "Separate from pricing hypotheses in code.",
    },
    {
      id: "unit_economics",
      label: "Unit economics",
      requiredEvidence: "Observed infra cost per approved receipt during pilot (operator calculation)",
      status: UNVALIDATED,
      notes: "",
    },
  ];
}

export function commercialValidationMilestones(): CommercialValidationMilestone[] {
  return [
    {
      id: "wtp_interviews_complete",
      label: "Complete 5 institutional WTP interviews",
      successMetric: "5 interview summaries stored (no PII in repo)",
      status: UNVALIDATED,
    },
    {
      id: "first_paid_pilot_signed",
      label: "First paid pilot signed",
      successMetric: "Executed agreement + Demo sandbox provisioned",
      status: UNVALIDATED,
    },
    {
      id: "pilot_acceptance_met",
      label: "Pilot acceptance criteria met",
      successMetric: "PILOT_ACCEPTANCE_CHECKLIST signed by partner",
      status: UNVALIDATED,
    },
    {
      id: "production_review_requested",
      label: "Production review requested",
      successMetric: "Launchpad production gate submission (not auto-approved)",
      status: UNVALIDATED,
    },
  ];
}

export function summarizeCommercialValidation(
  gates: CommercialValidationGate[] = commercialValidationGates(),
): {
  commercial_validation_claimed: false;
  gates_validated: number;
  gates_total: number;
} {
  const validated = gates.filter((g) => g.status === "validated").length;
  return {
    commercial_validation_claimed: false,
    gates_validated: validated,
    gates_total: gates.length,
  };
}
