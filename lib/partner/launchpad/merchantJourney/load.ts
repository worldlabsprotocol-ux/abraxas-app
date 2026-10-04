// FILE: lib/partner/launchpad/merchantJourney/load.ts
// Server-side merchant journey evidence for Launchpad.

import { buildApplicationPoliciesSummary } from "@/lib/partner/launchpad/applicationPolicyBindings";
import {
  buildLaunchpadJourneyInput,
  launchpadApplicationToJourneyApplication,
  type MerchantJourneyActivityEvidence,
  type MerchantJourneyIntegrationEvidence,
} from "@/lib/partner/launchpad/journeyInput";
import {
  resolveLaunchpadJourneyState,
  type LaunchpadJourneyInput,
  type LaunchpadJourneyResolution,
} from "@/lib/partner/launchpad/journeyState";
import { loadIntegrationEvents } from "@/lib/partner/pilotEvidence/load";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

function activityEvidenceFromRows(
  rows: Array<{ public_code: string | null; metadata?: Record<string, unknown> }>,
): MerchantJourneyActivityEvidence {
  let starter_kit_generated = false;
  let starter_kit_downloaded = false;
  let starter_kit_runtime: string | null = null;

  for (const row of rows) {
    const code = row.public_code ?? "";
    const meta = row.metadata ?? {};
    if (code === "starter_kit_generated" || meta.starter_kit === true) {
      starter_kit_generated = true;
      if (typeof meta.runtime === "string") starter_kit_runtime = meta.runtime;
    }
    if (code === "starter_kit_downloaded") {
      starter_kit_downloaded = true;
      if (typeof meta.runtime === "string") starter_kit_runtime = meta.runtime;
    }
  }

  return { starter_kit_generated, starter_kit_downloaded, starter_kit_runtime };
}

function integrationEvidenceFromEvents(
  events: Array<{ event_type: string }>,
): MerchantJourneyIntegrationEvidence {
  const receipt_verification_succeeded_count = events.filter(
    (event) => event.event_type === "receipt_verification_succeeded",
  ).length;
  const hosted_handoff_completed_count = events.filter(
    (event) => event.event_type === "hosted_handoff_completed",
  ).length;

  return {
    verified_receipt_count: receipt_verification_succeeded_count,
    receipt_verification_succeeded_count,
    hosted_handoff_completed_count,
  };
}

export interface MerchantJourneyLoadResult {
  input: LaunchpadJourneyInput;
  journey: LaunchpadJourneyResolution;
  summary: Awaited<ReturnType<typeof buildApplicationPoliciesSummary>>;
  integration: MerchantJourneyIntegrationEvidence;
}

export async function loadMerchantJourneyForApplication(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
  activeSandboxKey: boolean;
  productionActivated?: boolean;
  productionRequestPending?: boolean;
  productionRequestApproved?: boolean;
}): Promise<MerchantJourneyLoadResult> {
  const summary = await buildApplicationPoliciesSummary(input.application);
  const events = await loadIntegrationEvents({
    partnerId: input.partnerId,
    applicationId: input.application.id,
    environment: input.application.environment === "production" ? "production" : "sandbox",
  });

  let activityRows: Array<{ public_code: string | null; metadata?: Record<string, unknown> }> = [];
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from("partner_launchpad_activity")
      .select("public_code, metadata")
      .eq("application_id", input.application.id)
      .eq("partner_id", input.partnerId)
      .order("created_at", { ascending: false })
      .limit(80);
    activityRows = (data ?? []) as typeof activityRows;
  } catch {
    activityRows = [];
  }

  const integration = integrationEvidenceFromEvents(events);
  const journeyInput = buildLaunchpadJourneyInput({
    application: launchpadApplicationToJourneyApplication({
      ...input.application,
      integration_status: input.application.status === "pending" ? "pending" : "ready",
    }),
    summary,
    activity: activityEvidenceFromRows(activityRows),
    integration,
    activeSandboxKey: input.activeSandboxKey,
    productionActivated: input.productionActivated,
    productionRequestPending: input.productionRequestPending,
    productionRequestApproved: input.productionRequestApproved,
  });

  return {
    input: journeyInput,
    journey: resolveLaunchpadJourneyState(journeyInput),
    summary,
    integration,
  };
}
