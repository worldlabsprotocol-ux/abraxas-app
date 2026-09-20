// FILE: lib/partner/launchpad/partnerFlowRequest/capabilities.ts
// Enabled capabilities come from the sandbox app, never from request-config POST.

import {
  PARTNER_FLOW_CAPABILITY_REJECTED,
  isPartnerFlowCapability,
  type PartnerFlowCapability,
} from "./contract";

export function enabledPartnerFlowCapabilities(input: {
  webhookConfigured?: boolean;
  starterKitCapabilities?: readonly string[];
}): PartnerFlowCapability[] {
  const enabled = new Set<PartnerFlowCapability>();
  if (input.webhookConfigured) enabled.add("webhooks");
  for (const item of input.starterKitCapabilities ?? []) {
    if (isPartnerFlowCapability(item)) enabled.add(item);
  }
  return Array.from(enabled);
}

export function selectedEnabledCapabilities(
  requested: readonly string[],
  enabled: readonly PartnerFlowCapability[],
): PartnerFlowCapability[] {
  const allowed = new Set(enabled);
  return requested.filter((item): item is PartnerFlowCapability =>
    isPartnerFlowCapability(item) && allowed.has(item),
  );
}

export function unauthorizedCapabilities(
  requested: readonly string[],
  enabled: readonly PartnerFlowCapability[],
): string[] {
  const allowed = new Set(enabled);
  return requested.filter((item) => !allowed.has(item as PartnerFlowCapability));
}

export function capabilityAuthorityError(
  requested: readonly string[],
  enabled: readonly PartnerFlowCapability[],
): typeof PARTNER_FLOW_CAPABILITY_REJECTED | null {
  return unauthorizedCapabilities(requested, enabled).length
    ? PARTNER_FLOW_CAPABILITY_REJECTED
    : null;
}
