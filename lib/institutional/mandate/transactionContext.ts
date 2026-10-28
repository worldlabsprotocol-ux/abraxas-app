// FILE: lib/institutional/mandate/transactionContext.ts
// Build 886 — immutable protected transaction context (relying-party trusted state).

import { createHash } from "node:crypto";
import { canonicalizeJson } from "@/lib/decisionReceipts/canonical";
import type { ProposedInstitutionalTransaction } from "@/lib/institutional/transactionMandateEnforcement";

export const PROTECTED_TRANSACTION_CONTEXT_DOMAIN = "abraxas_protected_transaction_context/v1" as const;

export type ProtectedActionExecutionContext = {
  execution_id: string;
  transaction: ProposedInstitutionalTransaction;
  /** Set server-side when the execution is created; must match hashProposedInstitutionalTransaction(transaction). */
  context_digest: string;
};

export function hashProposedInstitutionalTransaction(transaction: ProposedInstitutionalTransaction): string {
  const body = canonicalizeJson({
    domain: PROTECTED_TRANSACTION_CONTEXT_DOMAIN,
    kind: transaction.kind,
    amount_usd: transaction.amount_usd,
    destination_fingerprint: transaction.destination_fingerprint,
    actor_wallet: transaction.actor_wallet,
    tenant_id: transaction.tenant_id,
    policy_id: transaction.policy_id,
    policy_version: transaction.policy_version,
  });
  return createHash("sha256").update(body, "utf8").digest("hex");
}

/** Call when the relying party first records the protected action (server-side). */
export function sealProtectedActionExecutionContext(
  execution_id: string,
  transaction: ProposedInstitutionalTransaction,
): ProtectedActionExecutionContext {
  return {
    execution_id,
    transaction,
    context_digest: hashProposedInstitutionalTransaction(transaction),
  };
}

export function verifyProtectedActionExecutionContext(
  ctx: ProtectedActionExecutionContext,
): { ok: true } | { ok: false; reason: string } {
  const expected = hashProposedInstitutionalTransaction(ctx.transaction);
  if (expected !== ctx.context_digest) {
    return { ok: false, reason: "protected_transaction_context_digest_mismatch" };
  }
  if (!ctx.execution_id.trim()) {
    return { ok: false, reason: "protected_execution_id_missing" };
  }
  return { ok: true };
}
