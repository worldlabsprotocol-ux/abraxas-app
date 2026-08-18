// FILE: scripts/demo/lib/expectedDemoSigningKeyThumbprint.ts
// Reviewed, non-secret SHA-256 thumbprint of the demo environment signing public JWK.
//
// Live apply remains disabled until this constant is set through a separately reviewed
// repository PR after a demo-only signing key exists. Do not commit private keys.
//
// Canonical form: SHA-256 hex of JSON {"crv":"Ed25519","kty":"OKP","x":"<base64url>"}.

/**
 * Reviewed demo signing public-key thumbprint.
 * `null` means live apply is not yet bootstrapped — fail closed before any DB work.
 */
export const EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT: string | null =
  "0c8516d0f341a7d717c5f4d1d8bf0d1e226b864b1ea066531af6223af4a3daf3";

export function isDemoSigningKeyBootstrapConfigured(): boolean {
  const value = EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT?.trim();
  return Boolean(value && /^[0-9a-f]{64}$/i.test(value));
}

export class DemoSigningKeyBootstrapError extends Error {
  readonly code = "demo_signing_key_not_configured" as const;

  constructor() {
    super(
      "Demo signing key bootstrap is not configured — live apply is disabled until a reviewed public thumbprint is committed",
    );
    this.name = "DemoSigningKeyBootstrapError";
  }
}

export function assertDemoSigningKeyBootstrapConfigured(): void {
  if (!isDemoSigningKeyBootstrapConfigured()) {
    throw new DemoSigningKeyBootstrapError();
  }
}
