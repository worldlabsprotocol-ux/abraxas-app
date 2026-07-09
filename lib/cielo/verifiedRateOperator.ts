// FILE: lib/cielo/verifiedRateOperator.ts
// Operator actions, status transitions, and immutable event timeline.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import {
  type VerifiedRateOperatorStatus,
  VERIFIED_RATE_STATUSES,
} from "@/lib/cielo/verifiedRateLabels";

export type OperatorAction =
  | "mark_under_review"
  | "mark_eligible"
  | "confirm_contact_sent"
  | "decline";

const ACTION_TO_STATUS: Record<OperatorAction, VerifiedRateOperatorStatus> = {
  mark_under_review: "pending_review",
  mark_eligible: "eligible",
  confirm_contact_sent: "operator_confirmed",
  decline: "declined",
};

const ALLOWED_TRANSITIONS: Record<VerifiedRateOperatorStatus, VerifiedRateOperatorStatus[]> = {
  request_received: ["pending_review", "eligible", "declined"],
  pending_review: ["eligible", "declined"],
  eligible: ["operator_confirmed", "declined"],
  operator_confirmed: [],
  declined: [],
  not_eligible: [],
};

export interface OperatorNote {
  author: string;
  note: string;
  created_at: string;
}

export interface VerifiedRateRequestRow {
  id: string;
  public_reference: string;
  subject_sui_address: string;
  status: VerifiedRateOperatorStatus;
  eligibility_decision: string;
  policy_id: string;
  policy_version: number;
  verification_decision_id: string | null;
  consent_receipt_id: string | null;
  wallet_binding_id: string | null;
  check_in: string | null;
  check_out: string | null;
  guests: number | null;
  guest_name: string | null;
  contact_email: string | null;
  notes: string | null;
  reason_codes: string[];
  assigned_to: string | null;
  operator_notes: OperatorNote[];
  contacted_at: string | null;
  reviewed_at: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerifiedRateEventRow {
  id: string;
  actor_type: string;
  actor_id: string;
  prior_status: string | null;
  next_status: string;
  action: string;
  note: string | null;
  created_at: string;
}

function parseNotes(raw: unknown): OperatorNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (n): n is OperatorNote =>
      typeof n === "object" &&
      n !== null &&
      typeof (n as OperatorNote).author === "string" &&
      typeof (n as OperatorNote).note === "string",
  );
}

export function assertValidTransition(
  from: VerifiedRateOperatorStatus,
  to: VerifiedRateOperatorStatus,
): void {
  if (!VERIFIED_RATE_STATUSES.includes(from) || !VERIFIED_RATE_STATUSES.includes(to)) {
    throw new Error("Invalid status");
  }
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot transition from ${from} to ${to}`);
  }
}

export async function appendVerifiedRateEvent(input: {
  requestId: string;
  publicReference: string;
  actorType: "operator" | "system" | "subject";
  actorId: string;
  priorStatus: string | null;
  nextStatus: string;
  action: string;
  note?: string | null;
}): Promise<void> {
  const sb = requireSupabaseAdmin();
  const { error } = await sb.from("cielo_verified_rate_request_events").insert({
    request_id: input.requestId,
    public_reference: input.publicReference,
    actor_type: input.actorType,
    actor_id: input.actorId,
    prior_status: input.priorStatus,
    next_status: input.nextStatus,
    action: input.action,
    note: input.note ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function recordRequestReceivedEvent(input: {
  requestId: string;
  publicReference: string;
  subjectId: string;
}): Promise<void> {
  await appendVerifiedRateEvent({
    requestId: input.requestId,
    publicReference: input.publicReference,
    actorType: "subject",
    actorId: input.subjectId,
    priorStatus: null,
    nextStatus: "request_received",
    action: "request_submitted",
    note: "Verified-rate request submitted",
  });
}

export async function listVerifiedRateRequests(input?: {
  status?: VerifiedRateOperatorStatus;
  limit?: number;
}): Promise<VerifiedRateRequestRow[]> {
  const sb = requireSupabaseAdmin();
  let query = sb
    .from("cielo_verified_rate_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(input?.limit ?? 100);

  if (input?.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map(row => ({
    ...(row as VerifiedRateRequestRow),
    operator_notes: parseNotes((row as { operator_notes?: unknown }).operator_notes),
  }));
}

export async function getVerifiedRateRequestByRef(
  publicReference: string,
): Promise<(VerifiedRateRequestRow & { events: VerifiedRateEventRow[] }) | null> {
  const sb = requireSupabaseAdmin();
  const { data: row, error } = await sb
    .from("cielo_verified_rate_requests")
    .select("*")
    .eq("public_reference", publicReference)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return null;

  const { data: events } = await sb
    .from("cielo_verified_rate_request_events")
    .select("id, actor_type, actor_id, prior_status, next_status, action, note, created_at")
    .eq("public_reference", publicReference)
    .order("created_at", { ascending: true });

  return {
    ...(row as VerifiedRateRequestRow),
    operator_notes: parseNotes((row as { operator_notes?: unknown }).operator_notes),
    events: (events ?? []) as VerifiedRateEventRow[],
  };
}

export async function applyOperatorAction(input: {
  publicReference: string;
  action: OperatorAction;
  operatorId: string;
  assignedTo?: string;
  internalNote?: string;
  declineReason?: string;
}): Promise<VerifiedRateRequestRow> {
  const sb = requireSupabaseAdmin();
  const existing = await getVerifiedRateRequestByRef(input.publicReference);
  if (!existing) throw new Error("Request not found");

  const priorStatus = existing.status as VerifiedRateOperatorStatus;
  const nextStatus = ACTION_TO_STATUS[input.action];

  if (input.action === "decline" && !input.declineReason?.trim()) {
    throw new Error("Decline reason required");
  }

  assertValidTransition(priorStatus, nextStatus);

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: nextStatus,
    updated_at: now,
  };

  if (input.assignedTo?.trim()) {
    updates.assigned_to = input.assignedTo.trim();
  }

  if (input.action === "mark_under_review" || input.action === "mark_eligible") {
    updates.reviewed_at = now;
  }

  if (input.action === "confirm_contact_sent") {
    updates.contacted_at = now;
  }

  if (input.action === "decline") {
    updates.decided_at = now;
    updates.decision_reason = input.declineReason!.trim();
  }

  if (input.action === "mark_eligible") {
    updates.decided_at = now;
  }

  const notes = [...existing.operator_notes];
  if (input.internalNote?.trim()) {
    notes.push({
      author: input.operatorId,
      note: input.internalNote.trim(),
      created_at: now,
    });
    updates.operator_notes = notes;
  }

  const { data, error } = await sb
    .from("cielo_verified_rate_requests")
    .update(updates)
    .eq("public_reference", input.publicReference)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Update failed");

  const eventNote =
    input.action === "decline"
      ? input.declineReason!.trim()
      : input.internalNote?.trim() ?? null;

  await appendVerifiedRateEvent({
    requestId: existing.id,
    publicReference: input.publicReference,
    actorType: "operator",
    actorId: input.operatorId,
    priorStatus,
    nextStatus,
    action: input.action,
    note: eventNote,
  });

  await appendAuditEvent({
    actor_type: "operator",
    actor_id: input.operatorId,
    action: `cielo.verified_rate.${input.action}`,
    object_type: "cielo_verified_rate_request",
    object_id: input.publicReference,
    metadata: {
      prior_status: priorStatus,
      next_status: nextStatus,
      note: eventNote,
    },
  });

  if (nextStatus === "operator_confirmed" || nextStatus === "declined" || nextStatus === "eligible") {
    const { CIELO_RECORD_ID } = await import("@/lib/cielo/verifiedGuestPolicy");
    const publicMessage =
      nextStatus === "operator_confirmed"
        ? "Verified-rate request: operator contact confirmed"
        : nextStatus === "declined"
          ? "Verified-rate request: operator review complete"
          : "Verified-rate request: eligibility confirmed by operator";

    await sb.from("cielo_registry_public_events").insert({
      record_id: CIELO_RECORD_ID,
      event_type: "verified_rate_operator_update",
      message: publicMessage,
    });
  }

  return {
    ...(data as VerifiedRateRequestRow),
    operator_notes: parseNotes((data as { operator_notes?: unknown }).operator_notes),
  };
}
