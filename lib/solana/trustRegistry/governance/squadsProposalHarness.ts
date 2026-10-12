import type { PublicKey } from "@solana/web3.js";

/** Off-chain Squads proposal lifecycle — not on-chain execution until EXECUTED. */
export type SquadsProposalLifecycleState =
  | "PROPOSED"
  | "APPROVED"
  | "EXECUTABLE"
  | "EXECUTED"
  | "FINALIZED"
  | "REJECTED";

export type SquadsMemberApproval = {
  member: string;
  approvedAtMs: number;
};

export type SquadsAcceptGovernanceProposal = {
  id: string;
  multisigPda: string;
  vaultPda: string;
  vaultIndex: number;
  transferSeq: bigint;
  threshold: number;
  members: string[];
  approvals: SquadsMemberApproval[];
  state: SquadsProposalLifecycleState;
  rejectionReason?: string;
  /** Set only after real on-chain execution (tx signature). */
  executionTxSignature?: string;
};

export type HarnessTransition =
  | { ok: true; state: SquadsProposalLifecycleState }
  | { ok: false; reason: string; state: SquadsProposalLifecycleState };

function memberSet(members: string[]): Set<string> {
  return new Set(members.map((m) => m.trim()).filter(Boolean));
}

export function createAcceptGovernanceProposal(params: {
  id: string;
  multisigPda: PublicKey | string;
  vaultPda: PublicKey | string;
  vaultIndex: number;
  transferSeq: bigint;
  threshold: number;
  members: string[];
  proposer: string;
}): SquadsAcceptGovernanceProposal {
  const members = Array.from(memberSet(params.members));
  if (params.threshold <= 0 || params.threshold > members.length) {
    throw new Error("invalid_multisig_threshold");
  }
  return {
    id: params.id,
    multisigPda: String(params.multisigPda),
    vaultPda: String(params.vaultPda),
    vaultIndex: params.vaultIndex,
    transferSeq: params.transferSeq,
    threshold: params.threshold,
    members,
    approvals: [],
    state: "PROPOSED",
  };
}

export function recordMemberApproval(
  proposal: SquadsAcceptGovernanceProposal,
  member: string,
  nowMs = Date.now(),
): HarnessTransition {
  if (proposal.state === "REJECTED" || proposal.state === "EXECUTED" || proposal.state === "FINALIZED") {
    return { ok: false, reason: "proposal_terminal", state: proposal.state };
  }
  if (!proposal.members.includes(member)) {
    return { ok: false, reason: "unauthorized_member", state: proposal.state };
  }
  if (proposal.approvals.some((a) => a.member === member)) {
    return { ok: false, reason: "duplicate_approval", state: proposal.state };
  }
  const approvals = [...proposal.approvals, { member, approvedAtMs: nowMs }];
  const approvalCount = approvals.length;
  let state: SquadsProposalLifecycleState = "PROPOSED";
  if (approvalCount >= proposal.threshold) {
    state = "EXECUTABLE";
  } else if (approvalCount > 0) {
    state = "APPROVED";
  }
  proposal.approvals = approvals;
  proposal.state = state;
  return { ok: true, state };
}

export function rejectProposal(proposal: SquadsAcceptGovernanceProposal, reason: string): HarnessTransition {
  if (proposal.state === "EXECUTED" || proposal.state === "FINALIZED") {
    return { ok: false, reason: "already_executed", state: proposal.state };
  }
  proposal.state = "REJECTED";
  proposal.rejectionReason = reason;
  return { ok: true, state: "REJECTED" };
}

export function assertExecutable(proposal: SquadsAcceptGovernanceProposal): HarnessTransition {
  if (proposal.state !== "EXECUTABLE") {
    return { ok: false, reason: "insufficient_approvals_or_not_proposed", state: proposal.state };
  }
  return { ok: true, state: proposal.state };
}

/** Marks on-chain execution evidence — caller must supply a real signature from RPC. */
export function markExecuted(
  proposal: SquadsAcceptGovernanceProposal,
  txSignature: string,
): HarnessTransition {
  const pre = assertExecutable(proposal);
  if (!pre.ok) return pre;
  if (!txSignature.trim()) {
    return { ok: false, reason: "missing_execution_signature", state: proposal.state };
  }
  proposal.executionTxSignature = txSignature.trim();
  proposal.state = "EXECUTED";
  return { ok: true, state: "EXECUTED" };
}

export function markFinalizedAfterIndependentVerify(
  proposal: SquadsAcceptGovernanceProposal,
): HarnessTransition {
  if (proposal.state !== "EXECUTED" || !proposal.executionTxSignature) {
    return { ok: false, reason: "execution_not_recorded", state: proposal.state };
  }
  proposal.state = "FINALIZED";
  return { ok: true, state: "FINALIZED" };
}

export function isSimulatedOnly(proposal: SquadsAcceptGovernanceProposal): boolean {
  return squadsProposalStateIsSimulated(proposal.state);
}

export function squadsProposalStateIsSimulated(state: SquadsProposalLifecycleState): boolean {
  return state !== "EXECUTED" && state !== "FINALIZED";
}
