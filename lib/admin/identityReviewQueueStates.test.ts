import { describe, expect, it } from "vitest";
import { countPendingIdentityReviewSessions } from "@/lib/admin/identityReviewPendingCount";
import {
  identityReviewQueueHref,
  resolveIdentityReviewQueueTab,
} from "@/lib/admin/identityReviewQueueStates";

describe("identity review queue states", () => {
  it("resolves pending tab by default", () => {
    expect(resolveIdentityReviewQueueTab(null).id).toBe("pending");
    expect(resolveIdentityReviewQueueTab("accepted").id).toBe("approved");
    expect(resolveIdentityReviewQueueTab("resubmission_requested").id).toBe("resubmit");
    expect(resolveIdentityReviewQueueTab("rejected").id).toBe("rejected");
  });

  it("builds admin identity routes with status query", () => {
    expect(identityReviewQueueHref("pending")).toBe("/admin/identity?status=pending");
    expect(identityReviewQueueHref("approved")).toBe("/admin/identity?status=accepted");
  });
});

describe("countPendingIdentityReviewSessions", () => {
  it("counts distinct pending capture sessions without leaking row payloads", () => {
    const count = countPendingIdentityReviewSessions([
      { id: "a", capture_session_id: "sess-1", status: "submitted" },
      { id: "b", capture_session_id: "sess-1", status: "under_review" },
      { id: "c", capture_session_id: "sess-2", status: "submitted" },
      { id: "d", capture_session_id: null, status: "submitted" },
      { id: "e", capture_session_id: "sess-3", status: "accepted" },
    ]);
    expect(count).toBe(3);
  });
});
