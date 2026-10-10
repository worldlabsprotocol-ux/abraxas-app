// FILE: lib/cielo/verifiedGuestSolanaPolicy.test.ts

import { describe, expect, it } from "vitest";
import { CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID } from "@/lib/cielo/cieloSolanaPolicyIds";

describe("cielo-verified-guest-solana-v1", () => {
  it("uses a distinct policy id from immutable v1", () => {
    expect(CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID).toBe("cielo-verified-guest-solana-v1");
    expect(CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID).not.toBe("cielo-verified-guest-v1");
  });
});
