// Software-protected Ed25519 custody (development / self-hosted NP only). Not hardware non-exportable.

import { INSTITUTIONAL_ED25519_KEY_SPEC } from "./contract";
import type { CustodyClient } from "./contract";

export type SoftwareEd25519Seed = Uint8Array;

export async function ed25519PublicJwkFromSeed(seed: SoftwareEd25519Seed): Promise<JsonWebKey> {
  if (seed.byteLength !== 32) throw new Error("ed25519_seed_must_be_32_bytes");
  const client = bindSoftwareEd25519Custody({ identityId: "derive", keyId: "derive", seed });
  const material = await client.getPublicKey();
  return { kty: "OKP", crv: "Ed25519", x: Buffer.from(material.publicKey).toString("base64url") };
}

export function bindSoftwareEd25519Custody(input: {
  identityId: string;
  keyId: string;
  seed: SoftwareEd25519Seed;
}): CustodyClient {
  const identityId = input.identityId.trim();
  const keyId = input.keyId.trim();
  const seed = Uint8Array.from(input.seed);
  if (seed.byteLength !== 32) throw new Error("ed25519_seed_must_be_32_bytes");
  return {
    identityId,
    keyId,
    async getPublicKey() {
      const { default: nacl } = await import("tweetnacl");
      const pair = nacl.sign.keyPair.fromSeed(seed);
      return { keySpec: INSTITUTIONAL_ED25519_KEY_SPEC, publicKey: pair.publicKey };
    },
    async signRawDigest(message) {
      const { default: nacl } = await import("tweetnacl");
      const pair = nacl.sign.keyPair.fromSeed(seed);
      return nacl.sign.detached(message, pair.secretKey);
    },
  };
}