// FILE: lib/institutionalVerification/crossApplication.ts

import type { CrossApplicationVerificationInput, CrossApplicationVerificationResult } from "./contract";
import { INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION } from "./contract";
import { verifyHolderTrustPresentation } from "./verifyPresentation";

/**
 * Same holder presentation may authorize at one relying party scope and deny at another.
 * Preserves tenant isolation without exposing cross-institution policy context.
 */
export async function verifyCrossApplicationPresentation(
  input: CrossApplicationVerificationInput,
): Promise<CrossApplicationVerificationResult> {
  const shared = {
    presentation: input.presentation,
    portable_revocation_snapshot: input.portable_revocation_snapshot,
    now: input.now,
    trust_env: input.trust_env,
    portable_revocation_issuer_trust: input.portable_revocation_issuer_trust,
    portable_revocation_bootstrap_trusts: input.portable_revocation_bootstrap_trusts,
    checkpoint_store: input.checkpoint_store,
    consumption_store: input.consumption_store,
  };

  const authorized_application = await verifyHolderTrustPresentation({
    ...shared,
    relying_party: input.authorized_scope,
    request_id: `${input.request_id_prefix}_authorized`,
  });

  const other_application = await verifyHolderTrustPresentation({
    ...shared,
    relying_party: input.unauthorized_scope,
    request_id: `${input.request_id_prefix}_other`,
  });

  const isolation_preserved =
    authorized_application.authorize === true
    && other_application.authorize === false
    && other_application.rejection_reasons.some((reason) =>
      reason === "tenant_partner_mismatch"
      || reason === "tenant_policy_mismatch"
      || reason === "audience_mismatch"
      || reason === "presentation_binding_invalid"
      || reason === "authorization_denied",
    );

  return {
    contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    authorized_application,
    other_application,
    isolation_preserved,
  };
}
