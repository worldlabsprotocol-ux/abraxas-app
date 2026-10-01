// FILE: lib/auth/bootstrapHostedHolderSession.ts
// Client helper — establish hosted holder session without Google OAuth redirect.

import { saveUserSession, type ZkLoginUserSession } from "@/lib/sui/zklogin/session";

export interface BootstrapHostedHolderInput {
  partnerId: string;
  policyId: string;
  returnUrl: string;
  purpose?: string | null;
  verifyRequestId?: string | null;
}

export async function bootstrapHostedHolderSession(
  input: BootstrapHostedHolderInput,
): Promise<{ ok: true; suiAddress: string } | { ok: false; error: string; ineligible?: boolean }> {
  try {
    const res = await fetch("/api/auth/hosted-holder/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        partner_id: input.partnerId,
        policy_id: input.policyId,
        return_url: input.returnUrl,
        purpose: input.purpose ?? undefined,
        verify_request: input.verifyRequestId ?? undefined,
      }),
    });

    const data = await res.json().catch(() => ({})) as {
      ok?: boolean;
      sui_address?: string;
      error?: string;
      code?: string;
    };

    if (res.status === 403 && data.code === "hosted_bootstrap_ineligible") {
      return { ok: false, error: data.error ?? "ineligible", ineligible: true };
    }

    if (!res.ok || !data.ok || !data.sui_address) {
      return { ok: false, error: data.error ?? `Bootstrap failed (${res.status})` };
    }

    const session: ZkLoginUserSession = {
      suiAddress: data.sui_address,
      provider: "abraxas_hosted",
      oauthSub: undefined,
      email: undefined,
      maxEpoch: 0,
      loggedInAt: new Date().toISOString(),
      sessionKind: "hosted",
    };
    saveUserSession(session);

    return { ok: true, suiAddress: data.sui_address };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}
