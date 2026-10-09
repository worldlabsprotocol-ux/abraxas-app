import { describe, expect, it } from "vitest";
import { hostedHandoffCreateErrorMessage } from "./launchpadCreateErrors";

describe("hostedHandoffCreateErrorMessage", () => {
  it("maps not_configured by code", () => {
    expect(hostedHandoffCreateErrorMessage(400, {
      ok: false,
      code: "not_configured",
      error: "Something went wrong. Try again.",
    })).toContain("Partner Flow configuration");
  });

  it("maps ambiguous binding", () => {
    expect(hostedHandoffCreateErrorMessage(409, {
      ok: false,
      code: "AMBIGUOUS_POLICY_BINDING",
      error: "Something went wrong. Try again.",
    })).toContain("Select which integration policy");
  });

  it("maps session expiry", () => {
    expect(hostedHandoffCreateErrorMessage(401, {
      ok: false,
      code: "launchpad_unauthorized",
      error: "Partner console sign in required",
    })).toContain("Sign in again");
  });
});
