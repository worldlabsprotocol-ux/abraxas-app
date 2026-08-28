// FILE: lib/admin/designPartnerReviewTransitionLoader.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DESIGN_PARTNER_REVIEW_TRANSITION_RPC,
  invokeDesignPartnerReviewTransition,
} from "@/lib/admin/designPartnerReviewTransitionLoader";

const APP_ID = "00000000-0000-4000-8000-000000000001";

function createRpcClient(rpcMock: ReturnType<typeof vi.fn>) {
  return { rpc: rpcMock } as never;
}

describe("invokeDesignPartnerReviewTransition", () => {
  const rpcMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls review transition RPC exactly once with server actor category", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        ok: true,
        code: "ok",
        application: {
          id: APP_ID,
          status: "approved",
          promoted_partner_id: null,
          reviewer_notes: null,
        },
        audit_event_id: "evt-should-not-leak",
      },
      error: null,
    });

    const result = await invokeDesignPartnerReviewTransition(createRpcClient(rpcMock), {
      applicationId: APP_ID,
      targetStatus: "approved",
      actorCategory: "admin_pin",
      reviewerNotesPresent: false,
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock.mock.calls[0]?.[0]).toBe(DESIGN_PARTNER_REVIEW_TRANSITION_RPC);
    expect(rpcMock.mock.calls[0]?.[1]).toEqual({
      p_application_id: APP_ID,
      p_target_status: "approved",
      p_actor_category: "admin_pin",
      p_reviewer_notes: null,
      p_reviewer_notes_present: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.application).toEqual({
        id: APP_ID,
        status: "approved",
        promoted_partner_id: null,
        reviewer_notes: null,
      });
      expect(result).not.toHaveProperty("audit_event_id");
    }
  });

  it("maps no_op and notes_only success codes", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        ok: true,
        code: "notes_only",
        application: {
          id: APP_ID,
          status: "approved",
          promoted_partner_id: null,
          reviewer_notes: "ops",
        },
      },
      error: null,
    });

    const result = await invokeDesignPartnerReviewTransition(createRpcClient(rpcMock), {
      applicationId: APP_ID,
      targetStatus: "approved",
      actorCategory: "admin_authorized_email",
      reviewerNotes: "ops",
      reviewerNotesPresent: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.code).toBe("notes_only");
      expect(result.application.reviewer_notes).toBe("ops");
    }
  });

  it("maps fixed RPC failure codes to stable errors", async () => {
    rpcMock.mockResolvedValueOnce({
      data: { ok: false, code: "application_already_promoted" },
      error: null,
    });

    const result = await invokeDesignPartnerReviewTransition(createRpcClient(rpcMock), {
      applicationId: APP_ID,
      targetStatus: "rejected",
      actorCategory: "admin_unknown",
      reviewerNotesPresent: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("application_already_promoted");
      expect(result.status).toBe(409);
    }
  });

  it("returns generic failure for transport errors", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "connection reset by peer" },
    });

    const result = await invokeDesignPartnerReviewTransition(createRpcClient(rpcMock), {
      applicationId: APP_ID,
      targetStatus: "approved",
      actorCategory: "admin_pin",
      reviewerNotesPresent: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("review_transition_failed");
      expect(result.status).toBe(500);
      expect(JSON.stringify(result)).not.toContain("connection");
    }
  });
});
