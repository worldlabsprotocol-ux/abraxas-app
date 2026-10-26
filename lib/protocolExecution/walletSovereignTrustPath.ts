// FILE: lib/protocolExecution/walletSovereignTrustPath.ts
// Build #853 — wallet authorization → evidence → signed decision → independent verification.

import nacl from "tweetnacl";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import { verifyPassportSolanaPersonalMessage } from "@/lib/auth/passportSolanaAuth/verifySignature";
import { encodePassportSolanaMessage } from "@/lib/auth/passportSolanaAuth/message";
import {
  buildWalletScopedTrustExecutionMessage,
  parseWalletScopedTrustExecutionBinding,
  type WalletScopedTrustBinding,
} from "@/lib/auth/walletAuthorization/scopedExecutionEnvelope";
import {
  createInMemoryScopedChallengeStore,
  type ScopedChallengeStore,
} from "@/lib/auth/walletAuthorization/scopedChallengeLifecycle";
import {
  deriveEvidenceIntegrityVerdict,
  type EvidenceSourceSnapshot,
} from "@/lib/decisionReceipts/evidenceIntegrityContract";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { verifyThreeLayerPortableFixture } from "@/lib/persistence/boundary/staging/build834Fixtures";
import type { ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";
import type { IndependentVerificationResult } from "@abraxas/independent-verifier";

export type TestEvidenceFixture = {
  label: "controlled_test_evidence";
  source: EvidenceSourceSnapshot;
  claim_ids: string[];
};

export type WalletSovereignTrustPathInput = {
  binding: WalletScopedTrustBinding;
  evidence: TestEvidenceFixture;
  receipt: DecisionReceiptRecord;
  receiptKey: ReceiptSigningKeyPair;
  anchorKey: ReceiptSigningKeyPair;
  env: Record<string, string | undefined>;
  walletKeypair?: Keypair;
  challengeStore?: ScopedChallengeStore;
  now?: Date;
};

export type WalletSovereignTrustPathResult = {
  wallet_signature_valid: boolean;
  challenge_consumed: boolean;
  authorization_ref: string | null;
  evidence_verdict: ReturnType<typeof deriveEvidenceIntegrityVerdict>;
  independent_verification: IndependentVerificationResult;
  uses_supabase_for_verdict: false;
};

export function signWalletScopedTrustMessage(message: string, keypair: Keypair): string {
  const bytes = encodePassportSolanaMessage(message);
  return bs58.encode(nacl.sign.detached(bytes, keypair.secretKey));
}

export async function executeWalletSovereignTrustPath(
  input: WalletSovereignTrustPathInput,
): Promise<WalletSovereignTrustPathResult> {
  const store = input.challengeStore ?? createInMemoryScopedChallengeStore();
  const kp = input.walletKeypair ?? Keypair.generate();
  const binding: WalletScopedTrustBinding = {
    ...input.binding,
    walletAddress: input.binding.walletAddress || kp.publicKey.toBase58(),
  };

  const message = buildWalletScopedTrustExecutionMessage(binding);
  const parsed = parseWalletScopedTrustExecutionBinding(message);
  if (!parsed) throw new Error("scoped_envelope_parse_failed");

  store.issue(binding, message);
  const signature = signWalletScopedTrustMessage(message, kp);
  const walletOk = verifyPassportSolanaPersonalMessage({
    message,
    signature,
    walletAddress: binding.walletAddress,
  });
  if (!walletOk) throw new Error("wallet_signature_invalid");

  const consumed = store.consume({
    challengeId: binding.requestId,
    message,
    walletAddress: binding.walletAddress,
    partnerId: binding.partnerId,
    applicationId: binding.applicationId,
    action: binding.action,
    now: input.now,
  });
  if (!consumed.ok) throw new Error(`challenge_consume_${consumed.reason}`);

  const evidence = deriveEvidenceIntegrityVerdict({
    receipt_id: input.receipt.id,
    subject_pseudonym_id: input.receipt.subject_pseudonym_id,
    expected_subject_pseudonym_id: input.receipt.subject_pseudonym_id,
    partner_id: input.receipt.partner_id,
    policy_id: input.receipt.policy_id,
    source: input.evidence.source,
    claims: input.evidence.claim_ids.map((claim_id) => ({
      claim_id,
      status: "active" as const,
      expires_at: "2099-01-01T00:00:00.000Z",
    })),
    store_available: true,
  });
  if (evidence.verdict !== "accepted") {
    throw new Error(`evidence_not_permit_${evidence.reasons.join(",")}`);
  }

  const independent = await verifyThreeLayerPortableFixture({
    record: input.receipt,
    env: input.env,
    anchorKey: input.anchorKey,
    registryVersion: 853,
  });

  return {
    wallet_signature_valid: true,
    challenge_consumed: true,
    authorization_ref: consumed.authorizationRef,
    evidence_verdict: evidence,
    independent_verification: independent,
    uses_supabase_for_verdict: false,
  };
}
