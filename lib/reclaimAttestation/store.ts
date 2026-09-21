// FILE: lib/reclaimAttestation/store.ts
// Durable Reclaim sessions and proof-digest replay protection. Fail closed.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { ReclaimSessionRecord } from "./types";

const TABLE = "reclaim_private_attestation_sessions";
const memory = new Map<string, ReclaimSessionRecord>();
const digestIndex = new Map<string, string>();
let storeForcedUnavailable = false;

function skipDurableStore(): boolean {
  return Boolean(process.env.VITEST);
}

export function resetReclaimSessionsForTests(): void {
  memory.clear();
  digestIndex.clear();
  storeForcedUnavailable = false;
}

export function forceReclaimStoreUnavailableForTests(value = true): void {
  storeForcedUnavailable = value;
}

export function putReclaimSessionForTests(record: ReclaimSessionRecord): void {
  memory.set(record.session_ref, record);
  if (record.proof_digest) digestIndex.set(record.proof_digest, record.session_ref);
}

function refreshStatus(record: ReclaimSessionRecord, now = Date.now()): ReclaimSessionRecord {
  if (record.status === "created" && new Date(record.expires_at).getTime() <= now) {
    return { ...record, status: "expired" };
  }
  return record;
}

function fromRow(row: Record<string, unknown>): ReclaimSessionRecord {
  return {
    session_ref: String(row.session_ref),
    holder_hmac: String(row.holder_hmac),
    verify_request_hmac: String(row.verify_request_hmac),
    policy_hmac: String(row.policy_hmac),
    policy_id: String(row.policy_id),
    policy_version: Number(row.policy_version),
    method_category: "privacy_preserving",
    result_class: String(row.result_class),
    assurance_level: String(row.assurance_level),
    environment: row.environment === "production" ? "production" : "sandbox",
    mapping_id: String(row.mapping_id),
    provider_id: String(row.provider_id),
    provider_version: String(row.provider_version),
    nonce_hash: String(row.nonce_hash),
    context_hmac: String(row.context_hmac),
    callback_ref: String(row.callback_ref),
    status: row.status as ReclaimSessionRecord["status"],
    proof_digest: row.proof_digest ? String(row.proof_digest) : null,
    issued_at: String(row.issued_at),
    expires_at: String(row.expires_at),
    accepted_at: row.accepted_at ? String(row.accepted_at) : null,
    cancelled_at: row.cancelled_at ? String(row.cancelled_at) : null,
    issued_receipt: false,
  };
}

async function persist(record: ReclaimSessionRecord): Promise<void> {
  if (storeForcedUnavailable) {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
  memory.set(record.session_ref, record);
  if (record.proof_digest) digestIndex.set(record.proof_digest, record.session_ref);
  if (skipDurableStore()) return;
  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(TABLE).upsert({
      session_ref: record.session_ref,
      holder_hmac: record.holder_hmac,
      verify_request_hmac: record.verify_request_hmac,
      policy_hmac: record.policy_hmac,
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      method_category: record.method_category,
      result_class: record.result_class,
      assurance_level: record.assurance_level,
      environment: record.environment,
      mapping_id: record.mapping_id,
      provider_id: record.provider_id,
      provider_version: record.provider_version,
      nonce_hash: record.nonce_hash,
      context_hmac: record.context_hmac,
      callback_ref: record.callback_ref,
      status: record.status,
      proof_digest: record.proof_digest,
      issued_at: record.issued_at,
      expires_at: record.expires_at,
      accepted_at: record.accepted_at,
      cancelled_at: record.cancelled_at,
    }, { onConflict: "session_ref" });
    if (error) {
      const msg = `${error.message} ${error.code ?? ""}`.toLowerCase();
      if (msg.includes("does not exist") || msg.includes("schema") || msg.includes("42p01")) {
        throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
      }
      if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("23505")) {
        throw Object.assign(new Error("replayed"), { code: "replayed" });
      }
      throw Object.assign(new Error("unavailable"), { code: "unavailable" });
    }
  } catch (error) {
    if (error instanceof Error && "code" in error) throw error;
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}

export async function saveReclaimSession(record: ReclaimSessionRecord): Promise<ReclaimSessionRecord> {
  await persist(record);
  return record;
}

export async function loadReclaimSession(sessionRef: string): Promise<ReclaimSessionRecord | null> {
  const cached = memory.get(sessionRef);
  if (cached) return refreshStatus(cached);
  if (skipDurableStore()) return null;
  if (storeForcedUnavailable) {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb.from(TABLE).select("*").eq("session_ref", sessionRef).maybeSingle();
    if (error || !data) return null;
    const record = refreshStatus(fromRow(data as Record<string, unknown>));
    memory.set(record.session_ref, record);
    return record;
  } catch {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}

export async function findReclaimSessionByProofDigest(digest: string): Promise<ReclaimSessionRecord | null> {
  const ref = digestIndex.get(digest);
  if (ref) return loadReclaimSession(ref);
  if (skipDurableStore()) return null;
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb.from(TABLE).select("*").eq("proof_digest", digest).maybeSingle();
    if (error || !data) return null;
    return refreshStatus(fromRow(data as Record<string, unknown>));
  } catch {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}

export async function findAcceptedReclaimSession(input: {
  holderHmac: string;
  verifyRequestHmac: string;
  policyHmac: string;
  environment: string;
}): Promise<ReclaimSessionRecord | null> {
  let found: ReclaimSessionRecord | null = null;
  memory.forEach((record: ReclaimSessionRecord) => {
    if (found) return;
    if (
      record.status === "accepted"
      && record.holder_hmac === input.holderHmac
      && record.verify_request_hmac === input.verifyRequestHmac
      && record.policy_hmac === input.policyHmac
      && record.environment === input.environment
    ) {
      found = record;
    }
  });
  if (found) return refreshStatus(found);
  if (skipDurableStore()) return null;
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb.from(TABLE)
      .select("*")
      .eq("holder_hmac", input.holderHmac)
      .eq("verify_request_hmac", input.verifyRequestHmac)
      .eq("policy_hmac", input.policyHmac)
      .eq("environment", input.environment)
      .eq("status", "accepted")
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return refreshStatus(fromRow(data as Record<string, unknown>));
  } catch {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}
