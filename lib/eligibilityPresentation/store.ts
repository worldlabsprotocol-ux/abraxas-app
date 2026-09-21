// FILE: lib/eligibilityPresentation/store.ts
// Durable audience-bound presentation requests and one-time nonce consumption.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { EligibilityPresentationRecord, EligibilityPresentationRequestRecord } from "./types";

const REQUESTS = "eligibility_presentation_requests";
const PRESENTATIONS = "eligibility_presentations";
const requestMemory = new Map<string, EligibilityPresentationRequestRecord>();
const presentationMemory = new Map<string, EligibilityPresentationRecord>();
const nonceIndex = new Map<string, string>();
let storeForcedUnavailable = false;

function skipDurableStore(): boolean {
  return Boolean(process.env.VITEST);
}

export function resetEligibilityPresentationsForTests(): void {
  requestMemory.clear();
  presentationMemory.clear();
  nonceIndex.clear();
  storeForcedUnavailable = false;
}

export function forceEligibilityStoreUnavailableForTests(value = true): void {
  storeForcedUnavailable = value;
}

function refreshRequest(
  record: EligibilityPresentationRequestRecord,
  now = Date.now(),
): EligibilityPresentationRequestRecord {
  if (record.status === "created" || record.status === "completed") {
    if (new Date(record.expires_at).getTime() <= now) {
      return { ...record, status: "expired" };
    }
  }
  return record;
}

function refreshPresentation(
  record: EligibilityPresentationRecord,
  now = Date.now(),
): EligibilityPresentationRecord {
  if (record.status === "issued" && new Date(record.expires_at).getTime() <= now) {
    return { ...record, status: "expired" };
  }
  return record;
}

function requestFromRow(row: Record<string, unknown>): EligibilityPresentationRequestRecord {
  return {
    request_ref: String(row.request_ref),
    partner_hmac: String(row.partner_hmac),
    audience_hash: String(row.audience_hash),
    policy_id: String(row.policy_id),
    policy_version: Number(row.policy_version),
    purpose: String(row.purpose),
    action: String(row.action),
    action_scope: String(row.action_scope),
    environment: row.environment === "production" ? "production" : "sandbox",
    result_category: String(row.result_category),
    nonce_hash: String(row.nonce_hash),
    status: row.status as EligibilityPresentationRequestRecord["status"],
    expires_at: String(row.expires_at),
    issued_at: String(row.issued_at),
    presentation_ref: row.presentation_ref ? String(row.presentation_ref) : null,
    source_receipt_id: row.source_receipt_id ? String(row.source_receipt_id) : null,
    holder_session_hmac: row.holder_session_hmac ? String(row.holder_session_hmac) : null,
    consent_bound: Boolean(row.consent_bound),
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
    consumed_at: row.consumed_at ? String(row.consumed_at) : null,
  };
}

function presentationFromRow(row: Record<string, unknown>): EligibilityPresentationRecord {
  return {
    presentation_ref: String(row.presentation_ref),
    request_ref: String(row.request_ref),
    partner_hmac: String(row.partner_hmac),
    audience_hash: String(row.audience_hash),
    policy_id: String(row.policy_id),
    policy_version: Number(row.policy_version),
    action: String(row.action),
    action_scope: String(row.action_scope),
    environment: row.environment === "production" ? "production" : "sandbox",
    result_category: String(row.result_category),
    nonce_hash: String(row.nonce_hash),
    receipt_verification_ref: String(row.receipt_verification_ref),
    signing_key_id: String(row.signing_key_id),
    payload_hash: String(row.payload_hash),
    signature: String(row.signature),
    status: row.status as EligibilityPresentationRecord["status"],
    issued_at: String(row.issued_at),
    expires_at: String(row.expires_at),
    consumed_at: row.consumed_at ? String(row.consumed_at) : null,
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
    consent_bound: Boolean(row.consent_bound),
  };
}

async function persistRequest(record: EligibilityPresentationRequestRecord): Promise<void> {
  if (storeForcedUnavailable) {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
  requestMemory.set(record.request_ref, record);
  nonceIndex.set(record.nonce_hash, record.request_ref);
  if (skipDurableStore()) return;
  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(REQUESTS).upsert({
      request_ref: record.request_ref,
      partner_hmac: record.partner_hmac,
      audience_hash: record.audience_hash,
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      purpose: record.purpose,
      action: record.action,
      action_scope: record.action_scope,
      environment: record.environment,
      result_category: record.result_category,
      nonce_hash: record.nonce_hash,
      status: record.status,
      expires_at: record.expires_at,
      issued_at: record.issued_at,
      presentation_ref: record.presentation_ref,
      source_receipt_id: record.source_receipt_id,
      holder_session_hmac: record.holder_session_hmac,
      consent_bound: record.consent_bound,
      revoked_at: record.revoked_at,
      consumed_at: record.consumed_at,
    }, { onConflict: "request_ref" });
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

async function persistPresentation(record: EligibilityPresentationRecord): Promise<void> {
  if (storeForcedUnavailable) {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
  presentationMemory.set(record.presentation_ref, record);
  if (skipDurableStore()) return;
  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(PRESENTATIONS).upsert({
      presentation_ref: record.presentation_ref,
      request_ref: record.request_ref,
      partner_hmac: record.partner_hmac,
      audience_hash: record.audience_hash,
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      action: record.action,
      action_scope: record.action_scope,
      environment: record.environment,
      result_category: record.result_category,
      nonce_hash: record.nonce_hash,
      receipt_verification_ref: record.receipt_verification_ref,
      signing_key_id: record.signing_key_id,
      payload_hash: record.payload_hash,
      signature: record.signature,
      status: record.status,
      issued_at: record.issued_at,
      expires_at: record.expires_at,
      consumed_at: record.consumed_at,
      revoked_at: record.revoked_at,
      consent_bound: record.consent_bound,
    }, { onConflict: "presentation_ref" });
    if (error) {
      const msg = `${error.message} ${error.code ?? ""}`.toLowerCase();
      if (msg.includes("does not exist") || msg.includes("schema") || msg.includes("42p01")) {
        throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
      }
      throw Object.assign(new Error("unavailable"), { code: "unavailable" });
    }
  } catch (error) {
    if (error instanceof Error && "code" in error) throw error;
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}

export async function savePresentationRequest(
  record: EligibilityPresentationRequestRecord,
): Promise<EligibilityPresentationRequestRecord> {
  await persistRequest(record);
  return record;
}

export async function savePresentation(
  record: EligibilityPresentationRecord,
): Promise<EligibilityPresentationRecord> {
  await persistPresentation(record);
  return record;
}

export async function loadPresentationRequest(
  requestRef: string,
): Promise<EligibilityPresentationRequestRecord | null> {
  const cached = requestMemory.get(requestRef);
  if (cached) return refreshRequest(cached);
  if (skipDurableStore()) return null;
  if (storeForcedUnavailable) {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb.from(REQUESTS).select("*").eq("request_ref", requestRef).maybeSingle();
    if (error || !data) return null;
    const record = refreshRequest(requestFromRow(data as Record<string, unknown>));
    requestMemory.set(record.request_ref, record);
    return record;
  } catch {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}

export async function loadPresentation(
  presentationRef: string,
): Promise<EligibilityPresentationRecord | null> {
  const cached = presentationMemory.get(presentationRef);
  if (cached) return refreshPresentation(cached);
  if (skipDurableStore()) return null;
  if (storeForcedUnavailable) {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb.from(PRESENTATIONS).select("*").eq("presentation_ref", presentationRef).maybeSingle();
    if (error || !data) return null;
    const record = refreshPresentation(presentationFromRow(data as Record<string, unknown>));
    presentationMemory.set(record.presentation_ref, record);
    return record;
  } catch {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}

export async function findRequestByNonceHash(
  hash: string,
): Promise<EligibilityPresentationRequestRecord | null> {
  const ref = nonceIndex.get(hash);
  if (ref) return loadPresentationRequest(ref);
  if (skipDurableStore()) return null;
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb.from(REQUESTS).select("*").eq("nonce_hash", hash).maybeSingle();
    if (error || !data) return null;
    return refreshRequest(requestFromRow(data as Record<string, unknown>));
  } catch {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}

export async function findPresentationByNonceHash(
  hash: string,
): Promise<EligibilityPresentationRecord | null> {
  let found: EligibilityPresentationRecord | null = null;
  presentationMemory.forEach((record) => {
    if (!found && record.nonce_hash === hash) found = record;
  });
  if (found) return refreshPresentation(found);
  if (skipDurableStore()) return null;
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb.from(PRESENTATIONS).select("*").eq("nonce_hash", hash).maybeSingle();
    if (error || !data) return null;
    return refreshPresentation(presentationFromRow(data as Record<string, unknown>));
  } catch {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}

export async function revokePresentationsForOrganization(input: {
  partnerHmac: string;
  result_category: string;
  policy_id: string;
  presentation_ref?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const updates: EligibilityPresentationRecord[] = [];
  presentationMemory.forEach((record) => {
    const matchRef = input.presentation_ref && record.presentation_ref === input.presentation_ref;
    const matchBind =
      record.partner_hmac === input.partnerHmac
      && record.result_category === input.result_category
      && record.policy_id === input.policy_id
      && record.status === "issued";
    if (matchRef || matchBind) {
      updates.push({ ...record, status: "revoked", revoked_at: now });
    }
  });
  for (const record of updates) {
    await persistPresentation(record);
  }
}

export async function revokePresentationsForReceipt(receiptId: string): Promise<void> {
  const now = new Date().toISOString();
  const updates: EligibilityPresentationRecord[] = [];
  presentationMemory.forEach((record) => {
    if (record.receipt_verification_ref === receiptId && record.status === "issued") {
      updates.push({ ...record, status: "revoked", revoked_at: now });
    }
  });
  for (const record of updates) {
    await persistPresentation(record);
  }
}

export async function findUniqueCreatedRequest(input: {
  partnerHmac: string;
  policyId: string;
  policyVersion: number;
  environment: "sandbox" | "production";
}): Promise<EligibilityPresentationRequestRecord | null> {
  const matches: EligibilityPresentationRequestRecord[] = [];
  requestMemory.forEach((record) => {
    const live = refreshRequest(record);
    if (
      live.status === "created"
      && live.partner_hmac === input.partnerHmac
      && live.policy_id === input.policyId
      && live.policy_version === input.policyVersion
      && live.environment === input.environment
    ) {
      matches.push(live);
    }
  });
  if (matches.length === 1) return matches[0] ?? null;
  if (matches.length > 1) return null;
  if (skipDurableStore()) return null;
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from(REQUESTS)
      .select("*")
      .eq("partner_hmac", input.partnerHmac)
      .eq("policy_id", input.policyId)
      .eq("policy_version", input.policyVersion)
      .eq("environment", input.environment)
      .eq("status", "created");
    if (error || !data || data.length !== 1) return null;
    return refreshRequest(requestFromRow(data[0] as Record<string, unknown>));
  } catch {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}
