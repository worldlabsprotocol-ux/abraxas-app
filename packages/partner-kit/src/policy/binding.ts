import type { ResolvedApplicationPolicyBinding } from "./policyBindingContract.js";

export function assertReceiptMatchesBinding(input: {
  binding: ResolvedApplicationPolicyBinding;
  receiptPolicyId?: string | null;
  receiptPolicyVersion?: number | null;
  receiptPartnerId?: string | null;
  receiptEnvironment?: "sandbox" | "production";
}): string[] {
  const errors: string[] = [];
  if (input.receiptPartnerId && input.receiptPartnerId !== input.binding.partner_id) {
    errors.push("RECEIPT_POLICY_MISMATCH");
  }
  if (input.receiptPolicyId && input.receiptPolicyId !== input.binding.policy_id) {
    errors.push("RECEIPT_POLICY_MISMATCH");
  }
  if (
    input.receiptPolicyVersion != null
    && input.receiptPolicyVersion !== input.binding.policy_version
  ) {
    errors.push("RECEIPT_POLICY_MISMATCH");
  }
  if (
    input.receiptEnvironment
    && input.receiptEnvironment !== input.binding.environment
  ) {
    errors.push("POLICY_BINDING_ENVIRONMENT_MISMATCH");
  }
  return errors;
}
