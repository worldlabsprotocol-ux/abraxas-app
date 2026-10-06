// FILE: lib/identity/providerIngestion/adapter.ts
// ExternalVerificationProviderAdapter — provider-neutral inbound processing.

import { upsertClaims, getActiveClaims, updateClaimStatus } from "@/lib/credentials/claimsService";
import { claimsSubjectKeyForAbraxasSubject } from "@/lib/identity/subject/claimsSubjectKey";
import {
  authenticateProviderEvent,
  parseProviderEventBody,
  validateEventEnvelope,
  type ProviderAuthResult,
} from "./authenticate";
import { resolveProviderSubjectBinding } from "./bindingStore";
import type { NormalizedProviderEvent, ProviderProcessingResult } from "./contract";
import { normalizeProviderAssertions } from "./normalize";
import { recordProviderMetric } from "./observability";
import { loadProviderAuthorization, isProviderActive } from "./providerConfig";
import { consumeProviderEventReplay, hashProviderEvent } from "./replayStore";

export interface ProcessProviderEventInput {
  rawBody: string;
  providerId: string;
  signature: string | null;
  timestamp: string | null;
  apiKeyHeader: string | null;
}

async function reject(
  input: ProcessProviderEventInput,
  code: string,
  detail?: string,
): Promise<ProviderProcessingResult> {
  await recordProviderMetric({
    kind: "provider_event_rejected",
    providerId: input.providerId,
    code,
  });
  return { ok: false, outcome: "rejected", code, detail };
}

async function handleRevocation(input: {
  event: NormalizedProviderEvent;
  claimsSubjectKey: string;
  abraxasSubjectId: string;
}): Promise<ProviderProcessingResult> {
  const claims = await getActiveClaims(input.claimsSubjectKey);
  const providerClaims = claims.filter((c) => c.issuer_id === input.event.provider_id);

  for (const claim of providerClaims) {
    await updateClaimStatus({
      claimId: claim.id,
      status: "revoked",
      reason: `provider_revocation:${input.event.provider_event_id}`,
    });
  }

  await recordProviderMetric({
    kind: "provider_claim_revoked",
    providerId: input.event.provider_id,
    providerEventId: input.event.provider_event_id,
    abraxasSubjectId: input.abraxasSubjectId,
  });

  return {
    ok: true,
    outcome: "revoked",
    code: "claims_revoked",
    abraxas_subject_id: input.abraxasSubjectId,
    claims_subject_key: input.claimsSubjectKey,
    normalized_claim_types: providerClaims.map((c) => c.claim_type),
  };
}

/**
 * Provider-neutral inbound adapter. Authenticates, deduplicates, binds subject,
 * normalizes claims through canonical issuance path. Does NOT create DecisionReceipts
 * or evaluate partner policy directly.
 */
export async function processProviderEvent(
  input: ProcessProviderEventInput,
): Promise<ProviderProcessingResult> {
  await recordProviderMetric({
    kind: "provider_event_received",
    providerId: input.providerId,
  });

  const auth: ProviderAuthResult = await authenticateProviderEvent(input);
  if (!auth.ok) {
    return reject(input, auth.code, auth.detail);
  }

  await recordProviderMetric({
    kind: "provider_event_authenticated",
    providerId: input.providerId,
  });

  const event = parseProviderEventBody(input.rawBody);
  if (!event) {
    return reject(input, "invalid_event_envelope");
  }
  if (event.provider_id !== input.providerId) {
    return reject(input, "provider_id_mismatch");
  }

  const envelopeError = validateEventEnvelope(event);
  if (envelopeError) {
    return reject(input, envelopeError);
  }

  const authz = await loadProviderAuthorization(event.provider_id);
  if (!authz) {
    return reject(input, "provider_not_configured");
  }
  if (!isProviderActive(authz)) {
    return reject(input, "provider_revoked");
  }

  const eventHash = hashProviderEvent(event.provider_id, event.provider_event_id, event);
  const replay = await consumeProviderEventReplay({
    providerId: event.provider_id,
    providerEventId: event.provider_event_id,
    eventHash,
  });

  if (!replay.ok && replay.code === "conflict") {
    await recordProviderMetric({
      kind: "provider_binding_conflict",
      providerId: event.provider_id,
      providerEventId: event.provider_event_id,
      code: "replay_conflict",
    });
    return { ok: false, outcome: "rejected", code: "replay_conflict" };
  }
  if (replay.ok && replay.code === "duplicate") {
    await recordProviderMetric({
      kind: "provider_event_duplicate",
      providerId: event.provider_id,
      providerEventId: event.provider_event_id,
    });
    return { ok: true, outcome: "duplicate", code: "duplicate_event" };
  }

  const binding = await resolveProviderSubjectBinding({
    providerId: event.provider_id,
    providerSubjectRef: event.provider_subject_ref,
  });
  if (!binding.ok) {
    await recordProviderMetric({
      kind: binding.code === "binding_conflict"
        ? "provider_binding_conflict"
        : "provider_event_rejected",
      providerId: event.provider_id,
      providerEventId: event.provider_event_id,
      code: binding.code,
    });
    return { ok: false, outcome: "rejected", code: binding.code, detail: binding.code === "db_error" ? binding.detail : undefined };
  }

  if (binding.created) {
    await recordProviderMetric({
      kind: "provider_binding_created",
      providerId: event.provider_id,
      providerEventId: event.provider_event_id,
      abraxasSubjectId: binding.subject.id,
    });
  }

  const claimsSubjectKey = binding.subject.claims_subject_key;

  if (event.event_type === "verification_revoked") {
    return handleRevocation({
      event,
      claimsSubjectKey,
      abraxasSubjectId: binding.subject.id,
    });
  }

  const normalized = normalizeProviderAssertions({
    event,
    auth: authz,
    claimsSubjectKey,
  });
  if (!normalized.ok) {
    return reject(input, normalized.code, normalized.detail);
  }

  await upsertClaims(normalized.claims);

  await recordProviderMetric({
    kind: "provider_claims_normalized",
    providerId: event.provider_id,
    providerEventId: event.provider_event_id,
    abraxasSubjectId: binding.subject.id,
  });

  return {
    ok: true,
    outcome: "accepted",
    code: "claims_normalized",
    abraxas_subject_id: binding.subject.id,
    claims_subject_key: claimsSubjectKey,
    normalized_claim_types: normalized.claims.map((c) => c.claim_type),
  };
}

/** @alias ExternalVerificationProviderAdapter entry point */
export const ExternalVerificationProviderAdapter = {
  processEvent: processProviderEvent,
};
