// FILE: lib/partner/launchpad/partnerFlowRequest/view.ts
// Safe partner-facing configuration + holder preview. No callback URLs or keys.

import { createHash } from "crypto";
import { SITE_URL } from "@/lib/siteUrl";
import { buildHolderRequestBrief, type HolderRequestBrief } from "@/lib/partner/holderExperience";
import { studioPayloadLeaks } from "@/lib/partner/integrationStudio/safety";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { selectedEnabledCapabilities } from "./capabilities";
import {
  PARTNER_FLOW_ACTION_LABELS,
  PARTNER_FLOW_GOOGLE,
  PARTNER_FLOW_NEXT_STEPS,
  PARTNER_FLOW_REQUEST_VERSION,
  PARTNER_FLOW_REVIEW_NOTICE,
  type PartnerFlowAction,
  type PartnerFlowCapability,
} from "./contract";

export interface PartnerFlowStoredConfig {
  purpose: string | null;
  action: PartnerFlowAction | null;
  callback_url: string | null;
  capabilities: PartnerFlowCapability[];
  display_label: string | null;
}

export interface PartnerFlowRequestView {
  version: typeof PARTNER_FLOW_REQUEST_VERSION;
  application_id: string;
  public_slug: string;
  display_label: string;
  policy_template_id: string;
  policy_version: number;
  environment: "sandbox" | "production";
  purpose: string | null;
  action: PartnerFlowAction | null;
  action_label: string | null;
  callback_options: Array<{ index: number; label: string }>;
  selected_callback_index: number | null;
  capabilities: PartnerFlowCapability[];
  enabled_capabilities: PartnerFlowCapability[];
  preview: HolderRequestBrief | null;
  sandbox_start_link: string | null;
  next_steps: Array<{ id: string; label: string; href: string }>;
  google_is_account_only: string;
  review_notice: string;
  issues_production_key: false;
  activates_production: false;
  starts_oauth: false;
}

export function callbackOptionLabel(index: number): string {
  return `Approved callback ${index + 1}`;
}

export function sandboxStartLink(publicSlug: string): string {
  return `${SITE_URL}/partner/verify?app=${encodeURIComponent(publicSlug)}`;
}

export function opaqueCallbackRef(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 12);
}

export function buildPartnerFlowRequestView(input: {
  application: LaunchpadApplicationRow;
  stored: PartnerFlowStoredConfig;
  starterKitEvidenced: boolean;
  enabledCapabilities?: readonly PartnerFlowCapability[];
}): PartnerFlowRequestView {
  const app = input.application;
  const callbacks = app.allowed_return_urls ?? [];
  const selectedIndex = input.stored.callback_url
    ? callbacks.findIndex((url) => url === input.stored.callback_url)
    : callbacks.length ? 0 : -1;
  const selectedUrl = selectedIndex >= 0 ? callbacks[selectedIndex] : null;
  const displayLabel = input.stored.display_label?.trim() || app.display_name;
  const purpose = input.stored.purpose;
  const next: Array<{ id: string; label: string; href: string }> = [];
  if (!app.policy_template_id) next.push(PARTNER_FLOW_NEXT_STEPS.choose_policy);
  if (!callbacks.length) next.push(PARTNER_FLOW_NEXT_STEPS.add_callback);
  if (!app.id) next.push(PARTNER_FLOW_NEXT_STEPS.configure_app);
  if (!input.starterKitEvidenced) next.push(PARTNER_FLOW_NEXT_STEPS.starter_kit);

  const enabled = input.enabledCapabilities ? input.enabledCapabilities.slice() : [];
  const preview = purpose && app.policy_id
    ? buildHolderRequestBrief({
      partnerId: app.partner_id,
      partnerName: displayLabel,
      policyId: app.policy_id,
      purpose: input.stored.action ?? purpose,
      environment: app.environment,
      userExplanation: purpose,
    })
    : null;

  return {
    version: PARTNER_FLOW_REQUEST_VERSION,
    application_id: app.id,
    public_slug: app.public_slug,
    display_label: displayLabel,
    policy_template_id: app.policy_template_id,
    policy_version: app.policy_version,
    environment: app.environment,
    purpose,
    action: input.stored.action,
    action_label: input.stored.action ? PARTNER_FLOW_ACTION_LABELS[input.stored.action] : null,
    callback_options: callbacks.map((_, index) => ({ index, label: callbackOptionLabel(index) })),
    selected_callback_index: selectedIndex >= 0 ? selectedIndex : null,
    capabilities: selectedEnabledCapabilities(input.stored.capabilities, enabled),
    enabled_capabilities: enabled,
    preview,
    sandbox_start_link: selectedUrl ? sandboxStartLink(app.public_slug) : null,
    next_steps: next,
    google_is_account_only: PARTNER_FLOW_GOOGLE,
    review_notice: PARTNER_FLOW_REVIEW_NOTICE,
    issues_production_key: false,
    activates_production: false,
    starts_oauth: false,
  };
}

export function partnerFlowViewLeaks(view: PartnerFlowRequestView): string[] {
  return studioPayloadLeaks(view);
}
