import { describe, expect, it } from "vitest";
import { isPostgresUniqueViolation } from "./partnerFlowContinuationPostgresErrors";

describe("isPostgresUniqueViolation", () => {
  it("detects postgres 23505 unique violations", () => {
    expect(isPostgresUniqueViolation({
      code: "23505",
      message: 'duplicate key value violates unique constraint "idx_partner_flow_continuations_opaque_verify_request"',
    })).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isPostgresUniqueViolation({ code: "22P02", message: "invalid input syntax for type uuid" })).toBe(false);
  });
});
