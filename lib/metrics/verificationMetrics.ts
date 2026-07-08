// FILE: lib/metrics/verificationMetrics.ts
// Live verification network stats from Supabase audit tables.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface VerificationNetworkMetrics {
  total_presentations: number;
  presentations_7d: number;
  presentations_30d: number;
  accepted_30d: number;
  rejected_30d: number;
  /** 0–100, null when no checks in window */
  success_rate_30d: number | null;
  unique_verifiers_30d: number;
  unique_verifiers_all_time: number;
  last_presentation_at: string | null;
  top_verifiers_30d: Array<{ verifier_id: string; total: number; accepted: number }>;
  credentials_issued_30d: number;
  manual_idv_pending: number;
  manual_idv_approved: number;
  data_available: boolean;
}

function sb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function aggregateVerifiers(
  rows: Array<{ verifier_id: string; accepted: boolean }>,
): { unique: number; top: VerificationNetworkMetrics["top_verifiers_30d"] } {
  const map = new Map<string, { total: number; accepted: number }>();
  for (const row of rows) {
    const id = row.verifier_id || "unknown";
    const cur = map.get(id) ?? { total: 0, accepted: 0 };
    cur.total += 1;
    if (row.accepted) cur.accepted += 1;
    map.set(id, cur);
  }
  const top = Array.from(map.entries())
    .map(([verifier_id, v]) => ({ verifier_id, total: v.total, accepted: v.accepted }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  return { unique: map.size, top };
}

export async function getVerificationNetworkMetrics(): Promise<VerificationNetworkMetrics> {
  const empty: VerificationNetworkMetrics = {
    total_presentations: 0,
    presentations_7d: 0,
    presentations_30d: 0,
    accepted_30d: 0,
    rejected_30d: 0,
    success_rate_30d: null,
    unique_verifiers_30d: 0,
    unique_verifiers_all_time: 0,
    last_presentation_at: null,
    top_verifiers_30d: [],
    credentials_issued_30d: 0,
    manual_idv_pending: 0,
    manual_idv_approved: 0,
    data_available: false,
  };

  const client = sb();
  if (!client) return empty;

  const now = Date.now();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalRes,
    weekRes,
    monthRowsRes,
    allVerifiersRes,
    lastRes,
    creds30Res,
    manualPendingRes,
    manualApprovedRes,
  ] = await Promise.all([
    client.from("credential_presentations").select("id", { count: "exact", head: true }),
    client.from("credential_presentations").select("id", { count: "exact", head: true }).gte("presented_at", since7d),
    client.from("credential_presentations").select("verifier_id, accepted, presented_at").gte("presented_at", since30d),
    client.from("credential_presentations").select("verifier_id"),
    client.from("credential_presentations").select("presented_at").order("presented_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("abraxas_credentials").select("jti", { count: "exact", head: true }).gte("issuance_date", since30d).is("revoked_at", null),
    client.from("passport_documents").select("id", { count: "exact", head: true }).eq("stamp_id", "identity").in("status", ["submitted", "under_review"]),
    client.from("passport_documents").select("id", { count: "exact", head: true }).eq("stamp_id", "identity").eq("status", "accepted"),
  ]);

  const monthRows = monthRowsRes.data ?? [];
  const accepted30 = monthRows.filter(r => r.accepted).length;
  const rejected30 = monthRows.length - accepted30;
  const { unique: unique30, top } = aggregateVerifiers(monthRows as Array<{ verifier_id: string; accepted: boolean }>);

  const allVerifierIds = new Set((allVerifiersRes.data ?? []).map(r => r.verifier_id || "unknown"));

  return {
    total_presentations: totalRes.count ?? 0,
    presentations_7d: weekRes.count ?? 0,
    presentations_30d: monthRows.length,
    accepted_30d: accepted30,
    rejected_30d: rejected30,
    success_rate_30d: monthRows.length > 0 ? Math.round((accepted30 / monthRows.length) * 100) : null,
    unique_verifiers_30d: unique30,
    unique_verifiers_all_time: allVerifierIds.size,
    last_presentation_at: lastRes.data?.presented_at ?? null,
    top_verifiers_30d: top,
    credentials_issued_30d: creds30Res.count ?? 0,
    manual_idv_pending: manualPendingRes.error ? 0 : (manualPendingRes.count ?? 0),
    manual_idv_approved: manualApprovedRes.error ? 0 : (manualApprovedRes.count ?? 0),
    data_available: true,
  };
}
