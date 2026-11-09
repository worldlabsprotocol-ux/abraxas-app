// Plain explanation for a failed trust-execution attempt. No second call to action.

export function trustExecutionAttemptMessage(code: string): string | null {
  switch (code) {
    case "pending_receipt_requires_new_identity":
      return "The first signed record was kept for audit. Execute the decision again. Abraxas signs a separate receipt and finalizes it only after verification succeeds.";
    case "receipt_superseded":
      return "This signed record was replaced by a later verified decision. Refresh status to see the current receipt.";
    case "receipt_recovery_contended":
      return "Another attempt is still finishing for this authorization. Refresh status before executing again.";
    case "receipt_scope_mismatch":
      return "This authorization does not match the pending record. An operator must review the partner, policy, wallet, and application before anything can finalize.";
    case "receipt_not_pending":
      return "The existing receipt cannot be reused. An operator must review it before a new decision can finalize.";
    default:
      return null;
  }
}
