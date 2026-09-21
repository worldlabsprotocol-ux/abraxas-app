// FILE: lib/eligibilityPresentation/kit.ts
// Partner-server verification. Presentation is never sufficient without receipt re-fetch.

import type { AbraxasPartnerKit } from "@/lib/partner/integrationKit/client";
import { audienceHash } from "./opaque";
import { verifyEligibilityPresentation, type PresentationVerifyExpected } from "./verify";

export async function verifyPresentationWithKit(
  kit: AbraxasPartnerKit,
  envelope: unknown,
  expected: Omit<PresentationVerifyExpected, "audience_hash"> & { partnerId?: string; audience_hash?: string },
) {
  const audience = expected.audience_hash ?? audienceHash(expected.partnerId ?? kit.options.partnerId);
  const result = await verifyEligibilityPresentation({
    envelope,
    expected: {
      audience_hash: audience,
      verifier_nonce: expected.verifier_nonce,
      policy_id: expected.policy_id,
      policy_version: expected.policy_version,
      action: expected.action,
      environment: expected.environment,
    },
    fetchReceipt: async (receiptId) => {
      const fetched = await kit.fetchPublicReceipt(receiptId);
      if (!fetched.ok) return null;
      const receipt = fetched.receipt as unknown as Record<string, unknown>;
      return {
        receipt_id: String(receipt.receipt_id ?? receiptId),
        currently_valid: receipt.currently_valid === true,
        status: typeof receipt.status === "string" ? receipt.status : undefined,
        decision_result: typeof receipt.decision_result === "string" ? receipt.decision_result : undefined,
        policy_id: typeof receipt.policy_id === "string" ? receipt.policy_id : undefined,
        policy_version: typeof receipt.policy_version === "number" ? receipt.policy_version : undefined,
        withdrawn: receipt.withdrawn === true,
        revoked: receipt.status === "revoked",
      };
    },
  });
  return {
    ...result,
    presentation_sufficient: false as const,
    receipt_refetch_required: true as const,
  };
}
