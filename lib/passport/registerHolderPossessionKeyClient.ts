// FILE: lib/passport/registerHolderPossessionKeyClient.ts
// Register possession public key with server before committing private material locally.

export type PossessionKeyRegistrationOutcome =
  | { ok: true; publicKeyB64Url: string; secretKeyB64Url: string; rotated: boolean; issuance?: { credential_id?: string; deferred?: boolean; code?: string } }
  | { ok: false; code: string; httpStatus: number; preserveLocalKey: boolean };

export async function registerHolderPossessionKeyWithServer(input: {
  publicKeyB64Url: string;
  secretKeyB64Url: string;
  rotation?: { authorized: boolean; previousPublicKeyB64Url: string };
  fetchImpl?: typeof fetch;
}): Promise<PossessionKeyRegistrationOutcome> {
  const fetchFn = input.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchFn("/api/passport/reusable-credentials/possession-key", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_key_b64url: input.publicKeyB64Url,
        rotation:
          input.rotation?.authorized && input.rotation.previousPublicKeyB64Url
            ? {
                authorized: true,
                previous_public_key_b64url: input.rotation.previousPublicKeyB64Url,
              }
            : undefined,
      }),
    });
  } catch {
    const reconciled = await reconcileRegisteredPossessionPublicKey(fetchFn, input.publicKeyB64Url);
    if (reconciled === "registered") {
      return {
        ok: true,
        publicKeyB64Url: input.publicKeyB64Url,
        secretKeyB64Url: input.secretKeyB64Url,
        rotated: Boolean(input.rotation?.authorized),
      };
    }
    return { ok: false, code: "network_error", httpStatus: 0, preserveLocalKey: true };
  }

  let data: {
    error?: string;
    rotated?: boolean;
    issuance?: { credential_id?: string; deferred?: boolean; code?: string };
  };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    const reconciled = await reconcileRegisteredPossessionPublicKey(fetchFn, input.publicKeyB64Url);
    if (reconciled === "registered") {
      return {
        ok: true,
        publicKeyB64Url: input.publicKeyB64Url,
        secretKeyB64Url: input.secretKeyB64Url,
        rotated: Boolean(input.rotation?.authorized),
      };
    }
    return { ok: false, code: "invalid_response", httpStatus: res.status, preserveLocalKey: true };
  }

  if (!res.ok) {
    return {
      ok: false,
      code: data.error ?? "register_failed",
      httpStatus: res.status,
      preserveLocalKey: true,
    };
  }

  return {
    ok: true,
    publicKeyB64Url: input.publicKeyB64Url,
    secretKeyB64Url: input.secretKeyB64Url,
    rotated: Boolean(data.rotated),
    issuance: data.issuance,
  };
}

async function reconcileRegisteredPossessionPublicKey(
  fetchFn: typeof fetch,
  candidatePublicKeyB64Url: string,
): Promise<"registered" | "unknown"> {
  try {
    const res = await fetchFn("/api/passport/reusable-credentials/possession-key", {
      credentials: "include",
    });
    if (!res.ok) return "unknown";
    const body = (await res.json()) as { public_key_b64url?: string | null };
    if (body.public_key_b64url === candidatePublicKeyB64Url) return "registered";
    return "unknown";
  } catch {
    return "unknown";
  }
}
