// FILE: lib/admin/designPartnerReviewTransitionLoader.ts
// Server loader for design_partner_review_transition_atomic — strips internal RPC fields.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminActorCategory } from "@/lib/admin/adminActorCategory";
import {
  mapReviewRpcCodeToHttpStatus,
  mapReviewRpcCodeToTransitionError,
  parseReviewTransitionRpcResult,
  type DesignPartnerApplicationRow,
  type DesignPartnerTransitionError,
} from "@/lib/admin/designPartnerApplicationLifecycle";

export const DESIGN_PARTNER_REVIEW_TRANSITION_RPC = "design_partner_review_transition_atomic";

export type DesignPartnerReviewTransitionSuccessCode = "ok" | "no_op" | "notes_only";

export type DesignPartnerReviewTransitionResult =
  | {
    ok: true;
    code: DesignPartnerReviewTransitionSuccessCode;
    application: DesignPartnerApplicationRow;
  }
  | {
    ok: false;
    error: DesignPartnerTransitionError | "review_transition_failed" | "invalid_actor_category";
    status: number;
  };

export async function invokeDesignPartnerReviewTransition(
  sb: SupabaseClient,
  input: {
    applicationId: string;
    targetStatus: "approved" | "rejected";
    actorCategory: AdminActorCategory;
    reviewerNotes?: string;
    reviewerNotesPresent: boolean;
  },
): Promise<DesignPartnerReviewTransitionResult> {
  const { data, error } = await sb.rpc(DESIGN_PARTNER_REVIEW_TRANSITION_RPC, {
    p_application_id: input.applicationId,
    p_target_status: input.targetStatus,
    p_actor_category: input.actorCategory,
    p_reviewer_notes: input.reviewerNotesPresent ? (input.reviewerNotes ?? "") : null,
    p_reviewer_notes_present: input.reviewerNotesPresent,
  });

  if (error) {
    return { ok: false, error: "review_transition_failed", status: 500 };
  }

  const parsed = parseReviewTransitionRpcResult(data);
  if (parsed.ok && parsed.application) {
    return {
      ok: true,
      code: parsed.code as DesignPartnerReviewTransitionSuccessCode,
      application: parsed.application,
    };
  }

  if (parsed.code === "invalid_actor_category") {
    return {
      ok: false,
      error: "invalid_actor_category",
      status: mapReviewRpcCodeToHttpStatus(parsed.code),
    };
  }

  return {
    ok: false,
    error: mapReviewRpcCodeToTransitionError(parsed.code),
    status: mapReviewRpcCodeToHttpStatus(parsed.code),
  };
}
