import { describe, expect, it } from "vitest";
import { receiptExampleStatusLabel } from "./receiptDemoPublicCopy";

describe("receiptDemoPublicCopy", () => {
  it("maps scenarios to a single example status label", () => {
    expect(receiptExampleStatusLabel("valid")).toBe("Valid example");
    expect(receiptExampleStatusLabel("expired")).toBe("Expired example");
    expect(receiptExampleStatusLabel("revoked")).toBe("Revoked example");
    expect(receiptExampleStatusLabel("unavailable")).toBe("Unavailable example");
  });
});
