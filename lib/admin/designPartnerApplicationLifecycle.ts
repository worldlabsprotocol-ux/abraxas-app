// FILE: lib/admin/designPartnerApplicationLifecycle.ts
// Server-side design partner application status transitions and promotion guards.

import { generatePartnerKey } from "@/lib/partner/partnerAuth";

export const DESIGN_PARTNER_STATUSES = [
  "submitted",
  "approved",
  "rejected",
  "onboarded",
] as const;

export type DesignPartnerStatus = (typeof DESIGN_PARTNER_STATUSES)[number];

export type DesignPartnerTransitionError =
  | "application_not_found"
  | "application_not_promotable"
  | "application_rejected"
  | "application_already_promoted"
  | "status_conflict"
  | "invalid_input";

export type DesignPartnerPromoteRpcCode =
  | "ok"
  | "invalid_input"
  | "application_not_found"
  | "application_not_promotable"
  | "application_rejected"
  | "application_already_promoted"
  | "partner_id_conflict"
  | "key_insert_failed"
  | "promotion_failed";

export interface DesignPartnerApplicationRow {
  id: string;
  status: string;
  promoted_partner_id: string | null;
  reviewer_notes?: string | null;
}

export const PARTNER_ID_MAX_LENGTH = 128;
const PARTNER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

/** Matches generatePartnerKey("test").prefix — raw.slice(0, 16) where raw is abx_test_ + 24 base64url chars. */
export const SANDBOX_KEY_PREFIX_LENGTH = 16;
export const SANDBOX_KEY_PREFIX_PATTERN = /^abx_test_[A-Za-z0-9_-]{7}$/;

const KEY_HASH_PATTERN = /^[a-f0-9]{64}$/;

const TRANSITION_FROM: Record<"approved" | "rejected", DesignPartnerStatus[]> = {
  approved: ["submitted"],
  rejected: ["submitted", "approved"],
};

const NOTES_ONLY_STATUSES: DesignPartnerStatus[] = ["approved", "rejected", "onboarded"];

export function isValidPartnerId(partnerId: string): boolean {
  const trimmed = partnerId.trim();
  if (!trimmed || trimmed.length > PARTNER_ID_MAX_LENGTH) return false;
  return PARTNER_ID_PATTERN.test(trimmed);
}

export function isValidSandboxKeyPrefix(prefix: string): boolean {
  return prefix.length === SANDBOX_KEY_PREFIX_LENGTH && SANDBOX_KEY_PREFIX_PATTERN.test(prefix);
}

export function isValidPartnerKeyHash(hash: string): boolean {
  return KEY_HASH_PATTERN.test(hash);
}

export function normalizeReviewerNotes(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildTransitionUpdatePayload(
  nextStatus: "approved" | "rejected",
  reviewerNotes?: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    status: nextStatus,
    reviewed_at: new Date().toISOString(),
  };
  if (reviewerNotes !== undefined) {
    payload.reviewer_notes = normalizeReviewerNotes(reviewerNotes);
  }
  return payload;
}

export function buildNotesOnlyUpdatePayload(
  reviewerNotes: string | undefined,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (reviewerNotes !== undefined) {
    payload.reviewer_notes = normalizeReviewerNotes(reviewerNotes);
  }
  return payload;
}

export function canNotesOnlyUpdate(
  row: DesignPartnerApplicationRow,
  requestedStatus: string,
): boolean {
  if (row.status !== requestedStatus) return false;
  if (!NOTES_ONLY_STATUSES.includes(requestedStatus as DesignPartnerStatus)) return false;
  if (requestedStatus === "onboarded") {
    return Boolean(row.promoted_partner_id);
  }
  return !row.promoted_partner_id;
}

export function classifyTransitionFailure(
  row: DesignPartnerApplicationRow,
  requestedStatus: "approved" | "rejected",
  hasReviewerNotesKey: boolean,
): DesignPartnerTransitionError | "no_op" | "notes_only" {
  if (row.promoted_partner_id || row.status === "onboarded") {
    return "application_already_promoted";
  }

  if (row.status === requestedStatus) {
    return hasReviewerNotesKey ? "notes_only" : "no_op";
  }

  if (row.status === "rejected") {
    return "status_conflict";
  }

  return "status_conflict";
}

export function transitionFromStatuses(
  requestedStatus: "approved" | "rejected",
): DesignPartnerStatus[] {
  return TRANSITION_FROM[requestedStatus];
}

export function mapPromoteRpcCodeToHttpStatus(code: DesignPartnerPromoteRpcCode): number {
  switch (code) {
    case "ok":
      return 200;
    case "application_not_found":
      return 404;
    case "invalid_input":
    case "application_not_promotable":
    case "application_rejected":
    case "application_already_promoted":
    case "partner_id_conflict":
    case "key_insert_failed":
      return 409;
    default:
      return 500;
  }
}

export function parsePromoteRpcResult(data: unknown): {
  ok: boolean;
  code: DesignPartnerPromoteRpcCode;
  application_id?: string;
  partner_id?: string;
  key_prefix?: string;
} {
  if (!data || typeof data !== "object") {
    return { ok: false, code: "promotion_failed" };
  }
  const row = data as Record<string, unknown>;
  const code = typeof row.code === "string" ? row.code as DesignPartnerPromoteRpcCode : "promotion_failed";
  if (row.ok === true && code === "ok") {
    return {
      ok: true,
      code: "ok",
      application_id: typeof row.application_id === "string" ? row.application_id : undefined,
      partner_id: typeof row.partner_id === "string" ? row.partner_id : undefined,
      key_prefix: typeof row.key_prefix === "string" ? row.key_prefix : undefined,
    };
  }
  return { ok: false, code };
}

export function validatePromoteRpcInputs(input: {
  applicationId: string;
  partnerId: string;
  keyPrefix: string;
  keyHash: string;
}): DesignPartnerPromoteRpcCode | null {
  if (!input.applicationId.trim()) return "invalid_input";
  if (!isValidPartnerId(input.partnerId)) return "invalid_input";
  if (!isValidSandboxKeyPrefix(input.keyPrefix)) return "invalid_input";
  if (!isValidPartnerKeyHash(input.keyHash)) return "invalid_input";
  return null;
}

export function createSandboxPromotionKeyMaterial(): { raw: string; prefix: string; hash: string } {
  return generatePartnerKey("test");
}

export function assertSandboxKeyPrefixMatchesGenerator(prefix: string, raw: string): boolean {
  return prefix === raw.slice(0, SANDBOX_KEY_PREFIX_LENGTH);
}
