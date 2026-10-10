import { describe, expect, it } from "vitest";
import {
  buildBrowseFlowOwnershipCookieValue,
  parseBrowseFlowOwnershipFromDocumentCookie,
  BROWSE_FLOW_OWNERSHIP_COOKIE,
} from "./browseFlowOwnership.js";

const FLOW_ID = `gtb_${"a".repeat(64)}`;
const SECRET = "b".repeat(64);

describe("browseFlowOwnership cookie", () => {
  it("round-trips flow ownership for expected gtb flow id", () => {
    const value = buildBrowseFlowOwnershipCookieValue(FLOW_ID, SECRET);
    const cookie = `${BROWSE_FLOW_OWNERSHIP_COOKIE}=${encodeURIComponent(value)}; other=1`;
    const parsed = parseBrowseFlowOwnershipFromDocumentCookie(cookie, FLOW_ID);
    expect(parsed?.ownershipSecret).toBe(SECRET);
  });

  it("rejects purchase gtf_ flow id in browse cookie builder", () => {
    expect(buildBrowseFlowOwnershipCookieValue(`gtf_${"a".repeat(64)}`, SECRET)).toBe("");
  });

  it("rejects substituted flow id", () => {
    const value = buildBrowseFlowOwnershipCookieValue(FLOW_ID, SECRET);
    const cookie = `${BROWSE_FLOW_OWNERSHIP_COOKIE}=${encodeURIComponent(value)}`;
    expect(parseBrowseFlowOwnershipFromDocumentCookie(cookie, `gtb_${"c".repeat(64)}`)).toBeNull();
  });
});
