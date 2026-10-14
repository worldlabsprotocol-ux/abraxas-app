// FILE: lib/idv/biometric/resolveCapturePolicy.ts
// Optional partner policy context for capture-time biometric thresholds.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import { getPolicy } from "@/lib/verification/requestsService";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";

export interface CaptureBiometricPolicyContext {
  partnerId?: string;
  policyId?: string;
  policyRules?: PartnerPolicyRules | null;
}

export async function resolveCaptureBiometricPolicy(
  supabase: SupabaseClient | null,
  input: {
    policyId?: string | null;
    partnerId?: string | null;
    verificationRequestId?: string | null;
  },
): Promise<CaptureBiometricPolicyContext> {
  const verificationRequestId = input.verificationRequestId?.trim();
  if (verificationRequestId && persistenceUsesDirectPostgres()) {
    const { getVerificationRequestDirect } = await import("@/lib/persistence/policyDirectStore");
    const data = await getVerificationRequestDirect(verificationRequestId);
    if (data?.policy_id) {
      const { getPartnerPolicyDirect } = await import("@/lib/persistence/policyDirectStore");
      const policy = await getPartnerPolicyDirect(data.policy_id);
      return {
        partnerId: data.partner_id ?? undefined,
        policyId: data.policy_id,
        policyRules: policy?.rules_json ?? null,
      };
    }
  }
  if (verificationRequestId && supabase) {
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
    const policy = persistenceUsesDirectPostgres()
      ? await (await import("@/lib/persistence/policyDirectStore")).getPartnerPolicyDirect(policyId)
      : await getPolicy(policyId);
    return {
      partnerId: input.partnerId?.trim() || policy?.partner_id,
      policyId,
      policyRules: policy?.rules_json ?? null,
    };
  }

  return {};
}
