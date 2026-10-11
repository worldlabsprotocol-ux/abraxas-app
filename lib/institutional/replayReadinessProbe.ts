// Probes real Postgres replay RPC readiness (hashes only — no production writes).

import { createClient } from "@supabase/supabase-js";

export type InstitutionalReplayReadiness = {
  configured: boolean;
  migration_139_function_present: boolean;
  migration_140_direct_insert_revoked: boolean | null;
  probe_result: "rpc_responded" | "schema_missing" | "unconfigured" | "probe_failed";
  consume_available: boolean;
  detail: string;
};

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function probeInstitutionalReplayReadiness(): Promise<InstitutionalReplayReadiness> {
  if (!SB_URL || !SB_KEY) {
    return {
      configured: false,
      migration_139_function_present: false,
      migration_140_direct_insert_revoked: null,
      probe_result: "unconfigured",
      consume_available: false,
      detail: "supabase_admin_unconfigured",
    };
  }

  const client = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const expiresAt = new Date(Date.now() + 60_000).toISOString();

  const { data, error } = await client.rpc("institutional_eligibility_consume_nonce", {
    p_partner_id: "__readiness_probe__",
    p_application_id: "",
    p_receipt_id: "__probe__",
    p_subject_scope_hash: "not-a-valid-hash",
    p_policy_id: "__probe__",
    p_policy_version: 1,
    p_action_scope_norm: "",
    p_nonce_hash: "not-a-valid-hash",
    p_expires_at: expiresAt,
  });

  if (error) {
    const message = String(error.message ?? "");
    const missing = message.includes("institutional_eligibility_consume_nonce") || error.code === "PGRST202";
    return {
      configured: true,
      migration_139_function_present: !missing,
      migration_140_direct_insert_revoked: null,
      probe_result: missing ? "schema_missing" : "probe_failed",
      consume_available: false,
      detail: missing ? "migration_139_not_applied" : "rpc_error",
    };
  }

  const payload = data as { ok?: boolean; code?: string };
  const responded = payload?.code === "invalid" || payload?.code === "expired";

  return {
    configured: true,
    migration_139_function_present: true,
    migration_140_direct_insert_revoked: null,
    probe_result: responded ? "rpc_responded" : "probe_failed",
    consume_available: responded,
    detail: String(payload?.code ?? "unknown"),
  };
}
