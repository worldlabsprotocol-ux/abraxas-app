// FILE: lib/partner/launchpad/partnerFlowRequest/capabilities.ts
// Enabled capabilities come from the sandbox app, never from request-config POST.

import {
  PARTNER_FLOW_CAPABILITIES,
  PARTNER_FLOW_CAPABILITY_REJECTED,
  isPartnerFlowCapability,
  type PartnerFlowCapability,
} from "./contract";

export function enabledPartnerFlowCapabilities(input: {
  webhookConfigured?: boolean;
  starterKitCapabilities?: readonly string[];
}): PartnerFlowCapability[] {
  const seen = new Set<PartnerFlowCapability>();
  if (input.webhookConfigured) seen.add("webhooks");
  const kit = input.starterKitCapabilities ?? [];
  kit.forEach((item) => {
    if (isPartnerFlowCapability(item)) seen.add(item);
  });
  const enabled: PartnerFlowCapability[] = [];
  seen.forEach((id) => {
    enabled.push(id);
  });
  enabled.sort((a, b) => PARTNER_FLOW_CAPABILITIES.indexOf(a) - PARTNER_FLOW_CAPABILITIES.indexOf(b));
  return enabled;
}

export function selectedEnabledCapabilities(
  requested: readonly string[],
  enabled: readonly PartnerFlowCapability[],
): PartnerFlowCapability[] {
  const allowed = new Set(enabled);
  const selected: PartnerFlowCapability[] = [];
  requested.forEach((item) => {
    if (isPartnerFlowCapability(item) && allowed.has(item) && selected.indexOf(item) < 0) {
      selected.push(item);
    }
  });
  return selected;
}

export function unauthorizedCapabilities(
  requested: readonly string[],
  enabled: readonly PartnerFlowCapability[],
): string[] {
  const allowed = new Set(enabled);
  const unauthorized: string[] = [];
  requested.forEach((item) => {
    if (!allowed.has(item as PartnerFlowCapability)) unauthorized.push(item);
  });
  return unauthorized;
}

export function capabilityAuthorityError(
  requested: readonly string[],
  enabled: readonly PartnerFlowCapability[],
): typeof PARTNER_FLOW_CAPABILITY_REJECTED | null {
  return unauthorizedCapabilities(requested, enabled).length
    ? PARTNER_FLOW_CAPABILITY_REJECTED
    : null;
}
