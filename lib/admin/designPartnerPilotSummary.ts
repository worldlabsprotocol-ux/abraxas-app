// FILE: lib/admin/designPartnerPilotSummary.ts
// Read-only design-partner pilot execution summary — bounded telemetry only.

import { assessPartnerPilotReadiness, type PartnerPolicySummary } from "@/lib/admin/partnerOnboardingConsole";
import {
  readSandboxPilotSignoff,
  splitPriorChecklist,
  type PartnerSandboxPilotSignoff,
} from "@/lib/admin/partnerSandboxSignoff";

export const MAX_PILOT_SUMMARIES = 50;

export const FORBIDDEN_PILOT_SUMMARY_QUERY_TABLES = [
  "partner_api_usage",
  "verification_requests",
  "decision_receipts",
  "partner_webhook_outbox",
  "partner_webhook_sandbox_test_receipts",
] as const;

export type PilotSummaryPhase =
  | "sandbox_provisioning"
  | "sandbox_testing"
  | "awaiting_manual_signoff"
  | "sandbox_continuation_approved";

export type TelemetryBool =
  | { availability: "available"; value: boolean }
  | { availability: "unavailable" };

export type PilotSummaryBlockerCode =
  | "PARTNER_ROW_MISSING"
  | "PROVISIONING_PARTNER_ROW"
  | "PROVISIONING_ACTIVE_POLICY"
  | "PROVISIONING_CALLBACK_ALLOWLIST"
  | "PROVISIONING_CONFORMANCE_CONFIG"
  | "PROVISIONING_POLICY_BINDING"
  | "MANUAL_SIGNOFF_INCOMPLETE"
  | "SIGNOFF_STATE_INCONSISTENT";

export interface DesignPartnerPilotSummaryDto {
  application_id: string;
  promoted_partner_id: string;
  display_name: string;
  phase: PilotSummaryPhase;
  technical: {
    provisioning_ready: boolean;
    production_environment_active: boolean;
    webhook_configured: TelemetryBool;
  };
  signoff_progress: {
    main_gates_acknowledged: number;
    main_gates_total: 4;
    webhook_track_acknowledged: number | null;
    webhook_track_total: 3 | null;
  };
  blocker_codes: PilotSummaryBlockerCode[];
  links: {
    onboarding: string;
    signoff: string;
    observability: string;
    production_activation: string;
  };
}

export interface PilotSummaryResponse {
  summaries: DesignPartnerPilotSummaryDto[];
  meta: {
    returned: number;
    capped: boolean;
    max_summaries: number;
  };
}

export const PILOT_SUMMARY_BLOCKER_COPY: Record<PilotSummaryBlockerCode, string> = {
  PARTNER_ROW_MISSING: "Partner record not found for this application.",
  PROVISIONING_PARTNER_ROW: "Partner row is not configured for external pilot use.",
  PROVISIONING_ACTIVE_POLICY: "No active sandbox policy is published.",
  PROVISIONING_CALLBACK_ALLOWLIST: "Callback allowlist is missing or invalid.",
  PROVISIONING_CONFORMANCE_CONFIG: "Conformance configuration is incomplete.",
  PROVISIONING_POLICY_BINDING: "Assigned policy does not match the active policy.",
  MANUAL_SIGNOFF_INCOMPLETE: "Sandbox pilot sign-off is incomplete.",
  SIGNOFF_STATE_INCONSISTENT: "Sandbox sign-off state needs operator review.",
};

export function buildPilotSummaryLinks(partnerId: string): DesignPartnerPilotSummaryDto["links"] {
  const encoded = encodeURIComponent(partnerId);
  return {
    onboarding: `/admin/partners?tab=onboarding&partner_id=${encoded}`,
    signoff: `/admin/design-partners#pilot-signoff-${encoded}`,
    observability: "/admin/partners?tab=observability",
    production_activation: "/admin/partner-flow/readiness",
  };
}

export function productionEnvironmentActive(allowedEnvironments: string[] | null | undefined): boolean {
  return (allowedEnvironments ?? []).includes("production");
}

export function countMainGatesAcknowledged(signoff: PartnerSandboxPilotSignoff): number {
  const { gates } = signoff;
  return [
    gates.configured,
    gates.partner_flow_tested,
    gates.partner_verified,
    gates.approved_for_pilot_continuation,
  ].filter((gate) => gate.operator_ack).length;
}

export function countWebhookTrackGatesAcknowledged(signoff: PartnerSandboxPilotSignoff): {
  acknowledged: number | null;
  total: 3 | null;
} {
  const track = signoff.gates.webhook_track;
  if (!track) {
    return { acknowledged: null, total: null };
  }
  const acknowledged = [track.queued, track.http_delivered, track.signature_verified_by_receiver].filter(
    (gate) => gate.operator_ack,
  ).length;
  return { acknowledged, total: 3 };
}

export function isContinuationPrerequisitesMet(
  signoff: PartnerSandboxPilotSignoff,
  provisioningReady: boolean,
): boolean {
  if (!provisioningReady) return false;
  const { gates } = signoff;
  return (
    gates.configured.operator_ack
    && gates.partner_flow_tested.operator_ack
    && gates.partner_verified.operator_ack
    && gates.partner_verified.manual_partner_confirmation === true
    && gates.approved_for_pilot_continuation.operator_ack
  );
}

export function hasInconsistentContinuationSignoff(
  signoff: PartnerSandboxPilotSignoff,
  provisioningReady: boolean,
): boolean {
  if (!signoff.gates.approved_for_pilot_continuation.operator_ack) return false;
  return !isContinuationPrerequisitesMet(signoff, provisioningReady);
}

export function derivePilotPhase(input: {
  provisioningReady: boolean;
  signoff: PartnerSandboxPilotSignoff;
}): PilotSummaryPhase {
  if (isContinuationPrerequisitesMet(input.signoff, input.provisioningReady)) {
    return "sandbox_continuation_approved";
  }
  if (!input.provisioningReady) {
    return "sandbox_provisioning";
  }
  if (countMainGatesAcknowledged(input.signoff) === 0) {
    return "sandbox_testing";
  }
  return "awaiting_manual_signoff";
}

export function mapProvisioningBlockerCodes(input: {
  partnerMissing: boolean;
  partnerRow: {
    partner_id: string;
    is_external: boolean;
    allowed_return_urls: string[] | null | undefined;
    assigned_policy_id: string | null;
  } | null;
  activePolicy: PartnerPolicySummary | null;
}): PilotSummaryBlockerCode[] {
  if (input.partnerMissing || !input.partnerRow) {
    return ["PARTNER_ROW_MISSING"];
  }

  const readiness = assessPartnerPilotReadiness({
    partner_id: input.partnerRow.partner_id,
    status: "pilot",
    is_external: input.partnerRow.is_external,
    allowed_return_urls: input.partnerRow.allowed_return_urls,
    active_policy: input.activePolicy,
    assigned_policy_id: input.partnerRow.assigned_policy_id,
  });

  const codes: PilotSummaryBlockerCode[] = [];
  if (readiness.partner_row === "fail") codes.push("PROVISIONING_PARTNER_ROW");
  if (readiness.active_policy === "fail") codes.push("PROVISIONING_ACTIVE_POLICY");
  if (readiness.callback_allowlist === "fail") codes.push("PROVISIONING_CALLBACK_ALLOWLIST");
  if (readiness.conformance_config === "fail") codes.push("PROVISIONING_CONFORMANCE_CONFIG");
  if (
    input.partnerRow.assigned_policy_id
    && input.activePolicy
    && input.partnerRow.assigned_policy_id !== input.activePolicy.id
  ) {
    codes.push("PROVISIONING_POLICY_BINDING");
  }
  return codes;
}

export function derivePilotBlockerCodes(input: {
  provisioningReady: boolean;
  signoff: PartnerSandboxPilotSignoff;
  provisioningBlockers: PilotSummaryBlockerCode[];
}): PilotSummaryBlockerCode[] {
  const codes = [...input.provisioningBlockers];
  if (hasInconsistentContinuationSignoff(input.signoff, input.provisioningReady)) {
    codes.push("SIGNOFF_STATE_INCONSISTENT");
  }
  if (
    !isContinuationPrerequisitesMet(input.signoff, input.provisioningReady)
    && countMainGatesAcknowledged(input.signoff) < 4
  ) {
    codes.push("MANUAL_SIGNOFF_INCOMPLETE");
  }
  return Array.from(new Set(codes));
}

export function resolveWebhookConfigured(
  partnerId: string,
  configuredPartnerIds: Set<string> | null,
): TelemetryBool {
  if (configuredPartnerIds === null) {
    return { availability: "unavailable" };
  }
  return { availability: "available", value: configuredPartnerIds.has(partnerId) };
}

export function buildDesignPartnerPilotSummary(input: {
  applicationId: string;
  displayName: string;
  promotedPartnerId: string;
  partnerRow: {
    partner_id: string;
    is_external: boolean;
    allowed_environments: string[];
    allowed_return_urls: string[] | null;
    assigned_policy_id: string | null;
    onboarding_checklist: unknown;
  } | null;
  activePolicy: PartnerPolicySummary | null;
  webhookConfiguredPartnerIds: Set<string> | null;
}): DesignPartnerPilotSummaryDto {
  const partnerMissing = input.partnerRow === null;
  const provisioningBlockers = mapProvisioningBlockerCodes({
    partnerMissing,
    partnerRow: input.partnerRow,
    activePolicy: input.activePolicy,
  });

  const readiness = input.partnerRow
    ? assessPartnerPilotReadiness({
        partner_id: input.partnerRow.partner_id,
        status: "pilot",
        is_external: input.partnerRow.is_external,
        allowed_return_urls: input.partnerRow.allowed_return_urls,
        active_policy: input.activePolicy,
        assigned_policy_id: input.partnerRow.assigned_policy_id,
      })
    : null;

  const provisioningReady = readiness?.overall === "ready";
  const priorChecklist = input.partnerRow
    ? splitPriorChecklist(input.partnerRow.onboarding_checklist).priorChecklist
    : {};
  const signoff = readSandboxPilotSignoff(priorChecklist, input.applicationId);
  const webhookProgress = countWebhookTrackGatesAcknowledged(signoff);

  return {
    application_id: input.applicationId,
    promoted_partner_id: input.promotedPartnerId,
    display_name: input.displayName,
    phase: derivePilotPhase({
      provisioningReady,
      signoff,
    }),
    technical: {
      provisioning_ready: provisioningReady,
      production_environment_active: productionEnvironmentActive(
        input.partnerRow?.allowed_environments,
      ),
      webhook_configured: resolveWebhookConfigured(
        input.promotedPartnerId,
        input.webhookConfiguredPartnerIds,
      ),
    },
    signoff_progress: {
      main_gates_acknowledged: countMainGatesAcknowledged(signoff),
      main_gates_total: 4,
      webhook_track_acknowledged: webhookProgress.acknowledged,
      webhook_track_total: webhookProgress.total,
    },
    blocker_codes: derivePilotBlockerCodes({
      provisioningReady,
      signoff,
      provisioningBlockers,
    }),
    links: buildPilotSummaryLinks(input.promotedPartnerId),
  };
}

export function applyPilotSummaryCap<T>(rows: T[]): { rows: T[]; capped: boolean } {
  const capped = rows.length > MAX_PILOT_SUMMARIES;
  return {
    rows: rows.slice(0, MAX_PILOT_SUMMARIES),
    capped,
  };
}

const ALLOWED_SUMMARY_KEYS = new Set([
  "application_id",
  "promoted_partner_id",
  "display_name",
  "phase",
  "technical",
  "signoff_progress",
  "blocker_codes",
  "links",
]);

const ALLOWED_TECHNICAL_KEYS = new Set([
  "provisioning_ready",
  "production_environment_active",
  "webhook_configured",
]);

export function assertPilotSummaryAllowlist(summary: DesignPartnerPilotSummaryDto): void {
  for (const key of Object.keys(summary)) {
    if (!ALLOWED_SUMMARY_KEYS.has(key)) {
      throw new Error(`forbidden_summary_field:${key}`);
    }
  }
  for (const key of Object.keys(summary.technical)) {
    if (!ALLOWED_TECHNICAL_KEYS.has(key)) {
      throw new Error(`forbidden_technical_field:${key}`);
    }
  }
}
