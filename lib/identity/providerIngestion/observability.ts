// FILE: lib/identity/providerIngestion/observability.ts
// Privacy-safe provider ingestion metrics — no PII, no raw provider subject refs.

import { createHash } from "crypto";
import { appendAuditEvent } from "@/lib/verification/audit";

export type ProviderMetricKind =
  | "provider_event_received"
  | "provider_event_authenticated"
  | "provider_event_rejected"
  | "provider_event_duplicate"
  | "provider_claims_normalized"
  | "provider_claim_revoked"
  | "provider_binding_created"
  | "provider_binding_conflict";

export function safeProviderRef(providerId: string, providerEventId: string): string {
  return createHash("sha256")
    .update(`${providerId}:${providerEventId}`, "utf8")
    .digest("hex")
    .slice(0, 16);
}

export async function recordProviderMetric(input: {
  kind: ProviderMetricKind;
  providerId: string;
  providerEventId?: string;
  code?: string;
  abraxasSubjectId?: string;
}): Promise<void> {
  const subjectRef = input.abraxasSubjectId
    ? createHash("sha256").update(input.abraxasSubjectId, "utf8").digest("hex").slice(0, 16)
    : undefined;

  await appendAuditEvent({
    actor_type: "system",
    actor_id: "provider_ingestion",
    action: input.kind,
    object_type: "provider_event",
    object_id: input.providerEventId
      ? safeProviderRef(input.providerId, input.providerEventId)
      : input.providerId,
    metadata: {
      provider_id: input.providerId,
      code: input.code,
      subject_ref_hash: subjectRef,
    },
  });
}
