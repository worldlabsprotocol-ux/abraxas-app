import { describe, expect, it } from "vitest";
import { mapSandboxEnrollError } from "./mapSandboxEnrollError";

describe("mapSandboxEnrollError", () => {
  it("never returns raw internal codes", () => {
    const message = mapSandboxEnrollError("account_session_required");
    expect(message).not.toContain("account_session_required");
    expect(message.length).toBeGreaterThan(20);
  });
});
