// FILE: lib/passport/passportPresentationState.test.ts

import { describe, expect, it } from "vitest";
import { mapPassportPresentationState } from "@/lib/passport/passportPresentationState";

describe("mapPassportPresentationState", () => {
  it("does not mark wallet login as verified", () => {
    expect(mapPassportPresentationState({
      identityStatus: "not_started",
      credentialStatus: "not_issued",
    })).toBe("NOT_STARTED");
  });

  it("maps approved active credential to VERIFIED", () => {
    expect(mapPassportPresentationState({
      identityStatus: "approved",
      credentialStatus: "active",
    })).toBe("VERIFIED");
  });
});
