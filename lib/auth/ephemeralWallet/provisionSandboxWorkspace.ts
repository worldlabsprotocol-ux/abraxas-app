// FILE: lib/auth/ephemeralWallet/provisionSandboxWorkspace.ts

import {
  createEphemeralSandboxWorkspaceId,
  getEphemeralSandboxForSession,
  putEphemeralSandboxWorkspace,
  type EphemeralSandboxWorkspace,
} from "./sandboxWorkspace";
import { EPHEMERAL_TTL } from "./retention";

export async function provisionEphemeralSandboxWorkspace(input: {
  sessionId: string;
  walletAddress: string;
}): Promise<{ workspace: EphemeralSandboxWorkspace; created: boolean }> {
  const existing = await getEphemeralSandboxForSession(input.sessionId);
  if (existing) {
    return { workspace: existing, created: false };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + EPHEMERAL_TTL.sandboxWorkspaceSec * 1000);
  const workspace: EphemeralSandboxWorkspace = {
    workspace_id: createEphemeralSandboxWorkspaceId(),
    wallet_address: input.walletAddress,
    session_id: input.sessionId,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };
  await putEphemeralSandboxWorkspace(workspace);
  return { workspace, created: true };
}
