import { describe, expect, it } from "vitest";
import {
  createPurchaseFlowOwnershipArtifacts,
  hashFlowOwnershipProof,
  ownershipProofHashesMatch,
  sealVerifierForFlow,
  unsealVerifierForFlow,
  validateFlowOwnershipSecret,
} from "./flowOwnership.js";
import { validateVerifier } from "./pkceProof.js";
import { TEST_ESCROW_PEPPER_HEX } from "./testPkceEscrowFixtures.js";

const FLOW_ID = `gtf_${"c".repeat(64)}`;
const VERIFIER = "a".repeat(64);
const PEPPER = TEST_ESCROW_PEPPER_HEX;

describe("flow ownership escrow", () => {
  it("creates ownership artifacts without exposing verifier in sealed blob plaintext", () => {
    const artifacts = createPurchaseFlowOwnershipArtifacts({
      flowId: FLOW_ID,
      verifier: VERIFIER,
      pepper: PEPPER,
    });
    expect(artifacts.ownershipSecret).toHaveLength(64);
    expect(artifacts.verifierSealed).not.toContain(VERIFIER);
    expect(validateFlowOwnershipSecret(artifacts.ownershipSecret).ok).toBe(true);
  });

  it("unseals verifier only with matching ownership secret", () => {
    const artifacts = createPurchaseFlowOwnershipArtifacts({
      flowId: FLOW_ID,
      verifier: VERIFIER,
      pepper: PEPPER,
    });
    const unsealed = unsealVerifierForFlow({
      flowId: FLOW_ID,
      ownershipSecret: artifacts.ownershipSecret,
      verifierSealed: artifacts.verifierSealed,
      pepper: PEPPER,
    });
    expect(unsealed).toBe(VERIFIER);
    expect(() => unsealVerifierForFlow({
      flowId: FLOW_ID,
      ownershipSecret: "f".repeat(64),
      verifierSealed: artifacts.verifierSealed,
      pepper: PEPPER,
    })).toThrow();
  });

  it("ownership proof hash rejects substituted secrets", () => {
    const artifacts = createPurchaseFlowOwnershipArtifacts({
      flowId: FLOW_ID,
      verifier: VERIFIER,
      pepper: PEPPER,
    });
    const wrong = hashFlowOwnershipProof(FLOW_ID, "b".repeat(64), PEPPER);
    expect(ownershipProofHashesMatch(artifacts.ownershipProofHash, wrong)).toBe(false);
  });

  it("sealed verifier still satisfies PKCE validateVerifier", () => {
    const artifacts = createPurchaseFlowOwnershipArtifacts({
      flowId: FLOW_ID,
      verifier: VERIFIER,
      pepper: PEPPER,
    });
    const plain = unsealVerifierForFlow({
      flowId: FLOW_ID,
      ownershipSecret: artifacts.ownershipSecret,
      verifierSealed: artifacts.verifierSealed,
      pepper: PEPPER,
    });
    expect(validateVerifier(plain).ok).toBe(true);
  });

  it("seal round-trip uses deterministic key per flow + secret", () => {
    const secret = "d".repeat(64);
    const sealed = sealVerifierForFlow({
      flowId: FLOW_ID,
      verifier: VERIFIER,
      ownershipSecret: secret,
      pepper: PEPPER,
    });
    expect(unsealVerifierForFlow({
      flowId: FLOW_ID,
      ownershipSecret: secret,
      verifierSealed: sealed,
      pepper: PEPPER,
    })).toBe(VERIFIER);
  });
});
