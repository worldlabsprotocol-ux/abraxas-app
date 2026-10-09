import { describe, expect, it } from "vitest";
import {
  buildFlowOwnershipCookieValue,
  parseFlowOwnershipFromDocumentCookie,
  PURCHASE_FLOW_OWNERSHIP_COOKIE,
} from "./purchaseFlowOwnership.js";

const FLOW_ID = `gtf_${"a".repeat(64)}`;
const SECRET = "b".repeat(64);

describe("purchaseFlowOwnership cookie", () => {
  it("round-trips flow ownership for expected flow id", () => {
    const value = buildFlowOwnershipCookieValue(FLOW_ID, SECRET);
    const cookie = `${PURCHASE_FLOW_OWNERSHIP_COOKIE}=${encodeURIComponent(value)}; other=1`;
    const parsed = parseFlowOwnershipFromDocumentCookie(cookie, FLOW_ID);
    expect(parsed?.ownershipSecret).toBe(SECRET);
  });

  it("rejects substituted flow id", () => {
    const value = buildFlowOwnershipCookieValue(FLOW_ID, SECRET);
    const cookie = `${PURCHASE_FLOW_OWNERSHIP_COOKIE}=${encodeURIComponent(value)}`;
    expect(parseFlowOwnershipFromDocumentCookie(cookie, `gtf_${"c".repeat(64)}`)).toBeNull();
  });
});
