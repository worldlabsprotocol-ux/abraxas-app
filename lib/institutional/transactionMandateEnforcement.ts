// FILE: lib/institutional/transactionMandateEnforcement.ts
// Build 883 — transaction-specific mandate gate for relying parties (synthetic demo contract).
// Does not replace custody RBAC; runs after Abraxas independent verification when configured.

export type TransactionScopeKind = "collateral_release";

export type SyntheticInstitutionalMandate = {
  mandate_id: string;
  issuer_id: string;
  tenant_id: string;
  policy_id: string;
  policy_version: number;
  authorized_actor_wallet: string;
  transaction_scope: {
    kind: TransactionScopeKind;
    max_amount_usd: number;
    destination_fingerprint: string;
  };
  not_before_iso: string;
  not_after_iso: string;
  revoked_at_iso?: string | null;
};

export type ProposedInstitutionalTransaction = {
  kind: TransactionScopeKind;
  amount_usd: number;
  destination_fingerprint: string;
  actor_wallet: string;
  tenant_id: string;
  policy_id: string;
  policy_version: number;
};

export type MandateEnforcementOutcome = "permit" | "deny" | "indeterminate";

export type MandateEvaluationResult = {
  outcome: MandateEnforcementOutcome;
  reasons: string[];
};

/**
 * Relying-party enforcement: Abraxas wallet_control receipt ≠ institutional signing mandate.
 * Caller must already have verified Abraxas receipt + status independently when using in production.
 */
export function evaluateTransactionMandate(input: {
  mandate: SyntheticInstitutionalMandate | null;
  transaction: ProposedInstitutionalTransaction;
  now: Date;
  abraxas_receipt_verified?: boolean;
  abraxas_outcome?: "permit" | "deny" | "indeterminate";
}): MandateEvaluationResult {
  const reasons: string[] = [];

  if (input.abraxas_outcome === "indeterminate" || input.abraxas_outcome === "deny") {
    return {
      outcome: input.abraxas_outcome === "deny" ? "deny" : "indeterminate",
      reasons: [`abraxas_${input.abraxas_outcome}`],
    };
  }

  if (input.abraxas_receipt_verified !== true) {
    return { outcome: "indeterminate", reasons: ["abraxas_receipt_not_independently_verified"] };
  }

  if (!input.mandate) {
    return { outcome: "indeterminate", reasons: ["authoritative_mandate_missing"] };
  }

  const m = input.mandate;
  const t = input.transaction;
  const nowMs = input.now.getTime();

  if (m.revoked_at_iso) {
    return { outcome: "deny", reasons: ["mandate_revoked"] };
  }

  const notBefore = Date.parse(m.not_before_iso);
  const notAfter = Date.parse(m.not_after_iso);
  if (Number.isNaN(notBefore) || Number.isNaN(notAfter)) {
    return { outcome: "indeterminate", reasons: ["mandate_invalid_dates"] };
  }
  if (nowMs < notBefore) {
    return { outcome: "deny", reasons: ["mandate_not_yet_valid"] };
  }
  if (nowMs > notAfter) {
    return { outcome: "deny", reasons: ["mandate_expired"] };
  }

  if (m.tenant_id !== t.tenant_id) {
    return { outcome: "deny", reasons: ["tenant_mismatch"] };
  }
  if (m.policy_id !== t.policy_id) {
    return { outcome: "deny", reasons: ["policy_mismatch"] };
  }
  if (m.policy_version !== t.policy_version) {
    return { outcome: "deny", reasons: ["policy_version_mismatch"] };
  }
  if (m.authorized_actor_wallet !== t.actor_wallet) {
    return { outcome: "deny", reasons: ["actor_not_authorized"] };
  }
  if (m.transaction_scope.kind !== t.kind) {
    return { outcome: "deny", reasons: ["transaction_kind_mismatch"] };
  }
  if (t.amount_usd > m.transaction_scope.max_amount_usd) {
    return { outcome: "deny", reasons: ["amount_exceeds_mandate"] };
  }
  if (m.transaction_scope.destination_fingerprint !== t.destination_fingerprint) {
    return { outcome: "deny", reasons: ["destination_not_in_mandate_scope"] };
  }

  reasons.push("mandate_scope_satisfied");
  return { outcome: "permit", reasons };
}

/** Wallet-control qualification alone must not satisfy mandate enforcement. */
export function walletControlReceiptSatisfiesMandate(): false {
  return false;
}
