import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyAbraxasReceiptIndependently } from "../../../../packages/abraxas-independent-verifier/src/verifyIndependent";
import { runPartnerHarnessCase } from "@/lib/partner/launchpad/partnerTestHarness";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { isBlockchainNativePrototypeEnabled } from "./contract";
import {
  harnessIssuedReceiptFields,
  runBlockchainNativePrototypeHarness,
} from "./runPrototypeHarness";
import type { PartnerHarnessCaseResult } from "@/lib/partner/launchpad/partnerTestHarness";
import { verifyOnChainReceiptCommitment } from "@/lib/solana/proofContinuity/verifyOnChainCommitment";
import { RECEIPT_COMMITMENT_STATUS } from "@/lib/solana/proofContinuity/constants";
import { hashReceiptId, hashScopeId } from "@/lib/solana/proofContinuity/message";

const FIX = join(process.cwd(), "examples/integration-first-relying-party/fixtures");

function syntheticCommitmentAccount(fields: {
  receipt_id: string;
  payload_hex: string;
  partner_id: string;
  policy_id: string;
  application_id: string;
}): Buffer {
  const buf = Buffer.alloc(8 + 32 + 32 * 6 + 8 + 1 + 8 + 1, 0);
  let off = 8 + 32;
  hashReceiptId(fields.receipt_id).copy(buf, off);
  off += 32;
  Buffer.from(fields.payload_hex.padStart(64, "0").slice(0, 64), "hex").copy(buf, off);
  off += 32;
  hashScopeId(fields.partner_id).copy(buf, off);
  off += 32;
  hashScopeId(fields.policy_id).copy(buf, off);
  off += 32;
  hashScopeId(fields.application_id).copy(buf, off);
  off += 32;
  buf.writeBigInt64BE(9_000_000_000n, off);
  off += 8;
  buf.writeUInt8(RECEIPT_COMMITMENT_STATUS.active, off);
  off += 1;
  buf.writeBigUInt64BE(1n, off);
  return buf;
}

describe("blockchain-native launchpad prototype journey (local)", () => {
  it("fails closed when prototype env is disabled", () => {
    vi.stubEnv("ABRAXAS_BLOCKCHAIN_NATIVE_PROTOTYPE", "");
    expect(isBlockchainNativePrototypeEnabled()).toBe(false);
    const result = runBlockchainNativePrototypeHarness({
      partnerId: "partner-integration-821",
      policyId: "policy-age21-sandbox-821",
      policyVersion: 1,
      policyTemplateId: "wallet_control",
      scenarioId: "approved",
      commitmentAccountData: Buffer.alloc(256),
      executionNonce: 1n,
    });
    expect(result).toEqual({ ok: false, code: "blockchain_native_prototype_disabled" });
    vi.unstubAllEnvs();
  });

  it("chains portable independent verification with on-chain commitment checks", () => {
    vi.stubEnv("ABRAXAS_BLOCKCHAIN_NATIVE_PROTOTYPE", "1");
    const record = JSON.parse(readFileSync(join(FIX, "decision-receipt.json"), "utf8"));
    const pin = JSON.parse(readFileSync(join(FIX, "trust-anchor-bundle.json"), "utf8"));
    const sias = JSON.parse(readFileSync(join(FIX, "issuer-authority-statement.json"), "utf8"));
    const status = JSON.parse(readFileSync(join(FIX, "signed-status-statement.json"), "utf8"));

    const portable = verifyAbraxasReceiptIndependently({
      record,
      pinnedTrustAnchor: pin,
      signedIssuerAuthority: sias,
      signedStatusStatement: status,
      relyingParty: {
        partner_id: "partner-integration-821",
        policy_id: "policy-age21-sandbox-821",
        environment: "demo",
      },
      statementObservedAt: status.payload.effective_at,
    });
    expect(portable.cryptographically_authentic).toBe(true);

    const signingKey = generateTestSigningKeyPair("blockchain-native-prototype");
    const harness = runPartnerHarnessCase({
      partnerId: "partner-integration-821",
      policyId: "policy-age21-sandbox-821",
      policyVersion: 1,
      policyTemplateId: "wallet_control",
      scenarioId: "approved",
      signingKey,
      signingSource: "configured_issuer_key",
    });
    expect("ok" in harness && harness.ok === false).toBe(false);

    const issued = harnessIssuedReceiptFields(harness as PartnerHarnessCaseResult);
    expect(issued).not.toBeNull();
    const account = syntheticCommitmentAccount({
      receipt_id: issued!.receipt_id,
      payload_hex: issued!.payload_hash,
      partner_id: "partner-integration-821",
      policy_id: "policy-age21-sandbox-821",
      application_id: "wallet_control",
    });

    const chain = verifyOnChainReceiptCommitment({
      commitmentAccountData: account,
      expectations: {
        receipt_id: issued!.receipt_id,
        payload_hash_hex: issued!.payload_hash,
        partner_id: "partner-integration-821",
        policy_id: "policy-age21-sandbox-821",
        application_id: "wallet_control",
      },
    });
    expect(chain.ok).toBe(true);

  const adapter = runBlockchainNativePrototypeHarness({
      partnerId: "partner-integration-821",
      policyId: "policy-age21-sandbox-821",
      policyVersion: 1,
      policyTemplateId: "wallet_control",
      scenarioId: "approved",
      commitmentAccountData: account,
      executionNonce: 1n,
      harnessResult: harness as PartnerHarnessCaseResult,
    });
    expect(adapter.ok).toBe(true);
    vi.unstubAllEnvs();
  });
});