import { createHash } from "node:crypto";
import { describe, expect, it, beforeEach } from "vitest";
import {
  configureFlowEscrowPepper,
  createPurchaseFlowOwnershipArtifacts,
  hashFlowOwnershipProof,
  ownershipProofHashesMatch,
  sealVerifierForFlow,
  unsealVerifierForFlow,
  validateFlowOwnershipSecret,
} from "./flowOwnership.js";
import { validateVerifier } from "./pkceProof.js";

const FLOW_ID = `gtf_${"c".repeat(64)}`;
const VERIFIER = "a".repeat(64);

beforeEach(() => {
  configureFlowEscrowPepper("test-pepper-only");
});

describe("flow ownership escrow", () => {
  it("creates ownership artifacts without exposing verifier in sealed blob plaintext", () => {
    const artifacts = createPurchaseFlowOwnershipArtifacts({ flowId: FLOW_ID, verifier: VERIFIER });
    expect(artifacts.ownershipSecret).toHaveLength(64);
    expect(artifacts.verifierSealed).not.toContain(VERIFIER);
    expect(validateFlowOwnershipSecret(artifacts.ownershipSecret).ok).toBe(true);
  });

  it("unseals verifier only with matching ownership secret", () => {
    const artifacts = createPurchaseFlowOwnershipArtifacts({ flowId: FLOW_ID, verifier: VERIFIER });
    const unsealed = unsealVerifierForFlow({
      flowId: FLOW_ID,
      ownershipSecret: artifacts.ownershipSecret,
      verifierSealed: artifacts.verifierSealed,
    });
    expect(unsealed).toBe(VERIFIER);
    expect(() => unsealVerifierForFlow({
      flowId: FLOW_ID,
      ownershipSecret: "f".repeat(64),
      verifierSealed: artifacts.verifierSealed,
    })).toThrow();
  });

  it("ownership proof hash rejects substituted secrets", () => {
    const artifacts = createPurchaseFlowOwnershipArtifacts({ flowId: FLOW_ID, verifier: VERIFIER });
    const wrong = hashFlowOwnershipProof(FLOW_ID, "b".repeat(64));
    expect(ownershipProofHashesMatch(artifacts.ownershipProofHash, wrong)).toBe(false);
  });

  it("sealed verifier still satisfies PKCE validateVerifier", () => {
    const artifacts = createPurchaseFlowOwnershipArtifacts({ flowId: FLOW_ID, verifier: VERIFIER });
    const plain = unsealVerifierForFlow({
      flowId: FLOW_ID,
      ownershipSecret: artifacts.ownershipSecret,
      verifierSealed: artifacts.verifierSealed,
    });
    expect(validateVerifier(plain).ok).toBe(true);
  });

  it("seal round-trip uses deterministic key per flow + secret", () => {
    const secret = "d".repeat(64);
    const sealed = sealVerifierForFlow({ flowId: FLOW_ID, verifier: VERIFIER, ownershipSecret: secret });
    expect(unsealVerifierForFlow({ flowId: FLOW_ID, ownershipSecret: secret, verifierSealed: sealed }))
      .toBe(VERIFIER);
  });
});
