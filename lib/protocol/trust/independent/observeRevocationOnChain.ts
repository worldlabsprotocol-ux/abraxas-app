import { Connection } from "@solana/web3.js";
import { verifyOnChainRevocationMemo } from "@/lib/decisionReceipts/solanaCommitment/verifyRevocationMemo";
import type { ChainIdentity } from "@/lib/protocol/trust/independent/contract";

export type RevocationObservationRequest = {
  transactionSignature: string;
  targetCommitmentDigest: string;
  policyCommitmentHash: string;
  authorizedRevokerPubkeys: string[];
};

export type RevocationObservationResult =
  | {
      status: "pass";
      slot: number;
      sequence: number;
      action: "revoke" | "supersede";
      evidence_sources: string[];
    }
  | {
      status: "pending" | "fail" | "blocked";
      reasons: string[];
      evidence_sources: string[];
    };

export async function observeRevocationEventsOnChain(input: {
  observations: RevocationObservationRequest[];
  chainIdentity: ChainIdentity;
}): Promise<{
  authoritative: RevocationObservationResult | null;
  results: RevocationObservationResult[];
}> {
  const evidence_sources: string[] = [];
  const rpcUrls = input.chainIdentity.rpc_urls.filter(Boolean);
  if (rpcUrls.length === 0) {
    return {
      authoritative: { status: "blocked", reasons: ["chain_rpc_unconfigured"], evidence_sources },
      results: [],
    };
  }

  const results: RevocationObservationResult[] = [];
  let best: { slot: number; sequence: number; result: RevocationObservationResult } | null = null;

  for (const obs of input.observations) {
    evidence_sources.push(`solana_revocation_rpc:${rpcUrls[0]}`);
    const primary = await verifyOnChainRevocationMemo({
      transactionSignature: obs.transactionSignature,
      targetCommitmentDigest: obs.targetCommitmentDigest,
      policyCommitmentHash: obs.policyCommitmentHash,
      authorizedRevokerPubkeys: obs.authorizedRevokerPubkeys,
      connection: new Connection(rpcUrls[0], input.chainIdentity.confirmation_threshold),
      confirmationThreshold: input.chainIdentity.confirmation_threshold,
    });

    if (!primary.ok) {
      const pending = primary.reason === "confirmation_insufficient";
      results.push({
        status: pending ? "pending" : primary.reason === "rpc_unavailable" ? "blocked" : "fail",
        reasons: [`revocation_${primary.reason}`],
        evidence_sources: [...evidence_sources],
      });
      continue;
    }

    if (rpcUrls[1]) {
      const secondary = await verifyOnChainRevocationMemo({
        transactionSignature: obs.transactionSignature,
        targetCommitmentDigest: obs.targetCommitmentDigest,
        policyCommitmentHash: obs.policyCommitmentHash,
        authorizedRevokerPubkeys: obs.authorizedRevokerPubkeys,
        connection: new Connection(rpcUrls[1], input.chainIdentity.confirmation_threshold),
        confirmationThreshold: input.chainIdentity.confirmation_threshold,
      });
      if (!secondary.ok || secondary.slot !== primary.slot) {
        results.push({
          status: "fail",
          reasons: ["revocation_rpc_disagreement"],
          evidence_sources: [...evidence_sources, `solana_revocation_rpc:${rpcUrls[1]}`],
        });
        continue;
      }
    }

    const pass: RevocationObservationResult = {
      status: "pass",
      slot: primary.slot,
      sequence: primary.memo.seq,
      action: primary.memo.a,
      evidence_sources: [...evidence_sources],
    };
    results.push(pass);
    if (!best || primary.slot > best.slot || (primary.slot === best.slot && primary.memo.seq > best.sequence)) {
      best = { slot: primary.slot, sequence: primary.memo.seq, result: pass };
    }
  }

  return { authoritative: best?.result ?? null, results };
}
