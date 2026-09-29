// FILE: lib/partner/launchpad/resolveApplicationPolicyBinding.ts
// Trusted server-side resolver for application policy bindings. Fail closed.

import { resolvePolicyPack, policyPackIsSandboxOnly } from "@/lib/partner/launchpad/policyPacks";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  listApplicationPolicyBindings,
  type ApplicationPolicyBindingRow,
} from "@/lib/partner/launchpad/applicationPolicyBindings";
import type {
  ResolveApplicationPolicyBindingResult,
  ResolvedApplicationPolicyBinding,
} from "@/lib/partner/launchpad/policyBindingContract";

export function primaryBindingId(applicationId: string): string {
  return `primary:${applicationId}`;
}

function bindingIsProductionActive(binding: ApplicationPolicyBindingRow): boolean {
  if (binding.production_status === "production_suspended") return false;
  if (binding.production_status === "production_active") return Boolean(binding.production_authorized_at);
  return Boolean(binding.production_authorized_at) && binding.production_status !== "production_rejected";
}

export function resolveBindingEnvironment(input: {
  binding: ApplicationPolicyBindingRow;
  application: LaunchpadApplicationRow;
}): "sandbox" | "production" {
  const appProductionActive = input.application.environment === "production"
    && Boolean(input.application.production_activated_at);
  if (!appProductionActive) return "sandbox";
  if (bindingIsProductionActive(input.binding)) return "production";
  if (input.binding.binding_role === "primary" && appProductionActive) {
    return input.binding.production_authorized_at ? "production" : "sandbox";
  }
  return "sandbox";
}

export function bindingProductionAuthorized(input: {
  binding: ApplicationPolicyBindingRow;
  application: LaunchpadApplicationRow;
}): boolean {
  const pack = resolvePolicyPack(input.binding.policy_template_id);
  if (!pack || policyPackIsSandboxOnly(pack)) return false;
  const appProductionActive = input.application.environment === "production"
    && Boolean(input.application.production_activated_at);
  if (!appProductionActive) return false;
  if (input.binding.status !== "active") return false;
  if (input.binding.production_status === "production_suspended") return false;
  if (bindingIsProductionActive(input.binding)) return true;
  if (input.binding.binding_role === "primary" && appProductionActive) return true;
  return false;
}

export function materializeResolvedBinding(input: {
  binding: ApplicationPolicyBindingRow;
  application: LaunchpadApplicationRow;
}): ResolvedApplicationPolicyBinding | null {
  const pack = resolvePolicyPack(input.binding.policy_template_id);
  if (!pack) return null;
  const environment = resolveBindingEnvironment(input);
  return {
    binding_id: input.binding.id,
    application_id: input.binding.application_id,
    partner_id: input.binding.partner_id,
    policy_id: input.binding.policy_id,
    policy_version: input.binding.policy_version,
    pack_id: pack.id,
    result_family: pack.disclosed_result,
    environment,
    status: input.binding.status,
    binding_role: input.binding.binding_role,
    production_authorized: bindingProductionAuthorized(input),
    policy_production_eligible: !policyPackIsSandboxOnly(pack),
    created_at: input.binding.sandbox_configured_at ?? null,
  };
}

function findBindingRow(
  bindings: ApplicationPolicyBindingRow[],
  bindingId: string | null | undefined,
): ApplicationPolicyBindingRow | null {
  if (!bindingId) return null;
  return bindings.find((b) => b.id === bindingId) ?? null;
}

function activeBindings(bindings: ApplicationPolicyBindingRow[]): ApplicationPolicyBindingRow[] {
  return bindings.filter((b) => b.status === "active");
}

export async function resolveApplicationPolicyBinding(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
  bindingId?: string | null;
  requestedEnvironment?: "sandbox" | "production";
}): Promise<ResolveApplicationPolicyBindingResult> {
  if (input.application.partner_id !== input.partnerId) {
    return { ok: false, code: "POLICY_BINDING_TENANT_MISMATCH" };
  }

  const bindings = await listApplicationPolicyBindings(input.application);
  const active = activeBindings(bindings);

  let selected: ApplicationPolicyBindingRow | null = findBindingRow(active, input.bindingId ?? null);

  if (!selected && !input.bindingId) {
    if (active.length === 1) {
      selected = active[0]!;
    } else if (active.length > 1) {
      return { ok: false, code: "AMBIGUOUS_POLICY_BINDING" };
    }
  }

  if (!selected) {
    return { ok: false, code: "POLICY_BINDING_NOT_FOUND" };
  }

  if (selected.status !== "active") {
    return { ok: false, code: "POLICY_BINDING_NOT_ACTIVE" };
  }

  const resolved = materializeResolvedBinding({ binding: selected, application: input.application });
  if (!resolved) {
    return { ok: false, code: "POLICY_BINDING_NOT_FOUND" };
  }

  if (input.requestedEnvironment === "production") {
    if (!input.application.production_activated_at || input.application.environment !== "production") {
      return { ok: false, code: "PRODUCTION_BINDING_NOT_AUTHORIZED" };
    }
    if (!resolved.production_authorized) {
      return { ok: false, code: "PRODUCTION_BINDING_NOT_AUTHORIZED" };
    }
    if (selected.production_status === "production_suspended") {
      return { ok: false, code: "PRODUCTION_BINDING_NOT_AUTHORIZED" };
    }
  }

  if (input.requestedEnvironment && input.requestedEnvironment !== resolved.environment) {
    return { ok: false, code: "POLICY_BINDING_ENVIRONMENT_MISMATCH" };
  }

  return { ok: true, binding: resolved };
}

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
