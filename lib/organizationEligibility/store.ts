// FILE: lib/organizationEligibility/store.ts
// Durable opaque organization eligibility. Service-role only. No evidence payloads.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { OrganizationEligibilityRecord } from "./types";

const TABLE = "organization_eligibility_records";
const memory = new Map<string, OrganizationEligibilityRecord>();
let storeForcedUnavailable = false;

function skipDurableStore(): boolean {
  return Boolean(process.env.VITEST);
}

export function resetOrganizationEligibilityForTests(): void {
  memory.clear();
  storeForcedUnavailable = false;
}

export function forceOrganizationStoreUnavailableForTests(value = true): void {
  storeForcedUnavailable = value;
}

function refresh(record: OrganizationEligibilityRecord, now = Date.now()): OrganizationEligibilityRecord {
  if (record.status === "issued" && new Date(record.expires_at).getTime() <= now) {
    return { ...record, status: "expired", currently_valid: false };
  }
  if (record.status === "revoked" || record.status === "withdrawn" || record.status === "expired") {
    return { ...record, currently_valid: false };
  }
  return { ...record, currently_valid: record.consent_bound && record.status === "issued" };
}

function fromRow(row: Record<string, unknown>): OrganizationEligibilityRecord {
  return refresh({
    organization_ref: String(row.organization_ref),
    actor_ref: String(row.actor_ref),
    partner_hmac: String(row.partner_hmac),
    audience_hash: String(row.audience_hash),
    issuer_ref: String(row.issuer_ref),
    method_category: String(row.method_category),
    assurance_level: String(row.assurance_level),
    result_category: row.result_category as OrganizationEligibilityRecord["result_category"],
    policy_id: String(row.policy_id),
    policy_version: Number(row.policy_version),
    purpose: String(row.purpose),
    action: String(row.action),
    action_scope: String(row.action_scope),
    environment: row.environment === "production" ? "production" : "sandbox",
    status: row.status as OrganizationEligibilityRecord["status"],
    consent_bound: Boolean(row.consent_bound),
    currently_valid: Boolean(row.currently_valid),
    issued_at: String(row.issued_at),
    expires_at: String(row.expires_at),
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
    withdrawn_at: row.withdrawn_at ? String(row.withdrawn_at) : null,
    derivation_hash: String(row.derivation_hash),
    presentation_ref: row.presentation_ref ? String(row.presentation_ref) : null,
    subject_binding_hash: row.subject_binding_hash ? String(row.subject_binding_hash) : null,
  });
}

export async function saveOrganizationEligibility(record: OrganizationEligibilityRecord): Promise<void> {
  if (storeForcedUnavailable) {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
  const live = refresh(record);
  if (skipDurableStore()) {
    memory.set(live.organization_ref, live);
    return;
  }
  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(TABLE).upsert({
      organization_ref: live.organization_ref,
      actor_ref: live.actor_ref,
      partner_hmac: live.partner_hmac,
      audience_hash: live.audience_hash,
      issuer_ref: live.issuer_ref,
      method_category: live.method_category,
      assurance_level: live.assurance_level,
      result_category: live.result_category,
      policy_id: live.policy_id,
      policy_version: live.policy_version,
      purpose: live.purpose,
      action: live.action,
      action_scope: live.action_scope,
      environment: live.environment,
      status: live.status,
      consent_bound: live.consent_bound,
      currently_valid: live.currently_valid,
      issued_at: live.issued_at,
      expires_at: live.expires_at,
      revoked_at: live.revoked_at,
      withdrawn_at: live.withdrawn_at,
      derivation_hash: live.derivation_hash,
      presentation_ref: live.presentation_ref,
      subject_binding_hash: live.subject_binding_hash,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_ref" });
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

export async function loadOrganizationEligibility(ref: string): Promise<OrganizationEligibilityRecord | null> {
  if (storeForcedUnavailable) {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
  if (skipDurableStore()) {
    const cached = memory.get(ref);
    return cached ? refresh(cached) : null;
  }
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb.from(TABLE).select("*").eq("organization_ref", ref).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as Record<string, unknown>) : null;
  } catch {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}

export async function findOrganizationByDerivation(hash: string): Promise<OrganizationEligibilityRecord | null> {
  if (storeForcedUnavailable) {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
  if (skipDurableStore()) {
    let found: OrganizationEligibilityRecord | null = null;
    memory.forEach((record) => {
      if (!found && record.derivation_hash === hash) found = refresh(record);
    });
    return found;
  }
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb.from(TABLE).select("*").eq("derivation_hash", hash).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as Record<string, unknown>) : null;
  } catch {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}

export async function listOrganizationEligibilityMatching(input: {
  partner_hmac: string;
  result_category: string;
  policy_id: string;
  policy_version: number;
  action: string;
  environment: "sandbox" | "production";
  actor_ref?: string;
}): Promise<OrganizationEligibilityRecord[]> {
  if (storeForcedUnavailable) {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
  if (skipDurableStore()) {
    const matches: OrganizationEligibilityRecord[] = [];
    memory.forEach((record) => {
      const live = refresh(record);
      if (
        live.partner_hmac === input.partner_hmac
        && live.result_category === input.result_category
        && live.policy_id === input.policy_id
        && live.policy_version === input.policy_version
        && live.action === input.action
        && live.environment === input.environment
        && (!input.actor_ref || live.actor_ref === input.actor_ref)
      ) {
        matches.push(live);
      }
    });
    return matches;
  }
  try {
    const sb = requireSupabaseAdmin();
    let query = sb.from(TABLE).select("*")
      .eq("partner_hmac", input.partner_hmac)
      .eq("result_category", input.result_category)
      .eq("policy_id", input.policy_id)
      .eq("policy_version", input.policy_version)
      .eq("action", input.action)
      .eq("environment", input.environment);
    if (input.actor_ref) query = query.eq("actor_ref", input.actor_ref);
    const { data, error } = await query;
    if (error || !data) throw error ?? new Error("unavailable");
    return data.map((row) => fromRow(row as Record<string, unknown>));
  } catch {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}

export async function findOrganizationBySubjectBinding(input: {
  partner_hmac: string;
  subject_binding_hash: string;
}): Promise<OrganizationEligibilityRecord | null> {
  if (storeForcedUnavailable) {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
  if (skipDurableStore()) {
    let found: OrganizationEligibilityRecord | null = null;
    memory.forEach((record) => {
      if (found) return;
      const live = refresh(record);
      if (live.partner_hmac === input.partner_hmac && live.subject_binding_hash === input.subject_binding_hash) {
        found = live;
      }
    });
    return found;
  }
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb.from(TABLE).select("*")
      .eq("partner_hmac", input.partner_hmac)
      .eq("subject_binding_hash", input.subject_binding_hash)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as Record<string, unknown>) : null;
  } catch {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}
