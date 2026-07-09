// FILE: lib/idv/identityVerificationDb.ts
// Persist identity verification state transitions (best-effort if columns exist).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CredentialStatus, IdentityVerificationStatus } from "./identityVerificationStates";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function idvSupabase(): SupabaseClient | null {
  if (!SB_URL || !SB_SERVICE) return null;
  return createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });
}

export interface IdentityVerificationRow {
  wallet_address?: string;
  sui_address?: string;
  user_email?: string | null;
  status?: string;
  identity_verification_status?: string | null;
  credential_status?: string | null;
  veriff_session_id?: string | null;
  veriff_decision_id?: string | null;
  credential_jti?: string | null;
  error_message?: string | null;
  last_verified_at?: string | null;
  credential_issued_at?: string | null;
  document_type?: string | null;
  document_country?: string | null;
  document_state?: string | null;
  document_verified?: boolean;
  liveness_passed?: boolean;
  liveness_provider?: string | null;
}

export async function transitionIdentityVerification(
  holder: string,
  patch: Partial<IdentityVerificationRow> & {
    identity_verification_status?: IdentityVerificationStatus;
    credential_status?: CredentialStatus;
  },
  source: string,
): Promise<void> {
  const sb = idvSupabase();
  if (!sb) return;

  const now = new Date().toISOString();
  const legacyStatus =
    patch.identity_verification_status === "approved" ? "approved"
    : patch.identity_verification_status === "declined" ? "revoked"
    : patch.identity_verification_status === "requires_resubmission" ? "pending"
    : patch.identity_verification_status === "in_progress" ||
      patch.identity_verification_status === "submitted" ||
      patch.identity_verification_status === "session_created"
      ? "pending"
    : undefined;

  const update: Record<string, unknown> = {
    ...patch,
    updated_at: now,
  };
  if (legacyStatus) update.status = legacyStatus;

  await sb.from("identity_verifications").upsert(
    {
      wallet_address: holder,
      sui_address: holder,
      ...update,
    },
    { onConflict: "wallet_address" },
  );

  if (patch.identity_verification_status) {
    await sb.from("identity_verification_events").insert({
      sui_address: holder,
      to_status: patch.identity_verification_status,
      source,
      veriff_session_id: patch.veriff_session_id ?? null,
      created_at: now,
    }).then(({ error }) => {
      if (error) {
        // Table may not exist yet — non-fatal
        console.warn("[idv] event log skipped:", error.message);
      }
    });
  }
}
