// FILE: lib/protocol/protocolStatus.test.ts

import { describe, expect, it } from "vitest";
import { protocolHealthLabel } from "./protocolStatusShared";

describe("protocolStatus", () => {
  it("maps health labels for public display", () => {
    expect(protocolHealthLabel("operational")).toBe("Operational");
    expect(protocolHealthLabel("degraded")).toBe("Degraded");
    expect(protocolHealthLabel("not_configured")).toBe("Not configured");
  });
});
