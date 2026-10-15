// FILE: lib/passport/reusableCredential/build567.possessionKey.test.ts

import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import {
  possessionKeysEqual,
  validateHolderPossessionPublicKeyB64Url,
} from "./holderPossessionKeyValidation";

describe("Build #567 holder possession public key validation", () => {
  it("accepts valid Ed25519 public keys", () => {
    const pair = nacl.sign.keyPair();
    const encoded = Buffer.from(pair.publicKey).toString("base64url");
    const result = validateHolderPossessionPublicKeyB64Url(encoded);
    expect(result.ok).toBe(true);
  });

  it("rejects malformed and wrong-length encodings", () => {
    expect(validateHolderPossessionPublicKeyB64Url("").ok).toBe(false);
    expect(validateHolderPossessionPublicKeyB64Url("not!!!base64").ok).toBe(false);
    expect(validateHolderPossessionPublicKeyB64Url("AAAA").ok).toBe(false);
  });

  it("compares possession keys in constant time semantics", () => {
    const pair = nacl.sign.keyPair();
    const a = Buffer.from(pair.publicKey).toString("base64url");
    const b = Buffer.from(pair.publicKey).toString("base64url");
    expect(possessionKeysEqual(a, b)).toBe(true);
  });
});
