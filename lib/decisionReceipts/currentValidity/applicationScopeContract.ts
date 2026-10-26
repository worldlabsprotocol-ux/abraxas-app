// FILE: lib/decisionReceipts/currentValidity/applicationScopeContract.ts
// Storage-agnostic Launchpad application scope decision (no server-only imports).

export type ApplicationScopeEvaluation = {
  store_available: boolean;
  application_scope_satisfied: boolean;
  reasons: string[];
};

export type ApplicationScopeResolver = (input: {
  receiptId: string;
  partnerId: string;
  applicationId: string;
}) => Promise<ApplicationScopeEvaluation>;

/** Authoritative issuer-side state — not caller-supplied proof. */
export type AuthoritativeApplicationScopeFacts = {
  application_row_present: boolean;
  application_partner_id: string | null;
  application_status: string | null;
  binding_row_present: boolean;
  binding_application_id: string | null;
  binding_partner_id: string | null;
  binding_revoked_at: string | null;
};

export function deriveApplicationScopeFromAuthoritativeFacts(input: {
  expectedApplicationId: string;
  receiptPartnerId: string;
  store_available: boolean;
  facts: AuthoritativeApplicationScopeFacts | null;
}): ApplicationScopeEvaluation {
  if (!input.store_available || !input.facts) {
    return {
      store_available: false,
      application_scope_satisfied: false,
      reasons: ["validity_store_unavailable"],
    };
  }

  const reasons: string[] = [];
  const facts = input.facts;

  if (!facts.application_row_present) {
    reasons.push("application_unbound");
    return {
      store_available: true,
      application_scope_satisfied: false,
      reasons,
    };
  }

  if (facts.application_partner_id !== input.receiptPartnerId) {
    reasons.push("application_mismatch");
    return {
      store_available: true,
      application_scope_satisfied: false,
      reasons,
    };
  }

  if (facts.application_status !== "active") {
    reasons.push("application_inactive");
  }

  if (!facts.binding_row_present) {
    reasons.push("application_unbound");
  } else {
    if (facts.binding_partner_id !== input.receiptPartnerId) {
      reasons.push("application_mismatch");
    } else if (String(facts.binding_application_id) !== input.expectedApplicationId) {
      reasons.push("application_mismatch");
    } else if (facts.binding_revoked_at) {
      reasons.push("application_inactive");
    }
  }

  return {
    store_available: true,
    application_scope_satisfied: reasons.length === 0,
    reasons,
  };
}
