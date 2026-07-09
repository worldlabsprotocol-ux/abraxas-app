// FILE: lib/trust/issuerFramework.ts
// Issuer profiles, signing keys, trust rules, and claim attestation verification.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import type { AssuranceLevel } from "@/lib/credentials/claimSchema";
import { listTrustedIssuers, type TrustedIssuer } from "@/lib/trust/trustRegistry";

export type IssuerStatus = "pending" | "active" | "suspended" | "revoked";

export interface IssuerRecord {
  id: string;
  legal_name: string;
  display_name: string;
  issuer_type: string;
  issuer_status: IssuerStatus;
  trust_status: string;
  supported_claims: string[];
  jurisdictions: string[];
  assurance_levels: string[];
  verification_methods: string[];
  credential_ttl_days: number | null;
  audit_status: string;
  metadata: Record<string, unknown>;
}

export interface IssuerSigningKeyRecord {
  id: string;
  issuer_id: string;
  public_key_jwk: Record<string, unknown>;
  status: "active" | "expired" | "revoked";
  allowed_claim_scopes: string[];
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface PartnerIssuerTrustRule {
  id: string;
  partner_id: string;
  policy_id: string | null;
  claim_type: string;
  accepted_issuer_ids: string[];
  minimum_assurance_level: AssuranceLevel | null;
  accepted_jurisdictions: string[];
  credential_max_age_hours: number | null;
  status: string;
}

const ASSURANCE_RANK: Record<AssuranceLevel, number> = {
  L1: 1, L2: 2, L3: 3, L4: 4,
};

function mapIssuer(row: Record<string, unknown>): IssuerRecord {
  return {
    id: row.id as string,
    legal_name: row.legal_name as string,
    display_name: (row.display_name as string | null) ?? (row.legal_name as string),
    issuer_type: row.issuer_type as string,
    issuer_status: ((row.issuer_status as string | null) ??
      (row.trust_status === "active" ? "active" : "pending")) as IssuerStatus,
    trust_status: row.trust_status as string,
    supported_claims: (row.supported_claims as string[]) ?? [],
    jurisdictions: (row.jurisdictions as string[]) ?? [],
    assurance_levels: (row.assurance_levels as string[]) ?? [],
    verification_methods: (row.verification_methods as string[]) ?? [],
    credential_ttl_days: (row.credential_ttl_days as number | null) ?? null,
    audit_status: row.audit_status as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

export async function getIssuerById(issuerId: string): Promise<IssuerRecord | null> {
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from("credential_issuers")
      .select("*")
      .eq("id", issuerId)
      .maybeSingle();
    if (data) return mapIssuer(data as Record<string, unknown>);
  } catch {
    // table may not exist in test env
  }
  const fallback = (await listTrustedIssuers()).find(i => i.id === issuerId);
  if (!fallback) return null;
  return {
    id: fallback.id,
    legal_name: fallback.legal_name,
    display_name: fallback.legal_name,
    issuer_type: fallback.issuer_type,
    issuer_status: fallback.trust_status === "active" ? "active" : "pending",
    trust_status: fallback.trust_status,
    supported_claims: fallback.supported_claims,
    jurisdictions: fallback.jurisdictions,
    assurance_levels: fallback.assurance_levels,
    verification_methods: [],
    credential_ttl_days: fallback.credential_ttl_days,
    audit_status: fallback.audit_status,
    metadata: fallback.metadata,
  };
}

export async function getIssuerSigningKey(keyId: string): Promise<IssuerSigningKeyRecord | null> {
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from("issuer_signing_keys")
      .select("*")
      .eq("id", keyId)
      .maybeSingle();
    if (!data) return null;
    const row = data as Record<string, unknown>;
    const status = row.status as IssuerSigningKeyRecord["status"];
    if (row.revoked_at) return { ...mapKey(row), status: "revoked" };
    if (row.expires_at && new Date(row.expires_at as string) < new Date()) {
      return { ...mapKey(row), status: "expired" };
    }
    return mapKey(row);
  } catch {
    return null;
  }
}

function mapKey(row: Record<string, unknown>): IssuerSigningKeyRecord {
  return {
    id: row.id as string,
    issuer_id: row.issuer_id as string,
    public_key_jwk: row.public_key_jwk as Record<string, unknown>,
    status: row.status as IssuerSigningKeyRecord["status"],
    allowed_claim_scopes: (row.allowed_claim_scopes as string[]) ?? [],
    created_at: row.created_at as string,
    expires_at: (row.expires_at as string | null) ?? null,
    revoked_at: (row.revoked_at as string | null) ?? null,
  };
}

export async function listIssuersForAdmin(): Promise<IssuerRecord[]> {
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb.from("credential_issuers").select("*").order("legal_name");
    return (data ?? []).map(r => mapIssuer(r as Record<string, unknown>));
  } catch {
    return (await listTrustedIssuers()).map(i => ({
      id: i.id,
      legal_name: i.legal_name,
      display_name: i.legal_name,
      issuer_type: i.issuer_type,
      issuer_status: i.trust_status === "active" ? "active" : "pending",
      trust_status: i.trust_status,
      supported_claims: i.supported_claims,
      jurisdictions: i.jurisdictions,
      assurance_levels: i.assurance_levels,
      verification_methods: [],
      credential_ttl_days: i.credential_ttl_days,
      audit_status: i.audit_status,
      metadata: i.metadata,
    }));
  }
}

export async function listIssuerSigningKeys(issuerId: string): Promise<IssuerSigningKeyRecord[]> {
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from("issuer_signing_keys")
      .select("*")
      .eq("issuer_id", issuerId)
      .order("created_at", { ascending: false });
    return (data ?? []).map(r => mapKey(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function createIssuerSigningKey(input: {
  issuerId: string;
  keyId: string;
  publicKeyJwk: Record<string, unknown>;
  allowedClaimScopes: string[];
  expiresAt?: string | null;
  actorId: string;
}): Promise<IssuerSigningKeyRecord> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.from("issuer_signing_keys").insert({
    id: input.keyId,
    issuer_id: input.issuerId,
    public_key_jwk: input.publicKeyJwk,
    allowed_claim_scopes: input.allowedClaimScopes,
    expires_at: input.expiresAt ?? null,
    status: "active",
  }).select("*").single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create signing key");

  await sb.from("issuer_audit_events").insert({
    issuer_id: input.issuerId,
    action: "signing_key.created",
    actor_type: "admin",
    actor_id: input.actorId,
    metadata: { key_id: input.keyId },
  });

  return mapKey(data as Record<string, unknown>);
}

export async function revokeIssuerSigningKey(keyId: string, actorId: string): Promise<boolean> {
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();
  const { data } = await sb
    .from("issuer_signing_keys")
    .update({ status: "revoked", revoked_at: now })
    .eq("id", keyId)
    .select("issuer_id")
    .maybeSingle();

  if (!data) return false;

  await sb.from("issuer_audit_events").insert({
    issuer_id: data.issuer_id as string,
    action: "signing_key.revoked",
    actor_type: "admin",
    actor_id: actorId,
    metadata: { key_id: keyId },
  });

  return true;
}

export async function upsertPartnerIssuerTrustRule(input: {
  partnerId: string;
  policyId?: string | null;
  claimType: string;
  acceptedIssuerIds: string[];
  minimumAssuranceLevel?: AssuranceLevel | null;
  acceptedJurisdictions?: string[];
  credentialMaxAgeHours?: number | null;
}): Promise<PartnerIssuerTrustRule> {
  const sb = requireSupabaseAdmin();
  const { data: existing } = await sb
    .from("partner_issuer_trust_rules")
    .select("*")
    .eq("partner_id", input.partnerId)
    .eq("policy_id", input.policyId ?? null)
    .eq("claim_type", input.claimType)
    .maybeSingle();

  const payload = {
    partner_id: input.partnerId,
    policy_id: input.policyId ?? null,
    claim_type: input.claimType,
    accepted_issuer_ids: input.acceptedIssuerIds,
    minimum_assurance_level: input.minimumAssuranceLevel ?? null,
    accepted_jurisdictions: input.acceptedJurisdictions ?? [],
    credential_max_age_hours: input.credentialMaxAgeHours ?? null,
    status: "active",
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data } = await sb
      .from("partner_issuer_trust_rules")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    return mapTrustRule(data as Record<string, unknown>);
  }

  const { data, error } = await sb
    .from("partner_issuer_trust_rules")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create trust rule");
  return mapTrustRule(data as Record<string, unknown>);
}

function mapTrustRule(row: Record<string, unknown>): PartnerIssuerTrustRule {
  return {
    id: row.id as string,
    partner_id: row.partner_id as string,
    policy_id: (row.policy_id as string | null) ?? null,
    claim_type: row.claim_type as string,
    accepted_issuer_ids: (row.accepted_issuer_ids as string[]) ?? [],
    minimum_assurance_level: (row.minimum_assurance_level as AssuranceLevel | null) ?? null,
    accepted_jurisdictions: (row.accepted_jurisdictions as string[]) ?? [],
    credential_max_age_hours: (row.credential_max_age_hours as number | null) ?? null,
    status: row.status as string,
  };
}

export async function getTrustRulesForPolicy(
  partnerId: string,
  policyId: string,
): Promise<PartnerIssuerTrustRule[]> {
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from("partner_issuer_trust_rules")
      .select("*")
      .eq("partner_id", partnerId)
      .eq("status", "active")
      .or(`policy_id.eq.${policyId},policy_id.is.null`);
    return (data ?? []).map(r => mapTrustRule(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function isIssuerTrustedForClaim(input: {
  partnerId: string;
  policyId: string;
  claimType: string;
  issuerId: string;
  assuranceLevel: string | null;
  jurisdiction: string | null;
  issuedAt: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const issuer = await getIssuerById(input.issuerId);
  if (!issuer || issuer.issuer_status !== "active") {
    return { ok: false, reason: `issuer_untrusted:${input.issuerId}` };
  }
  if (!issuer.supported_claims.includes(input.claimType)) {
    return { ok: false, reason: `issuer_claim_scope:${input.claimType}` };
  }

  const rules = await getTrustRulesForPolicy(input.partnerId, input.policyId);
  const rule = rules.find(r => r.claim_type === input.claimType);

  if (rule && rule.accepted_issuer_ids.length > 0 && !rule.accepted_issuer_ids.includes(input.issuerId)) {
    return { ok: false, reason: `issuer_not_in_policy:${input.issuerId}` };
  }

  const minAssurance = rule?.minimum_assurance_level;
  if (minAssurance && input.assuranceLevel) {
    if (ASSURANCE_RANK[input.assuranceLevel as AssuranceLevel] < ASSURANCE_RANK[minAssurance]) {
      return { ok: false, reason: "insufficient_assurance" };
    }
  }

  if (rule?.accepted_jurisdictions?.length && input.jurisdiction) {
    const allowed = rule.accepted_jurisdictions;
    if (!allowed.includes("global") && !allowed.includes(input.jurisdiction)) {
      return { ok: false, reason: "jurisdiction_not_accepted" };
    }
  }

  if (rule?.credential_max_age_hours) {
    const ageMs = Date.now() - new Date(input.issuedAt).getTime();
    if (ageMs > rule.credential_max_age_hours * 3600000) {
      return { ok: false, reason: "credential_too_old" };
    }
  }

  return { ok: true };
}

export function issuerMeetsPolicyRule(
  issuer: TrustedIssuer | IssuerRecord,
  rule: {
    accepted_issuers?: string[];
    min_assurance?: AssuranceLevel;
  },
  claim: { assurance_level?: AssuranceLevel | null },
): boolean {
  const status = "issuer_status" in issuer
    ? issuer.issuer_status
    : (issuer.trust_status === "active" ? "active" : "pending");
  if (status !== "active") return false;
  if (rule.accepted_issuers?.length && !rule.accepted_issuers.includes(issuer.id)) return false;
  if (rule.min_assurance && claim.assurance_level) {
    if (ASSURANCE_RANK[claim.assurance_level] < ASSURANCE_RANK[rule.min_assurance]) return false;
  }
  return true;
}

export async function appendIssuerAuditEvent(input: {
  issuerId: string;
  action: string;
  actorType: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<void> {
  try {
    const sb = requireSupabaseAdmin();
    await sb.from("issuer_audit_events").insert({
      issuer_id: input.issuerId,
      action: input.action,
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      metadata: input.metadata ?? {},
      idempotency_key: input.idempotencyKey ?? null,
    });
  } catch {
    await appendAuditEvent({
      actor_type: input.actorType,
      actor_id: input.actorId,
      action: input.action,
      object_type: "issuer",
      object_id: input.issuerId,
      metadata: input.metadata,
    });
  }
}
