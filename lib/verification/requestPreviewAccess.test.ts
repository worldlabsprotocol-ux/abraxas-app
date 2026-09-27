import { describe, expect, it } from "vitest";
import { requestPreviewMatchesSubject } from "./requestPreviewAccess";

const SUBJECT = "0x" + "a".repeat(64);
const OTHER = "0x" + "b".repeat(64);

describe("request preview holder binding", () => {
  it("allows unaddressed requests to be claimed by a signed-in holder", () => {
    expect(requestPreviewMatchesSubject({}, SUBJECT)).toBe(true);
  });

  it("allows a matching stored subject or wallet address", () => {
    expect(requestPreviewMatchesSubject({ subject_id: SUBJECT }, SUBJECT)).toBe(true);
    expect(requestPreviewMatchesSubject({ sui_address: SUBJECT }, SUBJECT)).toBe(true);
  });

  it("rejects a request addressed to another holder", () => {
    expect(requestPreviewMatchesSubject({ subject_id: OTHER }, SUBJECT)).toBe(false);
    expect(requestPreviewMatchesSubject({ sui_address: OTHER }, SUBJECT)).toBe(false);
    expect(requestPreviewMatchesSubject({ subject_id: SUBJECT, sui_address: OTHER }, SUBJECT)).toBe(false);
  });

  it("fails closed for malformed addresses", () => {
    expect(requestPreviewMatchesSubject({ sui_address: "not-an-address" }, SUBJECT)).toBe(false);
    expect(requestPreviewMatchesSubject({}, "not-an-address")).toBe(false);
  });
});
