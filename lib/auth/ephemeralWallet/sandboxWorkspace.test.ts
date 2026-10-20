// FILE: lib/auth/ephemeralWallet/sandboxWorkspace.test.ts

import { afterEach, describe, expect, it } from "vitest";
import {
  getEphemeralSandboxForSession,
  putEphemeralSandboxWorkspace,
  resetEphemeralSandboxStoreForTests,
  type EphemeralSandboxWorkspace,
} from "./sandboxWorkspace";

const TEST_ENV: Record<string, string> = {
  NODE_ENV: "test",
  VITEST: "true",
  ABRAXAS_EPHEMERAL_WALLET_AUTH: "1",
};

function sampleWorkspace(sessionId: string): EphemeralSandboxWorkspace {
  return {
    workspace_id: "esbx_test_workspace",
    wallet_address: "11111111111111111111111111111111",
    session_id: sessionId,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
}

describe("sandboxWorkspace memory backend", () => {
  afterEach(() => {
    resetEphemeralSandboxStoreForTests();
  });

  it("resolves workspace by session id after put", async () => {
    const sessionId = "sess_test_1";
    await putEphemeralSandboxWorkspace(sampleWorkspace(sessionId), undefined, TEST_ENV);
    const found = await getEphemeralSandboxForSession(sessionId, TEST_ENV);
    expect(found?.workspace_id).toBe("esbx_test_workspace");
  });

  it("returns null when session has no workspace", async () => {
    const found = await getEphemeralSandboxForSession("sess_missing", TEST_ENV);
    expect(found).toBeNull();
  });

  it("does not cross-resolve workspaces between sessions", async () => {
    await putEphemeralSandboxWorkspace(
      { ...sampleWorkspace("sess_holder_a"), workspace_id: "esbx_a" },
      undefined,
      TEST_ENV,
    );
    await putEphemeralSandboxWorkspace(
      { ...sampleWorkspace("sess_holder_b"), workspace_id: "esbx_b" },
      undefined,
      TEST_ENV,
    );
    const a = await getEphemeralSandboxForSession("sess_holder_a", TEST_ENV);
    const b = await getEphemeralSandboxForSession("sess_holder_b", TEST_ENV);
    expect(a?.workspace_id).toBe("esbx_a");
    expect(b?.workspace_id).toBe("esbx_b");
    expect(await getEphemeralSandboxForSession("sess_other", TEST_ENV)).toBeNull();
  });
});
