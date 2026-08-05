#!/usr/bin/env npx tsx
// FILE: scripts/partner-flow-trace-audit.ts
// Read-only production audit — correlate Partner Flow events by flow_trace_id.

import { createClient } from "@supabase/supabase-js";
import { auditPartnerFlowTrace } from "@/lib/partner/partnerFlowTraceAudit";

const flowTraceId = process.argv[2]?.trim();

if (!flowTraceId) {
  console.error("Usage: npm run audit:partner-flow-trace -- <flow_trace_id>");
  console.error("Example: npm run audit:partner-flow-trace -- ft_vr_00000000-0000-4000-8000-0000000000aa");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function main() {
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const result = await auditPartnerFlowTrace({
    flowTraceId,
    fetchEvents: async (traceId) => {
      const { data, error } = await sb
        .from("audit_events")
        .select("id, action, object_type, object_id, policy_id, policy_version, metadata, created_at")
        .eq("metadata->>flow_trace_id", traceId)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{
        id: string;
        action: string;
        object_type: string | null;
        object_id: string | null;
        policy_id: string | null;
        policy_version: number | null;
        metadata: Record<string, unknown>;
        created_at: string;
      }>;
    },
  });

  const ok = result.correlation_ok && result.sequence_ok && result.linkage_ok && result.pii_ok;

  console.log(JSON.stringify({
    flow_trace_id: result.flow_trace_id,
    status: ok ? "PASS" : "FAIL",
    event_count: result.event_count,
    correlation_ok: result.correlation_ok,
    sequence_ok: result.sequence_ok,
    linkage_ok: result.linkage_ok,
    pii_ok: result.pii_ok,
    issues: result.issues,
    events: result.events.map(e => ({
      created_at: e.created_at,
      action: e.action,
      object_type: e.object_type,
      object_id: e.object_id,
      outcome: e.metadata.outcome ?? null,
      replay_status: e.metadata.replay_status ?? null,
      decision_id: e.metadata.decision_id ?? null,
      receipt_id: e.metadata.receipt_id ?? null,
      verification_request_id: e.metadata.verification_request_id ?? null,
    })),
  }, null, 2));

  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
