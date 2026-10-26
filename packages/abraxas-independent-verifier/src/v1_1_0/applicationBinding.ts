import { createHmac } from "node:crypto";
import { canonicalizeJson } from "../canonical";
import { APPLICATION_BINDING_SCOPE_SCHEMA } from "./constants";

export type ApplicationBindingScopeInput = {
  partner_id: string;
  policy_id: string;
  policy_version: number;
  decision_context: "production" | "sandbox_only";
  /** Authoritative Launchpad application id at issuance (never caller-supplied at verify time). */
  launchpad_application_id: string;
};

/** Issuer-side derivation. Scope secret is environment-scoped issuance material, not placed on receipts. */
export function deriveApplicationBindingRef(
  scope: ApplicationBindingScopeInput,
  scopeSecret: Buffer | string,
): string {
  const body = canonicalizeJson({
    schema: APPLICATION_BINDING_SCOPE_SCHEMA,
    partner_id: scope.partner_id,
    policy_id: scope.policy_id,
    policy_version: scope.policy_version,
    decision_context: scope.decision_context,
    launchpad_application_id: scope.launchpad_application_id,
  });
  return createHmac("sha256", scopeSecret).update(body, "utf8").digest("base64url");
}

export function verifyApplicationBindingRef(input: {
  receiptRef: string | null | undefined;
  expectedRef: string;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.receiptRef) return { ok: false, reason: "application_binding_missing" };
  if (input.receiptRef !== input.expectedRef) return { ok: false, reason: "application_binding_mismatch" };
  return { ok: true };
}
