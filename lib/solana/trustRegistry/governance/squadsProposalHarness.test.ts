import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import {
  assertExecutable,
  createAcceptGovernanceProposal,
  isSimulatedOnly,
  markExecuted,
  markFinalizedAfterIndependentVerify,
  recordMemberApproval,
  rejectProposal,
} from "@/lib/solana/trustRegistry/governance/squadsProposalHarness";
import { deriveSquadsMultisigPda, deriveSquadsV4VaultPda } from "@/lib/solana/trustRegistry/governance/squadsV4Pda";

describe("Squads proposal harness (Build #537)", () => {
  const members = [Keypair.generate(), Keypair.generate(), Keypair.generate()].map((k) =>
    k.publicKey.toBase58(),
  );

  function sampleProposal() {
    const createKey = Keypair.generate().publicKey;
    const { multisigPda } = deriveSquadsMultisigPda(createKey);
    const { vaultPda } = deriveSquadsV4VaultPda(multisigPda, 0);
    return createAcceptGovernanceProposal({
      id: "prop-1",
      multisigPda,
      vaultPda,
      vaultIndex: 0,
      transferSeq: BigInt(1),
      threshold: 2,
      members,
      proposer: members[0],
    });
  }

  it("walks PROPOSED → APPROVED → EXECUTABLE → EXECUTED → FINALIZED", () => {
    const p = sampleProposal();
    expect(isSimulatedOnly(p)).toBe(true);
    expect(recordMemberApproval(p, members[0]).state).toBe("APPROVED");
    expect(recordMemberApproval(p, members[1]).state).toBe("EXECUTABLE");
    expect(assertExecutable(p).ok).toBe(true);
    expect(markExecuted(p, "5fakeSigForUnitTestOnly").state).toBe("EXECUTED");
    expect(markFinalizedAfterIndependentVerify(p).state).toBe("FINALIZED");
    expect(isSimulatedOnly(p)).toBe(false);
  });

  it("blocks execution with insufficient approvals", () => {
    const p = sampleProposal();
    recordMemberApproval(p, members[0]);
    expect(assertExecutable(p).ok).toBe(false);
    expect(markExecuted(p, "sig").ok).toBe(false);
  });

  it("rejects unauthorized member approval", () => {
    const p = sampleProposal();
    const outsider = Keypair.generate().publicKey.toBase58();
    expect(recordMemberApproval(p, outsider).ok).toBe(false);
  });

  it("supports REJECTED terminal state", () => {
    const p = sampleProposal();
    expect(rejectProposal(p, "compromised_operational_key").state).toBe("REJECTED");
    expect(recordMemberApproval(p, members[0]).ok).toBe(false);
  });
});
