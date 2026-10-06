// FILE: lib/identity/providerIngestion/contract.ts
// Normalized inbound external verification provider event contract.

import type { AssuranceLevel } from "@/lib/credentials/claimSchema";

export const PROVIDER_EVENT_SCHEMA_VERSION = "1.0.0" as const;

export type ProviderEventType =
  | "verification_completed"
  | "verification_revoked";

export interface ProviderAuthorizedAssertion {
  claim_type: string;
  claim_value: Record<string, unknown>;
  assurance_level?: AssuranceLevel;
  jurisdiction?: string | null;
  expires_at?: string | null;
}

/** Minimal normalized provider event — no arbitrary claim names outside provider config. */
export interface NormalizedProviderEvent {
  schema_version: typeof PROVIDER_EVENT_SCHEMA_VERSION;
  provider_id: string;
  provider_event_id: string;
  provider_subject_ref: string;
  event_type: ProviderEventType;
  issued_at: string;
  expires_at?: string | null;
  method?: string;
  authorized_assertions: ProviderAuthorizedAssertion[];
  evidence_reference?: string | null;
}

export type ProviderProcessingOutcome =
  | "accepted"
  | "duplicate"
  | "rejected"
  | "revoked";

export interface ProviderProcessingResult {
  ok: boolean;
  outcome: ProviderProcessingOutcome;
  code: string;
  abraxas_subject_id?: string;
  claims_subject_key?: string;
  normalized_claim_types?: string[];
  detail?: string;
}

/** Raw provider fields that must never persist or propagate. */
export const PROVIDER_RAW_PII_FIELDS = [
  "legal_name",
  "date_of_birth",
  "home_address",
  "passport_number",
  "document_image_url",
  "selfie_url",
  "provider_case_notes",
  "provider_subject_ref",
  "address_line",
  "provider_internal_case_id",
  "risk_notes",
  "provider_payload",
] as const;
