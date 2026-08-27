// FILE: app/api/admin/design-partners/route.ts
// Admin review queue for design partner / relying party applications.

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import {
  buildNotesOnlyUpdatePayload,
  buildTransitionUpdatePayload,
  canNotesOnlyUpdate,
  classifyTransitionFailure,
  transitionFromStatuses,
  type DesignPartnerApplicationRow,
  type DesignPartnerTransitionError,
} from "@/lib/admin/designPartnerApplicationLifecycle";
import {
  DESIGN_PARTNER_APPLICATION_SELECT_COLUMNS,
  mapDesignPartnerApplicationRows,
} from "@/lib/admin/designPartnerApplicationDetail";
import {
  buildDesignPartnerQueueKeysetOrFilter,
  encodeDesignPartnerQueueCursor,
  validateDesignPartnerQueueQuery,
} from "@/lib/admin/designPartnerApplicationQueueCursor";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const CLASSIFICATION_COLUMNS = "id, status, promoted_partner_id, reviewer_notes";

function errorResponse(error: DesignPartnerTransitionError, status: number) {
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

async function attemptTransition(
  sb: SupabaseClient,
  id: string,
  nextStatus: "approved" | "rejected",
  reviewerNotes?: string,
): Promise<DesignPartnerApplicationRow | null> {
  for (const fromStatus of transitionFromStatuses(nextStatus)) {
    const { data, error } = await sb
      .from("design_partners")
      .update(buildTransitionUpdatePayload(nextStatus, reviewerNotes))
      .eq("id", id)
      .eq("status", fromStatus)
      .is("promoted_partner_id", null)
      .select(CLASSIFICATION_COLUMNS)
      .maybeSingle();

    if (!error && data) {
      return data as DesignPartnerApplicationRow;
    }
  }

  return null;
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

async function patchDesignPartner(
  sb: SupabaseClient,
  body: { id: string; status: string; reviewer_notes?: string },
): Promise<
  | { ok: true; application: DesignPartnerApplicationRow; noOp?: boolean }
  | { ok: false; error: DesignPartnerTransitionError; status: number }
> {
  const hasReviewerNotesKey = "reviewer_notes" in body;

  if (body.status === "onboarded" && hasReviewerNotesKey) {
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
    const updated = await attemptNotesOnlyUpdate(sb, body.id, row, "onboarded", body.reviewer_notes);
    if (!updated) {
      return { ok: false, error: "status_conflict", status: 409 };
    }
    return { ok: true, application: updated };
  }

  if (body.status === "approved" || body.status === "rejected") {
    const transitioned = await attemptTransition(
      sb,
      body.id,
      body.status,
      hasReviewerNotesKey ? body.reviewer_notes : undefined,
    );
    if (transitioned) {
      return { ok: true, application: transitioned };
    }

    const row = await loadApplicationRow(sb, body.id);
    if (!row) {
      return { ok: false, error: "application_not_found", status: 404 };
    }

    const classification = classifyTransitionFailure(row, body.status, hasReviewerNotesKey);
    if (classification === "no_op") {
      return { ok: true, application: row, noOp: true };
    }
    if (classification === "notes_only") {
      const updated = await attemptNotesOnlyUpdate(sb, body.id, row, body.status, body.reviewer_notes);
      if (!updated) {
        return { ok: false, error: "status_conflict", status: 409 };
      }
      return { ok: true, application: updated };
    }
    if (classification === "application_already_promoted") {
      return { ok: false, error: "application_already_promoted", status: 409 };
    }
    return { ok: false, error: "status_conflict", status: 409 };
  }

  return { ok: false, error: "invalid_input", status: 400 };
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

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    reviewer_notes?: string;
  };

  if (!body.id || !body.status) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const result = await patchDesignPartner(sb, {
    id: body.id,
    status: body.status,
    ...( "reviewer_notes" in body ? { reviewer_notes: body.reviewer_notes } : {}),
  });

  if (!result.ok) {
    return errorResponse(result.error, result.status);
  }

  return NextResponse.json({ application: result.application });
}
