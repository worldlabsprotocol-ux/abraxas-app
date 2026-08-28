// FILE: lib/admin/designPartnerLifecycleAuditLoader.ts
// Loader for design-partner lifecycle audit pages — existence check + v2 RPC only.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildDesignPartnerLifecycleAuditResponse,
  mapRpcEventToDto,
  parseDesignPartnerLifecycleAuditRpcEnvelope,
  serializeDesignPartnerLifecycleAuditResponse,
  type DesignPartnerLifecycleAuditResponse,
} from "@/lib/admin/designPartnerLifecycleAuditContract";
import {
  encodeDesignPartnerLifecycleAuditCursor,
  type DesignPartnerLifecycleAuditCursorPosition,
} from "@/lib/admin/designPartnerLifecycleAuditCursor";

export const DESIGN_PARTNER_LIFECYCLE_AUDIT_RPC_NAME = "design_partner_lifecycle_audit_list_v2";

export const FORBIDDEN_LIFECYCLE_AUDIT_QUERY_TABLES = [
  "audit_events",
] as const;

export type DesignPartnerLifecycleAuditLoaderError =
  | "supabase_not_configured"
  | "application_not_found"
  | "rpc_failed"
  | "invalid_rpc_envelope";

export function createLifecycleAuditSupabaseClient(
  url: string,
  key: string,
): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function assertDesignPartnerApplicationExists(
  sb: SupabaseClient,
  applicationId: string,
): Promise<boolean> {
  const { data, error } = await sb
    .from("design_partners")
    .select("id")
    .eq("id", applicationId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.id);
}

export async function loadDesignPartnerLifecycleAuditWithClient(
  sb: SupabaseClient,
  input: {
    applicationId: string;
    limit: number;
    cursor: DesignPartnerLifecycleAuditCursorPosition | null;
  },
): Promise<DesignPartnerLifecycleAuditResponse> {
  const exists = await assertDesignPartnerApplicationExists(sb, input.applicationId);
  if (!exists) {
    throw new Error("application_not_found");
  }

  const rpcArgs = {
    p_application_id: input.applicationId,
    p_limit: input.limit,
    p_cursor_occurred_at: input.cursor?.occurredAt ?? null,
    p_cursor_id: input.cursor?.id ?? null,
  };

  const { data, error } = await sb.rpc(DESIGN_PARTNER_LIFECYCLE_AUDIT_RPC_NAME, rpcArgs);
  if (error) {
    throw new Error("rpc_failed");
  }

  let envelope;
  try {
    envelope = parseDesignPartnerLifecycleAuditRpcEnvelope(data);
  } catch {
    throw new Error("invalid_rpc_envelope");
  }

  const events = envelope.events.map((event) => mapRpcEventToDto(event, input.applicationId));
  const nextCursor = envelope.next_cursor
    ? encodeDesignPartnerLifecycleAuditCursor(
      input.applicationId,
      envelope.next_cursor.occurred_at,
      envelope.next_cursor.id,
    )
    : null;

  const response = buildDesignPartnerLifecycleAuditResponse(
    input.applicationId,
    events,
    nextCursor,
  );

  return serializeDesignPartnerLifecycleAuditResponse(response);
}

export async function loadDesignPartnerLifecycleAudit(
  input: {
    applicationId: string;
    limit: number;
    cursor: DesignPartnerLifecycleAuditCursorPosition | null;
  },
): Promise<DesignPartnerLifecycleAuditResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    throw new Error("supabase_not_configured");
  }

  const sb = createLifecycleAuditSupabaseClient(url, key);
  return loadDesignPartnerLifecycleAuditWithClient(sb, input);
}

export function classifyLifecycleAuditLoaderError(
  error: unknown,
): { status: number; message: string } {
  const code = error instanceof Error ? error.message : "rpc_failed";
  if (code === "application_not_found") {
    return { status: 404, message: "Application not found" };
  }
  if (code === "supabase_not_configured") {
    return { status: 503, message: "Service temporarily unavailable" };
  }
  return { status: 500, message: "Service temporarily unavailable" };
}
