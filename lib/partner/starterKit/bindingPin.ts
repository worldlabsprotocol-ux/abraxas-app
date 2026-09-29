// FILE: lib/partner/starterKit/bindingPin.ts
// Resolved binding pin for starter-kit generation.

import type { ResolvedApplicationPolicyBinding } from "@/lib/partner/launchpad/policyBindingContract";

export interface StarterKitBindingPin {
  application_id: string;
  binding_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  pack_id: string;
  result_family: string;
  environment: "sandbox" | "production";
  policy_label: string;
}

export function starterKitPinFromBinding(
  binding: ResolvedApplicationPolicyBinding,
  policyLabel: string,
): StarterKitBindingPin {
  return {
    application_id: binding.application_id,
    binding_id: binding.binding_id,
    partner_id: binding.partner_id,
    policy_id: binding.policy_id,
    policy_version: binding.policy_version,
    pack_id: binding.pack_id,
    result_family: binding.result_family,
    environment: binding.environment,
    policy_label: policyLabel,
  };
}
