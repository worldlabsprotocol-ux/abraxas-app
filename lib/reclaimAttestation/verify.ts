// FILE: lib/reclaimAttestation/verify.ts
// Server callback verification. TEE, provider/version, session, nonce, and replay fail closed.

import { RECLAIM_HOLDER_COPY } from "./contract";
import {
  reclaimAppSecret,
  reclaimConfigurationPresent,
  reclaimRequestMatchesRuntime,
  resolveReclaimRuntime,
} from "./config";
import { extractedShapeMatches, mappingById } from "./mapping";
import {
  contextBindingHmac,
  holderBindingHmac,
  opaqueCallbackRef,
  policyBindingHmac,
  proofDigest,
  verifyRequestHmac,
} from "./opaque";
import { reclaimSdk } from "./sdk";
import { publicReclaimSessionView, reclaimPayloadLeaks } from "./safety";
import {
  findAcceptedReclaimSession,
  findReclaimSessionByProofDigest,
  loadReclaimSession,
  saveReclaimSession,
} from "./store";
import type { ReclaimSessionRecord } from "./types";

function extractContext(raw: unknown): { address: string | null; message: string | null } {
  try {
    const proofsArray = Array.isArray(raw) ? raw : [raw];
    const first = proofsArray[0] as Record<string, unknown>;
    const claimData = (first?.claimData ?? first) as Record<string, unknown>;
    const contextRaw = claimData?.context;
    if (typeof contextRaw === "string") {
      const parsed = JSON.parse(contextRaw) as { contextAddress?: string; contextMessage?: string; message?: string };
      return {
        address: parsed.contextAddress ?? null,
        message: parsed.contextMessage ?? parsed.message ?? null,
      };
    }
    if (contextRaw && typeof contextRaw === "object") {
      const parsed = contextRaw as { address?: string; message?: string };
      return { address: parsed.address ?? null, message: parsed.message ?? null };
    }
    return { address: null, message: null };
  } catch {
    return { address: null, message: null };
  }
}

export type ReclaimCallbackResult =
  | { ok: true; view: Record<string, unknown> }
  | { ok: false; code: string; status: number };

export async function acceptReclaimCallback(input: {
  proofs: unknown;
  request?: { headers: Headers };
}): Promise<ReclaimCallbackResult> {
  if (!reclaimConfigurationPresent()) {
    return { ok: false, code: "reclaim_configuration_missing", status: 503 };
  }
  const runtime = resolveReclaimRuntime();
  if (!runtime.ok) {
    return { ok: false, code: runtime.code, status: 400 };
  }
  if (input.request && !reclaimRequestMatchesRuntime(input.request)) {
    return { ok: false, code: "reclaim_origin_mismatch", status: 400 };
  }
  const expectedCallbackRef = opaqueCallbackRef(runtime.runtime);
  const appSecret = reclaimAppSecret();
  if (!appSecret) return { ok: false, code: "reclaim_configuration_missing", status: 503 };

  const extracted = extractContext(input.proofs);
  if (!extracted.message) {
    return { ok: false, code: "reclaim_session_missing", status: 400 };
  }

  let session: ReclaimSessionRecord | null;
  try {
    session = await loadReclaimSession(extracted.message);
  } catch {
    return { ok: false, code: "schema_unavailable", status: 503 };
  }
  if (!session) return { ok: false, code: "reclaim_session_missing", status: 400 };
  if (session.callback_ref !== expectedCallbackRef) {
    return { ok: false, code: "reclaim_origin_mismatch", status: 400 };
  }

  if (session.status === "cancelled") return { ok: false, code: "reclaim_cancelled", status: 400 };
  if (session.status === "expired" || new Date(session.expires_at).getTime() <= Date.now()) {
    session = { ...session, status: "expired" };
    await saveReclaimSession(session).catch(() => undefined);
    return { ok: false, code: "reclaim_expired", status: 400 };
  }
  if (session.status === "accepted" || session.status === "replayed") {
    return { ok: false, code: "reclaim_replayed", status: 409 };
  }
  if (extracted.address && contextBindingHmac(extracted.address) !== session.context_hmac) {
    return { ok: false, code: "reclaim_context_mismatch", status: 400 };
  }

  const mapping = mappingById(session.mapping_id);
  if (!mapping) return { ok: false, code: "reclaim_mapping_unavailable", status: 400 };
  if (mapping.provider_id !== session.provider_id || mapping.provider_version !== session.provider_version) {
    return { ok: false, code: "reclaim_provider_version_mismatch", status: 400 };
  }

  const digest = proofDigest(input.proofs);
  let existingDigest: ReclaimSessionRecord | null = null;
  try {
    existingDigest = await findReclaimSessionByProofDigest(digest);
  } catch {
    return { ok: false, code: "schema_unavailable", status: 503 };
  }
  if (existingDigest) {
    session = { ...session, status: "replayed" };
    await saveReclaimSession(session).catch(() => undefined);
    return { ok: false, code: "reclaim_replayed", status: 409 };
  }

  let verified;
  try {
    verified = await reclaimSdk().verifyProof({
      proofs: input.proofs,
      providerId: session.provider_id,
      providerVersion: session.provider_version,
      appSecret,
    });
  } catch {
    return { ok: false, code: "reclaim_invalid_proof", status: 400 };
  }

  if (!verified.isVerified) return { ok: false, code: "reclaim_invalid_proof", status: 400 };
  if (!verified.isTeeAttestationVerified) return { ok: false, code: "reclaim_tee_required", status: 400 };

  const first = verified.data[0];
  const proofAddress = first?.context?.address ?? extracted.address;
  const proofMessage = first?.context?.message ?? extracted.message;
  if (!proofAddress || contextBindingHmac(proofAddress) !== session.context_hmac) {
    return { ok: false, code: "reclaim_context_mismatch", status: 400 };
  }
  if (proofMessage !== session.session_ref) {
    return { ok: false, code: "reclaim_context_mismatch", status: 400 };
  }
  if (!extractedShapeMatches(mapping, first?.extractedParameters ?? {})) {
    return { ok: false, code: "reclaim_assertion_mismatch", status: 400 };
  }

  session = {
    ...session,
    status: "accepted",
    proof_digest: digest,
    accepted_at: new Date().toISOString(),
    issued_receipt: false,
  };
  try {
    await saveReclaimSession(session);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code: string }).code) : "schema_unavailable";
    return { ok: false, code, status: code === "replayed" ? 409 : 503 };
  }

  const view = publicReclaimSessionView({
    session_ref: session.session_ref,
    status: session.status,
    expires_at: session.expires_at,
    method_category: session.method_category,
    result_class: session.result_class,
    assurance_level: session.assurance_level,
    environment: session.environment,
    configuration_present: true,
    issued_receipt: false,
    consent_required: true,
    next_action: "continue_consent",
    holder_copy: RECLAIM_HOLDER_COPY,
  });
  if (!view || reclaimPayloadLeaks(view).length > 0) {
    return { ok: false, code: "disclosure_rejected", status: 503 };
  }
  return { ok: true, view };
}

export async function holderHasAcceptedReclaim(input: {
  holderSubject: string;
  verifyRequest: string;
  policyId: string;
  policyVersion: number;
  environment: string;
}): Promise<boolean> {
  try {
    const found = await findAcceptedReclaimSession({
      holderHmac: holderBindingHmac(input.holderSubject),
      verifyRequestHmac: verifyRequestHmac(input.verifyRequest),
      policyHmac: policyBindingHmac(input.policyId, input.policyVersion),
      environment: input.environment,
    });
    return found?.status === "accepted";
  } catch {
    return false;
  }
}

export async function cancelReclaimSession(sessionRef: string, holderSubject: string): Promise<ReclaimSessionRecord | null> {
  const session = await loadReclaimSession(sessionRef);
  if (!session) return null;
  if (session.holder_hmac !== holderBindingHmac(holderSubject)) return null;
  if (session.status !== "created") return session;
  const next = {
    ...session,
    status: "cancelled" as const,
    cancelled_at: new Date().toISOString(),
  };
  await saveReclaimSession(next);
  return next;
}
