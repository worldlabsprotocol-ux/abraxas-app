// FILE: lib/partner/launchpad/partnerFlowRequest/activity.ts
// Configuration authority is the latest partner_flow_request_configured event only.

import {
  PARTNER_FLOW_REQUEST_EVENT_TYPE,
  isPartnerFlowAction,
  isPartnerFlowCapability,
  type PartnerFlowAction,
  type PartnerFlowCapability,
} from "./contract";
import type { PartnerFlowStoredConfig } from "./view";
import { opaqueCallbackRef } from "./view";
import { isLaunchpadReturnUrlAllowlisted } from "@/lib/partner/launchpad/launchpadReturnUrlAllowlist";

export const EMPTY_PARTNER_FLOW_STORED_CONFIG: PartnerFlowStoredConfig = {
  purpose: null,
  action: null,
  callback_url: null,
  capabilities: [],
  display_label: null,
};

export interface PartnerFlowActivityRow {
  application_id?: string;
  partner_id?: string;
  event_type?: string;
  public_code?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

export function parsePartnerFlowStoredConfig(
  metadata: Record<string, unknown> | null | undefined,
): PartnerFlowStoredConfig {
  const meta = metadata ?? {};
  const action = typeof meta.action === "string" && isPartnerFlowAction(meta.action) ? meta.action : null;
  const capabilities = String(meta.capabilities ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is PartnerFlowCapability => isPartnerFlowCapability(item));
  return {
    purpose: typeof meta.purpose === "string" ? meta.purpose : null,
    action,
    callback_url: null,
    capabilities,
    display_label: typeof meta.display_label === "string" ? meta.display_label : null,
  };
}

export function hydratePartnerFlowCallbackUrl(
  metadata: Record<string, unknown> | null | undefined,
  allowedUrls: readonly string[],
): string | null {
  const meta = metadata ?? {};
  const index = typeof meta.callback_index === "number" ? meta.callback_index : Number(meta.callback_index);
  if (Number.isInteger(index) && index >= 0 && allowedUrls[index]) {
    const candidate = allowedUrls[index]!;
    if (isLaunchpadReturnUrlAllowlisted(allowedUrls, candidate)) return candidate;
  }
  const ref = typeof meta.callback_ref === "string" ? meta.callback_ref : "";
  if (ref) {
    const match = allowedUrls.find((url) => opaqueCallbackRef(url) === ref);
    if (match && isLaunchpadReturnUrlAllowlisted(allowedUrls, match)) return match;
  }
  return null;
}

export function storedConfigFromActivityRows(
  rows: PartnerFlowActivityRow[],
  applicationId: string,
  partnerId: string,
  allowedUrls: readonly string[] = [],
): PartnerFlowStoredConfig {
  const matches = rows.filter((row) =>
    row.event_type === PARTNER_FLOW_REQUEST_EVENT_TYPE
    && row.application_id === applicationId
    && row.partner_id === partnerId,
  );
  if (!matches.length) return { ...EMPTY_PARTNER_FLOW_STORED_CONFIG };
  matches.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  const latest = matches[0];
  const parsed = parsePartnerFlowStoredConfig(latest?.metadata);
  return {
    ...parsed,
    callback_url: hydratePartnerFlowCallbackUrl(latest?.metadata, allowedUrls),
  };
}

export function starterKitCapabilitiesFromActivity(
  rows: PartnerFlowActivityRow[],
): string[] {
  const kit = rows.find((row) => {
    const code = String(row.public_code ?? "");
    const meta = row.metadata ?? {};
    return code === "starter_kit_generated" || meta.starter_kit === true;
  });
  if (!kit) return [];
  const raw = kit.metadata?.capabilities;
  if (Array.isArray(raw)) return raw.map((item) => String(item));
  if (typeof raw === "string") return raw.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}
