// FILE: lib/institutionalVerification/inspectOnly.ts
// Cryptographic inspection without authorization or consumption side effects.

import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";
import { validatePresentationReceiptStrictBinding } from "@/lib/protocol/proofFirst/presentationReceiptBinding";
import { assertPresentationExcludesSensitiveCustody } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import { resolveStrictPortableRevocation } from "@/lib/protocol/proofFirst/portableRevocationStrict";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { HolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";
import type { RelyingPartyScope } from "./contract";
import type { RevocationSourceState } from "@/lib/institutionalCertification/build546/independentVerifier";

/** Offline/crypto inspection — never authorizes access and never records consumption. */
export async function inspectSignedDecisionReceiptCryptography(input: {
  signed_record: DecisionReceiptRecord;
  relying_party: RelyingPartyScope;
  trust_env: Record<string, string | undefined>;
  now?: Date;
  revocation_source?: RevocationSourceState;
}) {
  return verifyReceiptIndependently({
    signedRecord: input.signed_record,
    expectations: {
      partnerId: input.relying_party.partner_id,
      policyId: input.relying_party.policy_id,
      allowSandbox: input.relying_party.allow_sandbox,
    },
    now: input.now,
    env: input.trust_env,
    revocationSource: input.revocation_source,
  });
}

/** Presentation cryptography + binding + portable revocation — no harness / no consumption. */
export async function inspectHolderPresentationCryptography(input: {
  presentation: HolderPolicyScopedPresentation;
  relying_party: RelyingPartyScope;
  trust_env: Record<string, string | undefined>;
  portable_revocation_snapshot?: PortableRevocationSignedArtifact;
  portable_revocation?: Parameters<typeof resolveStrictPortableRevocation>[0]["rp"]["portableRevocation"];
  now?: Date;
  revocation_source?: RevocationSourceState;
}) {
  const signed = input.presentation.signed_decision_receipt;
  const now = input.now ?? new Date();
  const binding = validatePresentationReceiptStrictBinding({
    presentation: input.presentation,
    relyingParty: {
      partnerId: input.relying_party.partner_id,
      policyId: input.relying_party.policy_id,
    },
  });
  const custody = assertPresentationExcludesSensitiveCustody(input.presentation);
  const portable = await resolveStrictPortableRevocation({
    signed,
    now,
    rp: {
      partnerId: input.relying_party.partner_id,
      policyId: input.relying_party.policy_id,
      allowSandbox: input.relying_party.allow_sandbox,
      env: input.trust_env,
      portableRevocation: input.portable_revocation,
    },
    portableRevocationSnapshot: input.portable_revocation_snapshot,
    revocationSource: input.revocation_source,
  });
  const verifier = verifyReceiptIndependently({
    signedRecord: signed,
    expectations: {
      partnerId: input.relying_party.partner_id,
      policyId: input.relying_party.policy_id,
      allowSandbox: input.relying_party.allow_sandbox,
    },
    now,
    env: input.trust_env,
    revocationSource: portable.revocationSource,
  });
  return {
    binding_ok: binding.ok,
    binding_deny_codes: binding.ok ? [] : binding.deny_codes,
    custody_ok: custody.ok,
    portable_revocation_authenticated: portable.portable_revocation_authenticated,
    portable_revocation_codes: portable.portable_revocation_verification?.codes,
    verifier,
    consumption_side_effects: false as const,
  };
}
