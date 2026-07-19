// FILE: lib/assetMonitoring/stateChangeProof.test.ts

import { describe, expect, it } from "vitest";
import { issueAssetStateChangeProof } from "./stateChangeProof";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";

describe("issueAssetStateChangeProof", () => {
  it("issues asset_state_change authentication proof", async () => {
    const testKey = generateTestSigningKeyPair();
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(testKey.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(testKey.publicKeyJwk);

    const proof = await issueAssetStateChangeProof({
      signal: {
        assetId: "ABX-RE-LAND-006",
        signalType: "listing_status_change",
        observedAt: "2026-07-19T00:00:00.000Z",
        source: "test",
        detail: "Lot 4 under contract",
      },
      decision: {
        action: "review",
        claimStatus: "under_review",
        reasonCode: "asset.listing_status_change",
        summary: "Listing changed",
        failClosed: true,
      },
      changedBy: "test",
    });

    expect(proof.event_type).toBe("asset_state_change");
    expect(proof.proof_id).toMatch(/^aprx_/);
    expect(proof.verify_url).toContain(proof.proof_id);
    expect(proof.prior_proofs_marked).toBe(0);

    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });
});
