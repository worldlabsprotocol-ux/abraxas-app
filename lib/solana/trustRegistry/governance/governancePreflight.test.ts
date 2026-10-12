import { describe, expect, it } from "vitest";
import { preflightNominateGovernance } from "@/lib/solana/trustRegistry/governance/governanceTransactions";
import { verifyMultisigDestination } from "@/lib/solana/trustRegistry/governance/verifiedMultisigDestinations";
import { Keypair } from "@solana/web3.js";

describe("governance preflight (Build #536)", () => {
  it("rejects nomination when no verified multisig destinations configured", () => {
    const dest = Keypair.generate().publicKey.toBase58();
    expect(verifyMultisigDestination(dest).ok).toBe(false);
    expect(preflightNominateGovernance({ newAuthority: dest, transferSeq: BigInt(1) }).ok).toBe(false);
  });

  it("allows nomination when env allowlist matches", () => {
    const kp = Keypair.generate();
    const dest = kp.publicKey.toBase58();
    const pre = preflightNominateGovernance({
      newAuthority: dest,
      transferSeq: BigInt(1),
      verifiedMultisigEnv: dest,
    });
    expect(pre.ok).toBe(true);
  });
});
