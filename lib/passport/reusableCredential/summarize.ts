// FILE: lib/passport/reusableCredential/summarize.ts

import type {
  PassportReusableCredentialSummary,
  SignedPassportReusableCredential,
} from "./contract";

export function summarizeReusableCredential(
  credential: SignedPassportReusableCredential,
  options?: { sandboxLabeled?: boolean },
): PassportReusableCredentialSummary {
  const now = Date.now();
  const expired = Date.parse(credential.payload.expires_at) < now;
  return {
    credential_id: credential.payload.credential_id,
    issuer_id: credential.payload.issuer_id,
    assurance_level: credential.payload.assurance_level,
    claim_labels: credential.payload.asserted_claims.map((c) => c.claim_type),
    issued_at: credential.payload.issued_at,
    expires_at: credential.payload.expires_at,
    status: expired ? "expired" : "active",
    sandbox_labeled: options?.sandboxLabeled ?? credential.payload.provenance.idv_method === "sandbox_fixture",
    limitations: [
      "Reusable issuer credential, not a partner authorization receipt.",
      "Each institution requires a separate partner-bound presentation and holder approval.",
      "Export supports credential custody only, not Passport account recovery.",
    ],
    not_a_partner_receipt: true,
  };
}
