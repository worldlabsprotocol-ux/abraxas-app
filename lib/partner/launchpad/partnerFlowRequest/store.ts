// FILE: lib/partner/launchpad/partnerFlowRequest/store.ts
// Persist request copy in Launchpad activity. Callbacks stay on the application allowlist.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { isLaunchpadReturnUrlAllowlisted } from "@/lib/partner/launchpad/launchpadReturnUrlAllowlist";
import { getLaunchpadWebhookOverview } from "@/lib/partner/eventDelivery/launchpadWebhook";
import { hasProductionLaunchpadCallback } from "@/lib/partner/launchpad/productionCallbackReadiness";
import {
  PARTNER_FLOW_CAPABILITY_REJECTED,
  PARTNER_FLOW_REQUEST_ACTIVITY_CODE,
  PARTNER_FLOW_REQUEST_EVENT_TYPE,
  type PartnerFlowCapability,
} from "./contract";
import type { PartnerFlowRequestInput } from "./validate";
import { opaqueCallbackRef, type PartnerFlowStoredConfig } from "./view";
import {
  EMPTY_PARTNER_FLOW_STORED_CONFIG,
  starterKitCapabilitiesFromActivity,
  storedConfigFromActivityRows,
  type PartnerFlowActivityRow,
} from "./activity";
import { capabilityAuthorityError, enabledPartnerFlowCapabilities } from "./capabilities";

export async function loadPartnerFlowStoredConfig(
  applicationId: string,
  partnerId: string,
): Promise<PartnerFlowStoredConfig> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("partner_launchpad_activity")
    .select("application_id, partner_id, event_type, public_code, metadata, created_at")
    .eq("application_id", applicationId)
    .eq("partner_id", partnerId)
    .eq("event_type", PARTNER_FLOW_REQUEST_EVENT_TYPE)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error("unavailable");
  const rows = (data ?? []) as PartnerFlowActivityRow[];
  if (!rows.length) return { ...EMPTY_PARTNER_FLOW_STORED_CONFIG };
  return storedConfigFromActivityRows(rows, applicationId, partnerId);
}

export async function loadEnabledPartnerFlowCapabilities(
  application: LaunchpadApplicationRow,
  partnerId: string,
): Promise<PartnerFlowCapability[]> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partner_launchpad_activity")
    .select("event_type, public_code, metadata, created_at")
    .eq("application_id", application.id)
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(40);
  const webhook = await getLaunchpadWebhookOverview({
    partnerId,
    policyId: application.policy_id,
    policyVersion: application.policy_version,
    callbackConfigured: hasProductionLaunchpadCallback(application.allowed_return_urls),
  });
  return enabledPartnerFlowCapabilities({
    webhookConfigured: Boolean(webhook.webhook_configured || webhook.webhook_enabled),
    starterKitCapabilities: starterKitCapabilitiesFromActivity((data ?? []) as PartnerFlowActivityRow[]),
  });
}

export async function savePartnerFlowRequestConfig(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
  parsed: PartnerFlowRequestInput;
  enabledCapabilities: readonly PartnerFlowCapability[];
}): Promise<PartnerFlowStoredConfig> {
  const urls = input.application.allowed_return_urls ?? [];
  const callbackUrl = urls[input.parsed.callback_index];
  if (!callbackUrl || !isLaunchpadReturnUrlAllowlisted(urls, callbackUrl)) {
    throw Object.assign(new Error("callback_rejected"), { code: "callback_rejected" });
  }
  if (capabilityAuthorityError(input.parsed.capabilities, Array.from(input.enabledCapabilities))) {
    throw Object.assign(new Error(PARTNER_FLOW_CAPABILITY_REJECTED), { code: PARTNER_FLOW_CAPABILITY_REJECTED });
  }
  const displayLabel = input.parsed.display_label ?? input.application.display_name;
  const sb = requireSupabaseAdmin();
  if (input.parsed.display_label) {
    const { error } = await sb
      .from("partner_launchpad_applications")
      .update({ display_name: displayLabel, updated_at: new Date().toISOString() })
      .eq("id", input.application.id)
      .eq("partner_id", input.partnerId);
    if (error) throw new Error("unavailable");
  }
  await recordLaunchpadActivity(sb, {
    applicationId: input.application.id,
    partnerId: input.partnerId,
    eventType: PARTNER_FLOW_REQUEST_EVENT_TYPE,
    publicCode: PARTNER_FLOW_REQUEST_ACTIVITY_CODE,
    metadata: {
      purpose: input.parsed.purpose,
      action: input.parsed.action,
      callback_url: callbackUrl,
      callback_ref: opaqueCallbackRef(callbackUrl),
      capabilities: input.parsed.capabilities.join(","),
      display_label: displayLabel,
    },
  });
  return {
    purpose: input.parsed.purpose,
    action: input.parsed.action,
    callback_url: callbackUrl,
    capabilities: Array.from(input.parsed.capabilities),
    display_label: displayLabel,
  };
}

export async function loadStarterKitEvidenced(applicationId: string, partnerId: string): Promise<boolean> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partner_launchpad_activity")
    .select("public_code, metadata")
    .eq("application_id", applicationId)
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(40);
  return (data ?? []).some((row) => {
    const code = String((row as { public_code?: string }).public_code ?? "");
    const meta = (row as { metadata?: Record<string, unknown> }).metadata ?? {};
    return code === "starter_kit_generated" || meta.starter_kit === true;
  });
}

export async function resolveStoredPartnerFlowCallback(
  applicationId: string,
  partnerId: string,
  allowedUrls: string[],
): Promise<string | null> {
  const stored = await loadPartnerFlowStoredConfig(applicationId, partnerId);
  if (stored.callback_url && isLaunchpadReturnUrlAllowlisted(allowedUrls, stored.callback_url)) {
    return stored.callback_url;
  }
  const first = allowedUrls[0];
  return first && isLaunchpadReturnUrlAllowlisted(allowedUrls, first) ? first : null;
}
