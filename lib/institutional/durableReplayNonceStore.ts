// Durable one-time institutional consume nonces — atomic first-writer-wins via Postgres RPC.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  InstitutionalReplayStoreUnavailableError,
  isInstitutionalReplaySchemaMissing,
} from "@/lib/institutional/errors";
import {
  institutionalReplayNonceExpiresAt,
  institutionalReplayNonceHash,
  institutionalSubjectScopeHash,
  normalizeActionScope,
  normalizeInstitutionalReplayNonce,
} from "@/lib/institutional/replayKeyDerivation";

export type InstitutionalReplayConsumeResult =
  | { ok: true; code: "consumed" }
  | { ok: false; code: "replayed" | "invalid" | "expired" };

export async function consumeInstitutionalDurableReplayNonce(input: {
  partnerId: string;
  applicationId: string | null;
  receiptId: string;
  subjectPseudonymId: string;
  policyId: string;
  policyVersion: number;
  actionScope?: string | null;
  nonce: string;
  expiresAtIso?: string;
}): Promise<InstitutionalReplayConsumeResult> {
  const nonce = normalizeInstitutionalReplayNonce(input.nonce);
  if (!nonce) return { ok: false, code: "invalid" };

  const partner = input.partnerId.trim();
  const receiptId = input.receiptId.trim();
  const policyId = input.policyId.trim();
  if (!partner || !receiptId || !policyId) return { ok: false, code: "invalid" };

  const subjectScopeHash = institutionalSubjectScopeHash(input.subjectPseudonymId);
  const actionScopeNorm = normalizeActionScope(input.actionScope);
  const nonceHash = institutionalReplayNonceHash({
    partnerId: partner,
    applicationId: input.applicationId,
    receiptId,
    subjectScopeHash,
    policyId,
    policyVersion: input.policyVersion,
    actionScopeNorm,
    nonce,
  });

  let sb;
  try {
    sb = requireSupabaseAdmin();
  } catch {
    throw new InstitutionalReplayStoreUnavailableError();
  }

  const expiresAt = input.expiresAtIso ?? institutionalReplayNonceExpiresAt();

  const { data, error } = await sb.rpc("institutional_eligibility_consume_nonce", {
    p_partner_id: partner,
    p_application_id: input.applicationId ?? "",
    p_receipt_id: receiptId,
    p_subject_scope_hash: subjectScopeHash,
    p_policy_id: policyId,
    p_policy_version: input.policyVersion,
    p_action_scope_norm: actionScopeNorm,
    p_nonce_hash: nonceHash,
    p_expires_at: expiresAt,
  });

  if (isInstitutionalReplaySchemaMissing(error) || error) {
    throw new InstitutionalReplayStoreUnavailableError();
  }

  const payload = data as { ok?: boolean; code?: string };
  if (payload?.ok) return { ok: true, code: "consumed" };
  const code = String(payload?.code ?? "invalid");
  if (code === "replayed" || code === "expired") return { ok: false, code };
  return { ok: false, code: "invalid" };
}
