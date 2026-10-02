// FILE: lib/gtm/acquisitionEvents.ts
// Privacy-safe GTM acquisition events — sanitized attributes only.

import type {
  GtmAcquisitionEventAttributes,
  GtmAcquisitionEventType,
} from "./contract";
import { GTM_ACQUISITION_EVENT_TYPES } from "./contract";
import type { GtmDiscoveryAnswers } from "./contract";

const PROHIBITED_ATTRIBUTE_KEYS = new Set([
  "email",
  "name",
  "legal_name",
  "date_of_birth",
  "dob",
  "provider_subject",
  "verification_subject",
  "freeform",
  "other_text",
  "ip_address",
  "callback_url",
  "return_url",
]);

const ALLOWED_ATTRIBUTE_KEYS = new Set([
  "industry_category",
  "app_count_band",
  "has_kyc_vendor",
  "primary_pain",
  "proof_pack",
  "recommended_path",
  "environment",
  "partner_id",
  "application_id",
]);

export interface GtmAcquisitionEventInput {
  event_type: GtmAcquisitionEventType;
  attributes?: GtmAcquisitionEventAttributes & Record<string, unknown>;
}

export interface SanitizedGtmAcquisitionEvent {
  event_type: GtmAcquisitionEventType;
  attributes: Record<string, string>;
  recorded_at: string;
}

export function isGtmAcquisitionEventType(value: string): value is GtmAcquisitionEventType {
  return (GTM_ACQUISITION_EVENT_TYPES as readonly string[]).includes(value);
}

export function discoveryToEventAttributes(answers: GtmDiscoveryAnswers): GtmAcquisitionEventAttributes {
  return {
    industry_category: answers.industry,
    app_count_band: answers.app_count_band,
    has_kyc_vendor: answers.has_kyc_vendor,
    primary_pain: answers.primary_pain,
  };
}

export function sanitizeAcquisitionEventAttributes(
  attributes: Record<string, unknown> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!attributes) return out;
  for (const [key, value] of Object.entries(attributes)) {
    if (PROHIBITED_ATTRIBUTE_KEYS.has(key)) continue;
    if (!ALLOWED_ATTRIBUTE_KEYS.has(key)) continue;
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = String(value);
    }
  }
  return out;
}

export function buildSanitizedAcquisitionEvent(
  input: GtmAcquisitionEventInput,
): SanitizedGtmAcquisitionEvent {
  if (!isGtmAcquisitionEventType(input.event_type)) {
    throw new Error("invalid_gtm_event_type");
  }
  return {
    event_type: input.event_type,
    attributes: sanitizeAcquisitionEventAttributes(input.attributes),
    recorded_at: new Date().toISOString(),
  };
}
