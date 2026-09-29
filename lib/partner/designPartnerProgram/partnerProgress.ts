// FILE: lib/partner/designPartnerProgram/partnerProgress.ts
// Partner-scoped pilot progress — no internal GTM or fundraising data.

import type { DesignPartnerApplicationView } from "./build";

export interface PartnerPilotProgress {
  enrolled: boolean;
  program_status: string | null;
  effective_status: string | null;
  success_criteria: Array<{
    criterion_type: string;
    status: string;
    measured_value: unknown;
    quality: string;
  }>;
  integration_status: string;
  measured_results: {
    successful_verifications: number;
    verification_success_rate: number | null;
    evidence_reuse_count: number;
  };
  next_action: string | null;
  notice: string;
}

export function buildPartnerPilotProgress(view: DesignPartnerApplicationView): PartnerPilotProgress {
  const sandbox = view.value_evidence.pilot_sandbox;
  return {
    enrolled: view.program != null,
    program_status: view.program?.program_status ?? null,
    effective_status: view.scorecard?.effective_program_status ?? null,
    success_criteria: (view.scorecard?.criteria ?? []).map((c) => ({
      criterion_type: c.criterion_type,
      status: c.status,
      measured_value: c.measured_value,
      quality: c.quality,
    })),
    integration_status: sandbox.integration_status,
    measured_results: {
      successful_verifications: sandbox.metrics.successful_receipt_verifications.value,
      verification_success_rate: sandbox.metrics.verification_success_rate.value,
      evidence_reuse_count: sandbox.metrics.evidence_reuse_count.value,
    },
    next_action: view.partner_next_action,
    notice: "Pilot progress reflects your application only. No cross-partner or commercial pipeline data is shown.",
  };
}
