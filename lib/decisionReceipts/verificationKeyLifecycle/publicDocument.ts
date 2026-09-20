// FILE: lib/decisionReceipts/verificationKeyLifecycle/publicDocument.ts

import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { pickAllowedKeys } from "@/lib/privacy/selectiveDisclosure";
import {
  RECEIPT_KEY_DOCUMENT_FIELDS,
  RECEIPT_KEY_PARTNER_NOTICE,
  RECEIPT_KEY_PUBLIC_FIELDS,
  RECEIPT_VERIFICATION_KEY_ALGORITHM,
  RECEIPT_VERIFICATION_KEY_DOCUMENT,
  type ReceiptVerificationKeyDocument,
  type ReceiptVerificationPublicKeyView,
} from "./contract";
import { loadReceiptVerificationRegistry } from "./registry";
import { assertNoPrivateReceiptKeyMaterial } from "./safety";

function toPublicView(key: {
  key_id: string;
  algorithm: typeof RECEIPT_VERIFICATION_KEY_ALGORITHM;
  public_jwk: ReceiptVerificationPublicKeyView["public_jwk"];
  fingerprint: string;
  environment: ReceiptVerificationPublicKeyView["environment"];
  status: ReceiptVerificationPublicKeyView["status"];
  issued_at: string;
  not_before: string;
  expires_at: string | null;
  issuer_label: string;
  schema_versions: string[];
  reason_class: ReceiptVerificationPublicKeyView["reason_class"];
}): ReceiptVerificationPublicKeyView {
  const view: ReceiptVerificationPublicKeyView = {
    key_id: key.key_id,
    algorithm: key.algorithm,
    public_jwk: key.public_jwk,
    fingerprint: key.fingerprint,
    environment: key.environment,
    status: key.status,
    issued_at: key.issued_at,
    not_before: key.not_before,
    expires_at: key.expires_at,
    issuer_label: key.issuer_label,
    schema_versions: key.schema_versions,
    reason_class: key.reason_class,
  };
  return (pickAllowedKeys(view, RECEIPT_KEY_PUBLIC_FIELDS) ?? view) as ReceiptVerificationPublicKeyView;
}

export function buildReceiptVerificationKeyDocument(
  env: Record<string, string | undefined> = process.env,
): ReceiptVerificationKeyDocument | { ok: false; status: "unavailable" | "inconsistent" } {
  const loaded = loadReceiptVerificationRegistry(env);
  if (!loaded.ok) return { ok: false, status: loaded.reason };
  const keys = loaded.keys
    .filter((key) => key.environment === loaded.environment)
    .map((key) => toPublicView(key));
  const document: ReceiptVerificationKeyDocument = {
    document: RECEIPT_VERIFICATION_KEY_DOCUMENT,
    algorithm: RECEIPT_VERIFICATION_KEY_ALGORITHM,
    environment: loaded.environment,
    schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
    notice: RECEIPT_KEY_PARTNER_NOTICE,
    keys,
  };
  const visible = (pickAllowedKeys(document, RECEIPT_KEY_DOCUMENT_FIELDS) ?? document) as ReceiptVerificationKeyDocument;
  if (assertNoPrivateReceiptKeyMaterial(visible).length > 0) {
    return { ok: false, status: "inconsistent" };
  }
  return visible;
}
