// Operator ceremony helpers for disposable proofs. Not used by receipt issuance.

import { createHash } from "node:crypto";
import { publicEd25519JwkFingerprint } from "@abraxas/independent-verifier";
import {
  GOVERNANCE_OPERATOR_WITNESS_ENV,
  GOVERNANCE_TRUST_BOOTSTRAP_DOCUMENT,
  signGovernanceTrustBootstrap,
  type GovernanceTrustBootstrapAuthorization,
} from "./governanceTrustBootstrap";
import { establishGovernanceTrustPin } from "./governanceTrustPin";

export const DISPOSABLE_GOVERNANCE_WITNESS_SECRET = "disposable-governance-operator-witness";

export function disposableGovernanceWitnessEnv(): Record<string, string> {
  return {
    [GOVERNANCE_OPERATOR_WITNESS_ENV]: createHash("sha256")
      .update(DISPOSABLE_GOVERNANCE_WITNESS_SECRET, "utf8")
      .digest("hex"),
  };
}

export function buildGovernanceTrustBootstrapBundle(input: {
  environment: "demo" | "production";
  governance: { signingKeyId: string; publicKeyJwk: JsonWebKey; privateKeyJwk: JsonWebKey };
  changeTicket: string;
  operatorAttestedAt?: string;
}): {
  bootstrap: GovernanceTrustBootstrapAuthorization;
  bootstrapSignatureBase64Url: string;
  operatorWitnessSecret: string;
} {
  const fingerprint = publicEd25519JwkFingerprint(input.governance.publicKeyJwk) ?? "";
  const bootstrap: GovernanceTrustBootstrapAuthorization = {
    document: GOVERNANCE_TRUST_BOOTSTRAP_DOCUMENT,
    schema_version: "1.0.0",
    environment: input.environment,
    governance_key_id: input.governance.signingKeyId,
    public_key_fingerprint: fingerprint,
    operator_change_ticket: input.changeTicket,
    operator_attested_at: input.operatorAttestedAt ?? "2026-06-01T00:00:00.000Z",
  };
  return {
    bootstrap,
    bootstrapSignatureBase64Url: signGovernanceTrustBootstrap({
      authorization: bootstrap,
      governancePrivateJwk: input.governance.privateKeyJwk,
    }),
    operatorWitnessSecret: DISPOSABLE_GOVERNANCE_WITNESS_SECRET,
  };
}

export async function installDisposableGovernanceTrustPin(input: {
  env: Record<string, string | undefined>;
  environment: "demo" | "production";
  governance: { signingKeyId: string; publicKeyJwk: JsonWebKey; privateKeyJwk: JsonWebKey };
  anchorKeyId: string;
  anchorPublicJwk: JsonWebKey;
  authorityKeys: { key_id: string; public_jwk: JsonWebKey }[];
  statusSigners: { key_id: string; public_jwk: JsonWebKey }[];
  changeTicket: string;
}) {
  const ceremony = buildGovernanceTrustBootstrapBundle({
    environment: input.environment,
    governance: input.governance,
    changeTicket: input.changeTicket,
  });
  return establishGovernanceTrustPin({
    env: { ...input.env, ...disposableGovernanceWitnessEnv() },
    environment: input.environment,
    pin: { keyId: input.governance.signingKeyId, publicJwk: input.governance.publicKeyJwk },
    bootstrap: ceremony.bootstrap,
    bootstrapSignatureBase64Url: ceremony.bootstrapSignatureBase64Url,
    operatorWitnessSecret: ceremony.operatorWitnessSecret,
    anchorKeyId: input.anchorKeyId,
    anchorPublicJwk: input.anchorPublicJwk,
    authorityKeys: input.authorityKeys,
    statusSigners: input.statusSigners,
  });
}
