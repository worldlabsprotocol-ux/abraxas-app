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
    callback_url: typeof meta.callback_url === "string" ? meta.callback_url : null,
    capabilities,
    display_label: typeof meta.display_label === "string" ? meta.display_label : null,
  };
}

export function storedConfigFromActivityRows(
  rows: PartnerFlowActivityRow[],
  applicationId: string,
  partnerId: string,
): PartnerFlowStoredConfig {
  const matches = rows.filter((row) =>
    row.event_type === PARTNER_FLOW_REQUEST_EVENT_TYPE
    && row.application_id === applicationId
    && row.partner_id === partnerId,
  );
  if (!matches.length) return { ...EMPTY_PARTNER_FLOW_STORED_CONFIG };
  matches.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  return parsePartnerFlowStoredConfig(matches[0]?.metadata);
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
