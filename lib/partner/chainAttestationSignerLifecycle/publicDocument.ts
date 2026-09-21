import { pickAllowedKeys } from "@/lib/privacy/selectiveDisclosure";
import { CHAIN_ATTESTATION_SCHEMA_VERSION } from "@/lib/partner/chainAttestation/contract";
import {
  CHAIN_ATTESTATION_SIGNER_DOCUMENT,
  CHAIN_ATTESTATION_SIGNER_DOCUMENT_FIELDS,
  CHAIN_ATTESTATION_SIGNER_NOTICE,
  CHAIN_ATTESTATION_SIGNER_PUBLIC_FIELDS,
  type ChainAttestationSignerAlgorithm,
  type ChainAttestationSignerDocument,
  type ChainAttestationSignerPublicView,
} from "./contract";
import { loadChainAttestationSignerRegistry } from "./registry";
import { assertNoPrivateAttestationSignerMaterial } from "./safety";

export function buildChainAttestationSignerDocument(input: {
  algorithm: ChainAttestationSignerAlgorithm;
  env?: Record<string, string | undefined>;
}): ChainAttestationSignerDocument | { ok: false; status: "unavailable" | "inconsistent" } {
  const loaded = loadChainAttestationSignerRegistry(input.env ?? process.env);
  if (!loaded.ok) return { ok: false, status: loaded.reason };
  const keys: ChainAttestationSignerPublicView[] = loaded.keys
    .filter((key) => key.algorithm === input.algorithm && key.environment === loaded.environment)
    .map((key) => pickAllowedKeys({
      key_id: key.key_id,
      algorithm: key.algorithm,
      public_verifier: key.public_verifier,
      fingerprint: key.fingerprint,
      environment: key.environment,
      status: key.status,
      issued_at: key.issued_at,
      not_before: key.not_before,
      expires_at: key.expires_at,
      allowed_networks: key.allowed_networks,
      allowed_gate_types: key.allowed_gate_types,
      schema_versions: key.schema_versions,
      reason_class: key.reason_class,
    }, CHAIN_ATTESTATION_SIGNER_PUBLIC_FIELDS) as unknown as ChainAttestationSignerPublicView);
  const document: ChainAttestationSignerDocument = {
    document: CHAIN_ATTESTATION_SIGNER_DOCUMENT,
    algorithm: input.algorithm,
    environment: loaded.environment,
    schema_versions: [String(CHAIN_ATTESTATION_SCHEMA_VERSION)],
    notice: CHAIN_ATTESTATION_SIGNER_NOTICE,
    keys,
  };
  const visible = (pickAllowedKeys(document, CHAIN_ATTESTATION_SIGNER_DOCUMENT_FIELDS) ?? document) as ChainAttestationSignerDocument;
  if (assertNoPrivateAttestationSignerMaterial(visible).length) {
    return { ok: false, status: "inconsistent" };
  }
  return visible;
}
