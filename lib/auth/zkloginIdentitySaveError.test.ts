import { describe, expect, it } from "vitest";
import { classifyZkLoginIdentitySaveError } from "./zkloginIdentitySaveError";

describe("classifyZkLoginIdentitySaveError", () => {
  it("maps 42501 to identity_save_permission_denied", () => {
    expect(classifyZkLoginIdentitySaveError({ code: "42501" }))
      .toBe("identity_save_permission_denied");
  });

  it("maps 23505 to identity_save_unique_violation", () => {
    expect(classifyZkLoginIdentitySaveError({ code: "23505" }))
      .toBe("identity_save_unique_violation");
  });

  it("defaults unknown codes to identity_save_failed", () => {
    expect(classifyZkLoginIdentitySaveError({ code: "XX000" }))
      .toBe("identity_save_failed");
  });
});
