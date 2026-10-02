// FILE: lib/provenance/provenanceSessionStore.ts
// Durable partner-flow context for artifact-bound provenance requests.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export interface ProvenanceSessionContext {
  verificationRequestId: string;
  partnerId: string;
  policyId: string;
  expectedContentHash: string | null;
  createdAt: string;
  expiresAt: string;
}

const TTL_MS = 30 * 60 * 1000;
const SESSIONS_TABLE = "provenance_flow_sessions";
const SUBMISSIONS_TABLE = "provenance_content_submissions";

const sessions = new Map<string, ProvenanceSessionContext>();
const submissions = new Map<string, { contentHash: string; expiresAt: string }>();

function skipDurableStore(): boolean {
  return Boolean(process.env.VITEST);
}

function isProductionRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function submissionKey(subjectId: string, policyId: string): string {
  return `${subjectId.trim().toLowerCase()}:${policyId.trim()}`;
}

export function resetProvenanceSessionsForTests(): void {
  sessions.clear();
  submissions.clear();
}

function sessionExpired(expiresAt: string, now = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= now;
}

export async function saveProvenanceSession(input: {
  verificationRequestId: string;
  partnerId: string;
  policyId: string;
  expectedContentHash?: string | null;
}): Promise<ProvenanceSessionContext> {
  const now = Date.now();
  const record: ProvenanceSessionContext = {
    verificationRequestId: input.verificationRequestId.trim(),
    partnerId: input.partnerId.trim(),
    policyId: input.policyId.trim(),
    expectedContentHash: input.expectedContentHash?.trim().toLowerCase() ?? null,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TTL_MS).toISOString(),
  };
  sessions.set(record.verificationRequestId, record);

  if (skipDurableStore()) return record;

  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(SESSIONS_TABLE).upsert({
      verification_request_id: record.verificationRequestId,
      partner_id: record.partnerId,
      policy_id: record.policyId,
      expected_content_hash: record.expectedContentHash,
      created_at: record.createdAt,
      expires_at: record.expiresAt,
    }, { onConflict: "verification_request_id" });
    if (error) throw error;
  } catch (error) {
    if (isProductionRuntime()) {
      throw Object.assign(new Error("provenance_session_unavailable"), { code: "schema_unavailable" });
    }
    console.warn("[provenance_session] durable persist failed:", error instanceof Error ? error.message : error);
  }

  return record;
}

export async function loadProvenanceSession(
  verificationRequestId: string,
): Promise<ProvenanceSessionContext | null> {
  const id = verificationRequestId.trim();
  const cached = sessions.get(id);
  if (cached) {
    if (sessionExpired(cached.expiresAt)) {
      sessions.delete(id);
      return null;
    }
    return cached;
  }

  if (skipDurableStore()) return null;

  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from(SESSIONS_TABLE)
      .select("*")
      .eq("verification_request_id", id)
      .maybeSingle();
    if (!data) return null;
    const record: ProvenanceSessionContext = {
      verificationRequestId: String(data.verification_request_id),
      partnerId: String(data.partner_id),
      policyId: String(data.policy_id),
      expectedContentHash: data.expected_content_hash ? String(data.expected_content_hash) : null,
      createdAt: String(data.created_at),
      expiresAt: String(data.expires_at),
    };
    if (sessionExpired(record.expiresAt)) {
      await sb.from(SESSIONS_TABLE).delete().eq("verification_request_id", id);
      return null;
    }
    sessions.set(id, record);
    return record;
  } catch {
    if (isProductionRuntime()) return null;
    return null;
  }
}

export async function saveProvenanceSubmission(input: {
  subjectId: string;
  policyId: string;
  contentHash: string;
}): Promise<void> {
  const key = submissionKey(input.subjectId, input.policyId);
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  const contentHash = input.contentHash.trim().toLowerCase();
  submissions.set(key, { contentHash, expiresAt });

  if (skipDurableStore()) return;

  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(SUBMISSIONS_TABLE).upsert({
      subject_id: input.subjectId.trim().toLowerCase(),
      policy_id: input.policyId.trim(),
      content_hash: contentHash,
      expires_at: expiresAt,
    }, { onConflict: "subject_id,policy_id" });
    if (error) throw error;
  } catch (error) {
    if (isProductionRuntime()) {
      throw Object.assign(new Error("provenance_submission_unavailable"), { code: "schema_unavailable" });
    }
    console.warn("[provenance_submission] durable persist failed:", error instanceof Error ? error.message : error);
  }
}

export async function loadProvenanceSubmission(input: {
  subjectId: string;
  policyId: string;
}): Promise<string | null> {
  const key = submissionKey(input.subjectId, input.policyId);
  const cached = submissions.get(key);
  if (cached) {
    if (sessionExpired(cached.expiresAt)) {
      submissions.delete(key);
      return null;
    }
    return cached.contentHash;
  }

  if (skipDurableStore()) return null;

  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from(SUBMISSIONS_TABLE)
      .select("content_hash, expires_at")
      .eq("subject_id", input.subjectId.trim().toLowerCase())
      .eq("policy_id", input.policyId.trim())
      .maybeSingle();
    if (!data) return null;
    const expiresAt = String(data.expires_at);
    if (sessionExpired(expiresAt)) {
      await sb.from(SUBMISSIONS_TABLE)
        .delete()
        .eq("subject_id", input.subjectId.trim().toLowerCase())
        .eq("policy_id", input.policyId.trim());
      return null;
    }
    const contentHash = String(data.content_hash);
    submissions.set(key, { contentHash, expiresAt });
    return contentHash;
  } catch {
    return null;
  }
}
