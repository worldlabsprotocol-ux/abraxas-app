import { PublicKey } from "@solana/web3.js";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import {
  runPartnerHarnessCase,
  type PartnerHarnessCaseResult,
} from "@/lib/partner/launchpad/partnerTestHarness";
import { hashReceiptId } from "@/lib/solana/proofContinuity/message";
import { findProofRegistryPda, findReceiptCommitmentPda } from "@/lib/solana/proofContinuity/pda";
import {
  blockchainNativeFinalitySlots,
  blockchainNativeRegistryAdmin,
  blockchainNativeStudioRpcUrl,
  isBlockchainNativeStudioConfigured,
} from "./studioConfig";
import { verifyBlockchainNativeExecutionBundle } from "./verifyExecutionBundle";
import { buildDemoTrustAnchorFromEnv } from "@/lib/partner/trustExecution/verifyTrustExecutionMaterial";
import {
  partnerHarnessFromPortablePersistence,
  portablePersistencePartnerId,
  type PortableHarnessPersistence,
} from "./studioHarnessRestore";

export function assertBlockchainNativeStudioReady():
  | { ok: true }
  | { ok: false; code: string } {
  if (!isBlockchainNativeStudioConfigured()) return { ok: false, code: "blockchain_native_studio_not_configured" };
  if (!loadReceiptSigningKey()) return { ok: false, code: "authorized_issuer_key_required" };
  return { ok: true };
}

export type BlockchainNativePrepareResult =
  | {
      ok: true;
      harness: PartnerHarnessCaseResult;
      receipt_id: string;
      payload_hash_hex: string;
      registry_admin: string;
      registry_pda: string;
      commitment_pda: string;
      receipt_id_hash_hex: string;
      rpc_url: string;
      finality_slots: number;
    }
  | { ok: false; code: string };

/** Harness issuance for blockchain-native studio — does not use sovereign PostgreSQL persistence. */
export function prepareBlockchainNativeStudioHarness(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  policyTemplateId: string;
  scenarioId: string;
}): BlockchainNativePrepareResult {
  const ready = assertBlockchainNativeStudioReady();
  if (!ready.ok) return ready;

  const signingKey = loadReceiptSigningKey()!;
  const harness = runPartnerHarnessCase({
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    policyTemplateId: input.policyTemplateId,
    scenarioId: input.scenarioId,
    signingKey,
    signingSource: "configured_issuer_key",
  });
  if ("ok" in harness && harness.ok === false) return { ok: false, code: harness.code };
  const harnessResult = harness as PartnerHarnessCaseResult;

  const persistence = harnessResult.persistence;
  if (!persistence?.public_payload) return { ok: false, code: "portable_receipt_missing_payload_hash" };
  const payloadHash = (persistence.public_payload as { payload_hash?: string }).payload_hash;
  if (!payloadHash) return { ok: false, code: "portable_receipt_missing_payload_hash" };

  const admin = blockchainNativeRegistryAdmin()!;
  const adminPk = new PublicKey(admin);
  const registry = findProofRegistryPda(adminPk);
  const receiptHash = hashReceiptId(persistence.receipt_id);
  const commitment = findReceiptCommitmentPda(registry.address, receiptHash);

  return {
    ok: true,
    harness: harnessResult,
    receipt_id: persistence.receipt_id,
    payload_hash_hex: payloadHash,
    registry_admin: admin,
    registry_pda: registry.address.toBase58(),
    commitment_pda: commitment.address.toBase58(),
    receipt_id_hash_hex: receiptHash.toString("hex"),
    rpc_url: blockchainNativeStudioRpcUrl()!,
    finality_slots: blockchainNativeFinalitySlots(),
  };
}

export async function confirmBlockchainNativeStudioExecution(input: {
  harness: PartnerHarnessCaseResult;
  partnerId: string;
  policyId: string;
  policyTemplateId: string;
  transactionSignature?: string;
}): Promise<
  | Awaited<ReturnType<typeof verifyBlockchainNativeExecutionBundle>>
> {
  const ready = assertBlockchainNativeStudioReady();
  if (!ready.ok) return ready;

  const anchor = buildDemoTrustAnchorFromEnv(process.env);
  if (!anchor) return { ok: false as const, code: "trust_anchor_not_configured" };

  const issuerAuthority = process.env.ABRAXAS_SIGNED_ISSUER_AUTHORITY_JSON?.trim();
  const statusStatement = process.env.ABRAXAS_SIGNED_STATUS_STATEMENT_JSON?.trim();
  if (!issuerAuthority || !statusStatement) {
    return { ok: false as const, code: "signed_status_material_required" };
  }

  let signedIssuerAuthority: unknown;
  let signedStatusStatement: unknown;
  try {
    signedIssuerAuthority = JSON.parse(issuerAuthority);
    signedStatusStatement = JSON.parse(statusStatement);
  } catch {
    return { ok: false as const, code: "signed_status_material_invalid" };
  }

  return verifyBlockchainNativeExecutionBundle({
    harness: input.harness,
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyTemplateId: input.policyTemplateId,
    pinnedTrustAnchor: anchor,
    signedIssuerAuthority: signedIssuerAuthority as { payload: unknown; signature: string },
    signedStatusStatement: signedStatusStatement as { payload: { effective_at: string }; signature: string },
    fetch: {
      rpcUrl: blockchainNativeStudioRpcUrl()!,
      registryAdmin: blockchainNativeRegistryAdmin()!,
      receiptId: input.harness.persistence!.receipt_id,
      transactionSignature: input.transactionSignature,
      finalitySlots: blockchainNativeFinalitySlots(),
    },
  });
}

export async function confirmBlockchainNativeStudioExecutionFromPortable(input: {
  persistence: PortableHarnessPersistence;
  partnerId: string;
  policyId: string;
  policyTemplateId: string;
  transactionSignature?: string;
}) {
  const ready = assertBlockchainNativeStudioReady();
  if (!ready.ok) return ready;

  const partnerFromReceipt = portablePersistencePartnerId(input.persistence);
  if (partnerFromReceipt && partnerFromReceipt !== input.partnerId) {
    return { ok: false as const, code: "portable_partner_mismatch" };
  }

  const policyFromReceipt = (input.persistence.public_payload as { policy_id?: string }).policy_id;
  if (typeof policyFromReceipt === "string" && policyFromReceipt !== input.policyId) {
    return { ok: false as const, code: "portable_policy_mismatch" };
  }

  return confirmBlockchainNativeStudioExecution({
    harness: partnerHarnessFromPortablePersistence(input.persistence),
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyTemplateId: input.policyTemplateId,
    transactionSignature: input.transactionSignature,
  });
}