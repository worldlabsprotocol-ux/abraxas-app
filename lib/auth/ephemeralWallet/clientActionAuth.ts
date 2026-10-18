// FILE: lib/auth/ephemeralWallet/clientActionAuth.ts

import type { WalletActionOperation } from "./actionAuth";

export async function completeWalletActionAuthorization(input: {
  operation: WalletActionOperation;
  resource: string;
  policyId?: string;
  solanaNetwork?: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}): Promise<
  | { ok: true; action_challenge_id: string; signature: string }
  | { ok: false; code?: string }
> {
  const challengeRes = await fetch("/api/auth/wallet/solana/action/challenge", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operation: input.operation,
      resource: input.resource,
      policy_id: input.policyId,
      solana_network: input.solanaNetwork,
    }),
  });
  const challengeBody = (await challengeRes.json()) as {
    ok?: boolean;
    challenge?: { challenge_id: string; message: string };
    code?: string;
  };
  if (!challengeRes.ok || !challengeBody.challenge) {
    return { ok: false, code: challengeBody.code };
  }

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = await input.signMessage(new TextEncoder().encode(challengeBody.challenge.message));
  } catch {
    return { ok: false, code: "cancelled" };
  }

  return {
    ok: true,
    action_challenge_id: challengeBody.challenge.challenge_id,
    signature: Buffer.from(signatureBytes).toString("base64"),
  };
}
