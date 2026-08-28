// FILE: app/api/admin/design-partners/route.ts
// Admin review queue for design partner / relying party applications.

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import {
  buildNotesOnlyUpdatePayload,
  canNotesOnlyUpdate,
  parseDesignPartnerPatchRequestBody,
  type DesignPartnerApplicationRow,
  type DesignPartnerTransitionError,
} from "@/lib/admin/designPartnerApplicationLifecycle";
import {
  DESIGN_PARTNER_APPLICATION_SELECT_COLUMNS,
  mapDesignPartnerApplicationRows,
} from "@/lib/admin/designPartnerApplicationDetail";
import { invokeDesignPartnerReviewTransition } from "@/lib/admin/designPartnerReviewTransitionLoader";
import {
  buildDesignPartnerQueueKeysetOrFilter,
  encodeDesignPartnerQueueCursor,
  validateDesignPartnerQueueQuery,
} from "@/lib/admin/designPartnerApplicationQueueCursor";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const CLASSIFICATION_COLUMNS = "id, status, promoted_partner_id, reviewer_notes";

function errorResponse(error: DesignPartnerTransitionError | "invalid_actor_category" | "review_transition_failed", status: number) {
  return NextResponse.json({ error }, { status });
}

async function loadApplicationRow(
  sb: SupabaseClient,
  id: string,
): Promise<DesignPartnerApplicationRow | null> {
  const { data, error } = await sb
    .from("design_partners")
    .select(CLASSIFICATION_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as DesignPartnerApplicationRow;
}

async function attemptNotesOnlyUpdate(
  sb: SupabaseClient,
  id: string,
  row: DesignPartnerApplicationRow,
  requestedStatus: string,
  reviewerNotes: string | undefined,
): Promise<DesignPartnerApplicationRow | null> {
  if (!canNotesOnlyUpdate(row, requestedStatus)) return null;

  const payload = buildNotesOnlyUpdatePayload(reviewerNotes);
  if (!("reviewer_notes" in payload)) return null;

  const { data, error } = await sb
    .from("design_partners")
    .update(payload)
    .eq("id", id)
    .eq("status", row.status)
    .select(CLASSIFICATION_COLUMNS)
    .maybeSingle();

  if (error || !data) return null;
  return data as DesignPartnerApplicationRow;
}

async function patchOnboardedNotesOnly(
  sb: SupabaseClient,
  body: { id: string; reviewerNotes?: string },
): Promise<
  | { ok: true; application: DesignPartnerApplicationRow }
  | { ok: false; error: DesignPartnerTransitionError; status: number }
> {
  const row = await loadApplicationRow(sb, body.id);
  if (!row) {
    return { ok: false, error: "application_not_found", status: 404 };
  }
  if (!canNotesOnlyUpdate(row, "onboarded")) {
    if (row.promoted_partner_id) {
      return { ok: false, error: "application_already_promoted", status: 409 };
    }
    return { ok: false, error: "status_conflict", status: 409 };
  }
  const updated = await attemptNotesOnlyUpdate(sb, body.id, row, "onboarded", body.reviewerNotes);
  if (!updated) {
    return { ok: false, error: "status_conflict", status: 409 };
  }
  return { ok: true, application: updated };
}

function invalidInputResponse() {
  return NextResponse.json({ error: "Invalid request", code: "invalid_input" }, { status: 400 });
}

function invalidCursorResponse() {
  return NextResponse.json({ error: "Invalid request", code: "invalid_cursor" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const queryValidation = validateDesignPartnerQueueQuery(req.nextUrl.searchParams);
  if (!queryValidation.ok) {
    return queryValidation.code === "invalid_cursor"
      ? invalidCursorResponse()
      : invalidInputResponse();
  }

  const { status, limit, cursor } = queryValidation.value;
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  let query = sb
    .from("design_partners")
    .select(DESIGN_PARTNER_APPLICATION_SELECT_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (status === "submitted") {
    query = query.eq("status", "submitted");
  } else if (status === "approved") {
    query = query.eq("status", "approved").is("promoted_partner_id", null);
  } else if (status === "rejected") {
    query = query.eq("status", "rejected");
  } else if (status === "onboarded") {
    query = query.not("promoted_partner_id", "is", null);
  }

  if (cursor) {
    query = query.or(buildDesignPartnerQueueKeysetOrFilter(cursor.createdAt, cursor.id));
  }

  const { data, error } = await query.limit(limit + 1);
  if (error) {
    return NextResponse.json({ error: "status_conflict" }, { status: 500 });
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const applications = mapDesignPartnerApplicationRows(pageRows);
  const lastRow = pageRows[pageRows.length - 1] as { created_at?: unknown; id?: unknown } | undefined;
  const nextCursor = hasMore
    && lastRow
    && typeof lastRow.created_at === "string"
    && typeof lastRow.id === "string"
    ? encodeDesignPartnerQueueCursor(status, lastRow.created_at, lastRow.id)
    : null;

  return NextResponse.json({
    applications,
    next_cursor: nextCursor,
    has_more: hasMore,
  });
}

export async function PATCH(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const rawBody = await req.json().catch(() => null);
  const parsedBody = parseDesignPartnerPatchRequestBody(rawBody);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { id, status, reviewerNotes, reviewerNotesPresent } = parsedBody.value;
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

  if (status === "onboarded" && reviewerNotesPresent) {
    const result = await patchOnboardedNotesOnly(sb, { id, reviewerNotes });
    if (!result.ok) {
      return errorResponse(result.error, result.status);
    }
    return NextResponse.json({ application: result.application });
  }

  if (status === "approved" || status === "rejected") {
    const actorCategory = await resolveDesignPartnerAdminActorCategory(req);
    const result = await invokeDesignPartnerReviewTransition(sb, {
      applicationId: id,
      targetStatus: status,
      actorCategory,
      reviewerNotes,
      reviewerNotesPresent,
    });
    if (!result.ok) {
      return errorResponse(result.error, result.status);
    }
    return NextResponse.json({ application: result.application });
  }

  return NextResponse.json({ error: "invalid_input" }, { status: 400 });
}
