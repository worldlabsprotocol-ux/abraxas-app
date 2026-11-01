// FILE: lib/auth/bootstrapHostedHolderSession.ts
// Confirm a signed holder session against the server-bound hosted request.

export interface BootstrapHostedHolderInput {
  partnerId: string;
  policyId: string;
  returnUrl: string;
  purpose?: string | null;
  verifyRequestId?: string | null;
}

export async function bootstrapHostedHolderSession(
  input: BootstrapHostedHolderInput,
): Promise<{ ok: true; holderSubjectId: string } | { ok: false; error: string; ineligible?: boolean; signInRequired?: boolean }> {
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
      holder_subject_id?: string;
      code?: string;
    };
    if (res.status === 401) return { ok: false, error: "Sign in with your Solana wallet to continue.", signInRequired: true };
    if (res.status === 403 && data.code === "hosted_bootstrap_ineligible") {
      return { ok: false, error: "This verification link is unavailable.", ineligible: true };
    }
    if (!res.ok || data.ok !== true || !data.holder_subject_id) {
      return { ok: false, error: "Verification request could not be confirmed." };
    }
    return { ok: true, holderSubjectId: data.holder_subject_id };
  } catch {
    return { ok: false, error: "Verification request could not be confirmed." };
  }
}
