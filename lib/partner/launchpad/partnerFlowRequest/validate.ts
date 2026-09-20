// FILE: lib/partner/launchpad/partnerFlowRequest/validate.ts
// Validate partner-owned copy. Policy, environment, and callbacks stay server-owned.

import {
  PARTNER_FLOW_ALLOWED_KEYS,
  PARTNER_FLOW_FORBIDDEN_KEYS,
  PARTNER_FLOW_PURPOSE_MAX,
  PARTNER_FLOW_PURPOSE_MIN,
  PARTNER_FLOW_PURPOSE_PATTERN,
  isPartnerFlowAction,
  isPartnerFlowCapability,
  type PartnerFlowAction,
  type PartnerFlowCapability,
} from "./contract";

export interface PartnerFlowRequestInput {
  purpose: string;
  action: PartnerFlowAction;
  callback_index: number;
  display_label: string | null;
  capabilities: PartnerFlowCapability[];
}

export type PartnerFlowParseResult =
  | { ok: true; input: PartnerFlowRequestInput }
  | { ok: false; error: string };

function hasControlChars(value: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(value);
}

export function parsePartnerFlowRequestBody(body: unknown): PartnerFlowParseResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "invalid_input" };
  }
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => (PARTNER_FLOW_FORBIDDEN_KEYS as readonly string[]).includes(key))) {
    return { ok: false, error: "unknown_input" };
  }
  if (keys.some((key) => !(PARTNER_FLOW_ALLOWED_KEYS as readonly string[]).includes(key))) {
    return { ok: false, error: "unknown_input" };
  }
  if (typeof record.purpose !== "string") return { ok: false, error: "invalid_purpose" };
  const purpose = record.purpose.trim();
  if (
    purpose.length < PARTNER_FLOW_PURPOSE_MIN
    || purpose.length > PARTNER_FLOW_PURPOSE_MAX
    || !PARTNER_FLOW_PURPOSE_PATTERN.test(purpose)
    || hasControlChars(purpose)
    || /https?:\/\/|@|0x|receipt/i.test(purpose)
  ) {
    return { ok: false, error: "invalid_purpose" };
  }
  if (typeof record.action !== "string" || !isPartnerFlowAction(record.action)) {
    return { ok: false, error: "invalid_action" };
  }
  if (typeof record.callback_index !== "number" || !Number.isInteger(record.callback_index) || record.callback_index < 0) {
    return { ok: false, error: "callback_rejected" };
  }
  let display_label: string | null = null;
  if (record.display_label != null) {
    if (typeof record.display_label !== "string") return { ok: false, error: "invalid_input" };
    const label = record.display_label.trim();
    if (label && (label.length > 80 || hasControlChars(label) || /https?:\/\/|@|0x/i.test(label))) {
      return { ok: false, error: "invalid_input" };
    }
    display_label = label || null;
  }
  const rawCaps = record.capabilities ?? [];
  if (!Array.isArray(rawCaps) || rawCaps.some((item) => typeof item !== "string" || !isPartnerFlowCapability(item))) {
    return { ok: false, error: "invalid_input" };
  }
  return {
    ok: true,
    input: {
      purpose,
      action: record.action,
      callback_index: record.callback_index,
      display_label,
      capabilities: Array.from(new Set(rawCaps as PartnerFlowCapability[])),
    },
  };
}
