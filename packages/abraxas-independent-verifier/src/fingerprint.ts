import { createHash } from "node:crypto";

export function publicEd25519JwkFingerprint(jwk: JsonWebKey): string | null {
  if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || typeof jwk.x !== "string" || !jwk.x) {
    return null;
  }
  return createHash("sha256")
    .update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x }))
    .digest("hex");
}
