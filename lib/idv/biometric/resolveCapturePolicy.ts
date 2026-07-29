// FILE: lib/idv/biometric/resolveCapturePolicy.ts
// Optional partner policy context for capture-time biometric thresholds.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import { getPolicy } from "@/lib/verification/requestsService";

export interface CaptureBiometricPolicyContext {
  partnerId?: string;
  policyId?: string;
  policyRules?: PartnerPolicyRules | null;
}

export async function resolveCaptureBiometricPolicy(
  supabase: SupabaseClient,
  input: {
    policyId?: string | null;
    partnerId?: string | null;
    verificationRequestId?: string | null;
  },
): Promise<CaptureBiometricPolicyContext> {
  const verificationRequestId = input.verificationRequestId?.trim();
  if (verificationRequestId) {
    const { data } = await supabase
      .from("verification_requests")
      .select("partner_id, policy_id")
      .eq("id", verificationRequestId)
      .maybeSingle();

    if (data?.policy_id) {
      const policy = await getPolicy(data.policy_id as string);
      return {
        partnerId: (data.partner_id as string) ?? undefined,
        policyId: data.policy_id as string,
        policyRules: policy?.rules_json ?? null,
      };
    }
  }

  const policyId = input.policyId?.trim();
  if (policyId) {
    const policy = await getPolicy(policyId);
    return {
      partnerId: input.partnerId?.trim() || policy?.partner_id,
      policyId,
      policyRules: policy?.rules_json ?? null,
    };
  }

  return {};
}
