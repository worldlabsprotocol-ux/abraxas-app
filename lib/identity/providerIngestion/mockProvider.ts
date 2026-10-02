// FILE: lib/identity/providerIngestion/mockProvider.ts
// Reference mock provider for tests and sandbox — NOT a vendor integration.

import { createHmac } from "crypto";
import type { AssuranceLevel } from "@/lib/credentials/claimSchema";
import type { NormalizedProviderEvent, ProviderAuthorizedAssertion } from "./contract";

export const MOCK_APPROVED_KYC_PROVIDER_ID = "issuer:mock-approved-kyc" as const;

export const MOCK_PROVIDER_DANGEROUS_FIXTURE = {
  legal_name: "Mock Subject",
  date_of_birth: "1985-06-15",
  home_address: "456 Hidden Lane",
  passport_number: "MOCK999",
  document_image_url: "https://mock.example/doc.jpg",
  selfie_url: "https://mock.example/selfie.jpg",
  provider_case_notes: "internal review notes",
} as const;

function resolveMockSecret(): string {
  return process.env.PROVIDER_INGEST_TEST_SECRET
    ?? process.env.MOCK_KYC_PROVIDER_INGEST_SECRET
    ?? "provider-ingest-test-secret-do-not-use-in-production";
}

export function signMockProviderEvent(rawBody: string, timestamp: string): string {
  const message = `${timestamp}.${rawBody}`;
  return createHmac("sha256", resolveMockSecret()).update(message, "utf8").digest("hex");
}

export function buildMockVerificationCompletedEvent(input: {
  providerSubjectRef: string;
  providerEventId?: string;
  assuranceLevel?: AssuranceLevel;
  extraAssertions?: ProviderAuthorizedAssertion[];
}): NormalizedProviderEvent {
  const now = new Date().toISOString();
  return {
    schema_version: "1.0.0",
    provider_id: MOCK_APPROVED_KYC_PROVIDER_ID,
    provider_event_id: input.providerEventId ?? `evt_mock_${Date.now()}`,
    provider_subject_ref: input.providerSubjectRef,
    event_type: "verification_completed",
    issued_at: now,
    expires_at: new Date(Date.now() + 365 * 86400_000).toISOString(),
    method: "document_verification",
    authorized_assertions: [
      {
        claim_type: "identity_verified",
        claim_value: { outcome: "verified" },
        assurance_level: input.assuranceLevel ?? "L2",
        jurisdiction: "US",
      },
      ...(input.extraAssertions ?? []),
    ],
    evidence_reference: `ev_mock_${input.providerEventId ?? "default"}`,
  };
}

export function buildMockRevocationEvent(input: {
  providerSubjectRef: string;
  providerEventId?: string;
}): NormalizedProviderEvent {
  return {
    schema_version: "1.0.0",
    provider_id: MOCK_APPROVED_KYC_PROVIDER_ID,
    provider_event_id: input.providerEventId ?? `evt_revoke_${Date.now()}`,
    provider_subject_ref: input.providerSubjectRef,
    event_type: "verification_revoked",
    issued_at: new Date().toISOString(),
    authorized_assertions: [],
    evidence_reference: null,
  };
}
