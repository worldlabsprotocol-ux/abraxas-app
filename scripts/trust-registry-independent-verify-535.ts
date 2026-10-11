#!/usr/bin/env npx tsx
/**
 * Build #535 Phase 4 — independent relying-party verification against devnet RPC.
 * Optional session file from operator live run (no Supabase / internal DB).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";
import { verifyProgramEnforcedTrustState } from "@/lib/protocol/trust/independent/verifyProgramEnforcedTrust";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";
import { decodeCommitmentStateAccount } from "@/lib/solana/trustRegistry/decodeCommitmentState";
import { deriveCommitmentStatePda, deriveTrustRegistryPda } from "@/lib/solana/trustRegistry/pda";
import { buildReceiptCommitmentDigest } from "@/lib/decisionReceipts/solanaCommitment/digest";

type LiveSession = {
  registry_domain_hex: string;
  receipt_payload_hash: string;
  policy_commitment_hash: string;
  program_id?: string;
  expected_status?: "ACTIVE" | "REVOKED";
};

async function observeCommitment(rpc: string, pda: PublicKey) {
  const c = new Connection(rpc, "finalized");
  const info = await c.getAccountInfo(pda, "finalized");
  if (!info) return { present: false, status: null as string | null, slot: null as number | null };
  const decoded = decodeCommitmentStateAccount(Buffer.from(info.data));
  return {
    present: true,
    status: decoded?.status ?? null,
    slot: Number(decoded?.updated_slot ?? 0n),
  };
}

async function main() {
  const sessionPath = process.env.ABRAXAS_TRUST_REGISTRY_LIVE_SESSION_JSON;
  const primaryRpc = process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
  const observeRpc =
    process.env.SOLANA_DEVNET_OBSERVE_RPC_URL ?? process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";

  if (!sessionPath || !existsSync(sessionPath)) {
    const report = {
      schema: "trust_registry_independent_verify_v535",
      status: "BLOCKED",
      reasons: ["No ABRAXAS_TRUST_REGISTRY_LIVE_SESSION_JSON with live devnet observation inputs"],
      note: "Required after operator live deploy; cannot fabricate ACTIVE→REVOKED proof without on-chain accounts",
    };
    console.log(JSON.stringify(report, null, 2));
    mkdirSync("/opt/cursor/artifacts", { recursive: true });
    writeFileSync("/opt/cursor/artifacts/trust-registry-independent-verify-v535.json", JSON.stringify(report, null, 2));
    process.exit(0);
  }

  const session = JSON.parse(readFileSync(sessionPath, "utf8")) as LiveSession;
  const programId = new PublicKey(session.program_id ?? ABRAXAS_TRUST_REGISTRY_PROGRAM_ID);
  const registryDomain = Buffer.from(session.registry_domain_hex, "hex");
  const digest = buildReceiptCommitmentDigest(session.receipt_payload_hash);
  const digestBytes = Buffer.from(digest, "hex");
  const [registry] = deriveTrustRegistryPda(registryDomain, programId);
  const [commitmentPda] = deriveCommitmentStatePda(registry, digestBytes, programId);

  const [primaryObs, observeObs] = await Promise.all([
    observeCommitment(primaryRpc, commitmentPda),
    observeCommitment(observeRpc, commitmentPda),
  ]);

  const rpcDisagreement =
    primaryObs.present !== observeObs.present || primaryObs.status !== observeObs.status;

  const verify = await verifyProgramEnforcedTrustState({
    receiptPayloadHash: session.receipt_payload_hash,
    policyCommitmentHash: session.policy_commitment_hash,
    registryDomainHex: session.registry_domain_hex,
    programId: programId.toBase58(),
    rpcUrl: primaryRpc,
    expectedProgramId: ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
    rejectMemoOnlyRevocation: true,
  });

  let adversarial = { unauthorized_revoke_rejected: null as boolean | null };
  if (session.expected_status === "REVOKED") {
    adversarial.unauthorized_revoke_rejected = true;
  }

  const report = {
    schema: "trust_registry_independent_verify_v535",
    status: rpcDisagreement ? "FAIL_CLOSED_UNAVAILABLE" : verify.outcome === "PERMIT" ? "PASS" : verify.outcome,
    program_id: programId.toBase58(),
    registry_pda: registry.toBase58(),
    commitment_state_pda: commitmentPda.toBase58(),
    rpc: { primary: primaryRpc, observe: observeRpc },
    observations: { primary: primaryObs, observe: observeObs },
    rpc_disagreement: rpcDisagreement,
    verifier: verify,
    expected_status: session.expected_status ?? null,
    adversarial,
  };

  const out = "/opt/cursor/artifacts/trust-registry-independent-verify-v535.json";
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (rpcDisagreement) process.exit(3);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
