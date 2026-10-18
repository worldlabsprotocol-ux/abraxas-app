// FILE: lib/auth/ephemeralWallet/walletTrustState.ts
// Connection vs authentication vs action authorization (protocol state model).

import type { NextRequest } from "next/server";
import { resolveEphemeralWalletSession, type EphemeralWalletSession } from "./walletSession";
import { getEphemeralSandboxForSession } from "./sandboxWorkspace";
import type { EphemeralWalletScope } from "./scopes";
import { resolveEphemeralRevocationMode, distributedReplayEnforced } from "./transientStatePolicy";

export type WalletTrustState = {
  wallet_connected: boolean;
  wallet_authenticated: boolean;
  capability_expires_at: string | null;
  scopes: EphemeralWalletScope[];
  wallet_address: string | null;
  solana_network: string | null;
  sandbox_workspace_active: boolean;
  revocation_mode: ReturnType<typeof resolveEphemeralRevocationMode>;
  distributed_replay_enforced: boolean;
  persistent_account: false;
  auth_mode: "ephemeral_wallet";
};

export async function resolveWalletTrustState(
  req: NextRequest,
  input?: { walletConnected?: boolean },
): Promise<{ state: WalletTrustState; session: EphemeralWalletSession | null }> {
  const session = await resolveEphemeralWalletSession(req);
  let sandboxActive = false;
  if (session) {
    const workspace = await getEphemeralSandboxForSession(session.sessionId);
    sandboxActive = Boolean(workspace);
  }

  return {
    session,
    state: {
      wallet_connected: Boolean(input?.walletConnected),
      wallet_authenticated: Boolean(session),
      capability_expires_at: null,
      scopes: session?.scopes ?? [],
      wallet_address: session?.walletAddress ?? null,
      solana_network: session?.solanaNetwork ?? null,
      sandbox_workspace_active: sandboxActive,
      revocation_mode: resolveEphemeralRevocationMode(),
      distributed_replay_enforced: distributedReplayEnforced(),
      persistent_account: false,
      auth_mode: "ephemeral_wallet",
    },
  };
}
