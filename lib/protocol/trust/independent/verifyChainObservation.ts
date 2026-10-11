// Read-only Solana RPC observation for receipt commitments (Build #530).

import { Connection } from "@solana/web3.js";
import { verifyOnChainReceiptCommitment } from "@/lib/decisionReceipts/solanaCommitment/verify";
import { buildReceiptCommitmentDigest } from "@/lib/decisionReceipts/solanaCommitment/digest";
import type { ChainIdentity } from "@/lib/protocol/trust/independent/contract";

export type ChainObservationResult =
  | {
      status: "pass";
      evidence_sources: string[];
      confirmation_status: string;
      slot: number;
      rpc_url: string;
    }
  | {
      status: "blocked" | "fail" | "pending";
      reasons: string[];
      evidence_sources: string[];
    };

export async function observeReceiptCommitmentOnChain(input: {
  transactionSignature: string | null | undefined;
  receiptId: string;
  receiptPayloadHash: string;
  committerPubkey: string;
  chainIdentity: ChainIdentity;
}): Promise<ChainObservationResult> {
  const evidence_sources: string[] = [];
  if (!input.transactionSignature) {
    return {
      status: "blocked",
      reasons: ["chain_transaction_signature_missing"],
      evidence_sources,
    };
  }

  const expectedDigest = buildReceiptCommitmentDigest(input.receiptPayloadHash);
  const rpcUrls = input.chainIdentity.rpc_urls.filter(Boolean);
  if (rpcUrls.length === 0) {
    return {
      status: "blocked",
      reasons: ["chain_rpc_unconfigured"],
      evidence_sources,
    };
  }

  const primaryUrl = rpcUrls[0];
  const secondaryUrl = rpcUrls[1];
  evidence_sources.push(`solana_rpc:${primaryUrl}`);

  const primary = await verifyOnChainReceiptCommitment({
    transactionSignature: input.transactionSignature,
    expectedDigest,
    expectedReceiptId: input.receiptId,
    expectedCommitterPubkey: input.committerPubkey,
    expectedPayloadHash: input.receiptPayloadHash,
    connection: new Connection(primaryUrl, input.chainIdentity.confirmation_threshold),
    confirmationThreshold: input.chainIdentity.confirmation_threshold,
  });

  if (!primary.ok) {
    const pending = primary.reason === "confirmation_insufficient";
    return {
      status: pending ? "pending" : primary.reason === "rpc_unavailable" ? "blocked" : "fail",
      reasons: [`chain_primary_${primary.reason}`],
      evidence_sources,
    };
  }

  if (secondaryUrl) {
    evidence_sources.push(`solana_rpc:${secondaryUrl}`);
    const secondary = await verifyOnChainReceiptCommitment({
      transactionSignature: input.transactionSignature,
      expectedDigest,
      expectedReceiptId: input.receiptId,
      expectedCommitterPubkey: input.committerPubkey,
      expectedPayloadHash: input.receiptPayloadHash,
      connection: new Connection(secondaryUrl, input.chainIdentity.confirmation_threshold),
      confirmationThreshold: input.chainIdentity.confirmation_threshold,
    });
    if (!secondary.ok) {
      return {
        status: "fail",
        reasons: ["chain_rpc_disagreement", `chain_secondary_${secondary.reason}`],
        evidence_sources,
      };
    }
    if (secondary.slot !== primary.slot || secondary.memo_digest !== primary.memo_digest) {
      return {
        status: "fail",
        reasons: ["chain_rpc_disagreement"],
        evidence_sources,
      };
    }
  }

  return {
    status: "pass",
    evidence_sources,
    confirmation_status: primary.confirmation_status,
    slot: primary.slot,
    rpc_url: primaryUrl,
  };
}
