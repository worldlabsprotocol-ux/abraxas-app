// FILE: lib/institutionalVerification/verificationContractDocument.ts

import { RECEIPT_VERIFICATION_KEY_ALGORITHM } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import { buildReceiptVerificationKeyDocument } from "@/lib/decisionReceipts/verificationKeyLifecycle/publicDocument";
import {
  INSTITUTIONAL_VERIFICATION_CONTRACT_ID,
  INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
  type InstitutionalVerificationCapability,
} from "./contract";
import { digestReceiptVerificationKeyDocument } from "./trustMaterial";
import {
  PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV,
  PORTABLE_REVOCATION_ISSUER_TRUST_ENV,
} from "@/lib/passport/reusableCredential/independentInstitutionConfig";

export type InstitutionalVerificationContractDocument = {
  contract: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_ID;
  contract_version: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION;
  published_at: string;
  capabilities: InstitutionalVerificationCapability[];
  algorithms: {
    decision_receipt_signature: typeof RECEIPT_VERIFICATION_KEY_ALGORITHM;
    portable_revocation_snapshot: typeof RECEIPT_VERIFICATION_KEY_ALGORITHM;
  };
  trust_material: {
    receipt_verification_keys_path: "/api/receipts/verification-keys";
    well_known_path: "/.well-known/abraxas-trust/v1";
    receipt_key_document_digest: string | null;
    receipt_key_environment: string | null;
    bootstrap_notice: string;
    institution_env_keys: {
      receipt_registry: "ABRAXAS_RECEIPT_VERIFICATION_REGISTRY";
      portable_revocation_issuer_trust: typeof PORTABLE_REVOCATION_ISSUER_TRUST_ENV;
      portable_revocation_bootstrap_trusts: typeof PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV;
    };
  };
  integration: {
    module: "@/lib/institutionalVerification";
    example: "examples/institutional-verifier-backend/verify.ts";
    developer_ui: "/developers/institutional-verification";
  };
  migration: {
    previous_contract_versions: ["584.v0", "569.v0"];
    breaking_change_policy: "contract_version bump when rejection reason codes or required trust inputs change",
  };
  limitations: string[];
};

const CAPABILITIES: InstitutionalVerificationCapability[] = [
  "receipt_signature_offline",
  "issuer_key_registry_offline",
  "policy_tenant_binding_offline",
  "presentation_strict_binding_offline",
  "portable_revocation_snapshot_offline",
  "receipt_consumption_replay_guard",
  "revocation_checkpoint_freshness",
  "cross_application_policy_isolation",
];

export function buildInstitutionalVerificationContractDocument(
  env: Record<string, string | undefined> = process.env,
): InstitutionalVerificationContractDocument | { ok: false; status: "unavailable" } {
  const receiptDoc = buildReceiptVerificationKeyDocument(env);
  if ("ok" in receiptDoc && receiptDoc.ok === false) {
    return { ok: false, status: "unavailable" };
  }
  if (!("keys" in receiptDoc)) {
    return { ok: false, status: "unavailable" };
  }
  const digest = digestReceiptVerificationKeyDocument(receiptDoc);
  return {
    contract: INSTITUTIONAL_VERIFICATION_CONTRACT_ID,
    contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    published_at: new Date().toISOString(),
    capabilities: CAPABILITIES,
    algorithms: {
      decision_receipt_signature: RECEIPT_VERIFICATION_KEY_ALGORITHM,
      portable_revocation_snapshot: RECEIPT_VERIFICATION_KEY_ALGORITHM,
    },
    trust_material: {
      receipt_verification_keys_path: "/api/receipts/verification-keys",
      well_known_path: "/.well-known/abraxas-trust/v1",
      receipt_key_document_digest: digest,
      receipt_key_environment: receiptDoc.environment,
      bootstrap_notice:
        "Integrators must pin receipt_key_document_digest or ship ABRAXAS_RECEIPT_VERIFICATION_REGISTRY offline. "
        + "Network fetch is rejected without a mandatory digest pin. "
        + "An HTTPS response alone is never a new issuer grant.",
      institution_env_keys: {
        receipt_registry: "ABRAXAS_RECEIPT_VERIFICATION_REGISTRY",
        portable_revocation_issuer_trust: PORTABLE_REVOCATION_ISSUER_TRUST_ENV,
        portable_revocation_bootstrap_trusts: PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV,
      },
    },
    integration: {
      module: "@/lib/institutionalVerification",
      example: "examples/institutional-verifier-backend/verify.ts",
      developer_ui: "/developers/institutional-verification",
    },
    migration: {
      previous_contract_versions: ["584.v0", "569.v0"],
      breaking_change_policy:
        "contract_version bump when rejection reason codes or required trust inputs change",
    },
    limitations: [
      "Live claim-dependency refresh may require issuer feeds beyond receipt signature verification.",
      "Portable revocation issuer trust must be configured by the institution — not inferred from Abraxas UI.",
      "Cryptographic verification does not depend on Abraxas billing or Supabase.",
      "Production signing activation and private key rotation remain operator-controlled.",
    ],
  };
}
