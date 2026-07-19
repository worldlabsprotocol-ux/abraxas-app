// FILE: lib/authenticationProof/signing.test.ts

import { describe, expect, it } from "vitest";
import { buildAuthProofPayload } from "./issue";
import { signAuthProofPayload, verifyAuthProofSignature } from "./signing";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";

describe("authenticationProof signing", () => {
  it("round-trips sign and verify with test key", () => {
    const testKey = generateTestSigningKeyPair();
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(testKey.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(testKey.publicKeyJwk);

    const payload = buildAuthProofPayload({
      eventType: "asset_inquiry",
      recordId: "rec-1",
      payloadHash: "a".repeat(64),
      proofId: "aprx_test123",
    });

    const signed = signAuthProofPayload(payload);
    expect(signed?.signature).toBeTruthy();
    expect(verifyAuthProofSignature(payload, signed!.signature)).toBe(true);

    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });
});
