// FILE: lib/auth/ephemeralWallet/provisionSandboxWorkspace.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import { provisionEphemeralSandboxWorkspace } from "./provisionSandboxWorkspace";
import { resetEphemeralSandboxStoreForTests } from "./sandboxWorkspace";

describe("provisionEphemeralSandboxWorkspace", () => {
  beforeEach(() => {
    resetEphemeralSandboxStoreForTests();
    process.env.ABRAXAS_EPHEMERAL_INTEGRATION_TEST = "1";
  });

  it("creates then resumes the same workspace for a session", async () => {
    const first = await provisionEphemeralSandboxWorkspace({
      sessionId: "sess_a",
      walletAddress: "11111111111111111111111111111112",
    });
    expect(first.created).toBe(true);
    const second = await provisionEphemeralSandboxWorkspace({
      sessionId: "sess_a",
      walletAddress: "11111111111111111111111111111112",
    });
    expect(second.created).toBe(false);
    expect(second.workspace.workspace_id).toBe(first.workspace.workspace_id);
  });
});
