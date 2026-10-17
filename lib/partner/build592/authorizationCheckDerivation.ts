// FILE: lib/partner/build592/authorizationCheckDerivation.ts

import type { IndependentVerifierResult } from "@/lib/institutionalCertification/build546/independentVerifier";
import type { InstitutionalPresentationVerificationResult } from "@/lib/institutionalVerification/contract";

export type AuthorizationCheckState = "confirmed" | "unconfirmed" | "failed";

export type DerivedAuthorizationChecks = {
  signature_authentic: AuthorizationCheckState;
  issuer_trusted: AuthorizationCheckState;
  tenant_scope_ok: AuthorizationCheckState;
  policy_binding_ok: AuthorizationCheckState;
  lifetime_ok: AuthorizationCheckState;
  authenticated_revocation_ok: AuthorizationCheckState;
  durable_consumption_ok: AuthorizationCheckState;
};

function phaseState(
  underlying: IndependentVerifierResult,
  phaseId: string,
): AuthorizationCheckState {
  const row = underlying.phases.find((phase) => phase.id === phaseId);
  if (!row) return "unconfirmed";
  if (row.status === "pass") return "confirmed";
  if (row.status === "fail" || row.status === "blocked") return "failed";
  return "unconfirmed";
}

function combineStates(states: AuthorizationCheckState[]): AuthorizationCheckState {
  if (states.some((state) => state === "failed")) return "failed";
  if (states.every((state) => state === "confirmed")) return "confirmed";
  return "unconfirmed";
}

export function deriveAuthorizationChecks(input: {
  verifier: IndependentVerifierResult;
  presentationResult: InstitutionalPresentationVerificationResult;
  portableRevocationRequired: boolean;
  replayDetected: boolean;
  durableConsumptionRecorded: boolean;
}): DerivedAuthorizationChecks {
  const underlying = input.verifier;

  const signature_authentic = combineStates([
    phaseState(underlying, "payload_integrity"),
    phaseState(underlying, "signature_authenticity"),
  ]);

  const issuer_trusted = phaseState(underlying, "issuer_key");

  const tenant_scope_ok = phaseState(underlying, "audience_binding");
  const policy_binding_ok = phaseState(underlying, "policy_scope");
  const lifetime_ok = input.presentationResult.rejection_reasons.includes("expired")
    ? "failed"
    : phaseState(underlying, "temporal_validity");

  let authenticated_revocation_ok: AuthorizationCheckState = "unconfirmed";
  if (input.portableRevocationRequired) {
    if (input.presentationResult.portable_revocation_authenticated === true) {
      authenticated_revocation_ok = "confirmed";
    } else if (
      input.presentationResult.rejection_reasons.some((code) =>
        code.includes("revocation")
        || code.includes("portable_revocation"),
      )
    ) {
      authenticated_revocation_ok = "failed";
    } else {
      authenticated_revocation_ok = "failed";
    }
  }

  let durable_consumption_ok: AuthorizationCheckState = "unconfirmed";
  if (input.replayDetected) {
    durable_consumption_ok = "failed";
  } else if (input.durableConsumptionRecorded) {
    durable_consumption_ok = "confirmed";
  } else if (input.presentationResult.rejection_reasons.includes("durable_store_required")) {
    durable_consumption_ok = "failed";
  }

  return {
    signature_authentic,
    issuer_trusted,
    tenant_scope_ok,
    policy_binding_ok,
    lifetime_ok,
    authenticated_revocation_ok,
    durable_consumption_ok,
  };
}

export function allAuthorizationChecksConfirmed(checks: DerivedAuthorizationChecks): boolean {
  return Object.values(checks).every((state) => state === "confirmed");
}
