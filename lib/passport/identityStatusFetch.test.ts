import { describe, expect, it } from "vitest";
import { classifyIdentityStatusHttpStatus, IdentityStatusFetchError } from "./identityStatusFetch";

describe("identityStatusFetch", () => {
  it("classifies 401 as session_required", () => {
    expect(classifyIdentityStatusHttpStatus(401)).toBe("session_required");
  });

  it("exposes kind on IdentityStatusFetchError", () => {
    const err = new IdentityStatusFetchError("session_required", 401, "Sign in required");
    expect(err.kind).toBe("session_required");
    expect(err.httpStatus).toBe(401);
  });
});
