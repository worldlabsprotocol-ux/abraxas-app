// FILE: lib/partner/launchpad/policyChangeControlUi.ts
// Pure Launchpad Policies dark-launch helpers. Safe for client components.

export function shouldRenderPolicyChangeControlUi(
  available: boolean | null | undefined,
): boolean {
  return available === true;
}

export function launchpadHealthChecksForUi<T extends { id: string }>(
  checks: readonly T[],
  policyChangeControlAvailable: boolean,
): T[] {
  if (shouldRenderPolicyChangeControlUi(policyChangeControlAvailable)) {
    return [...checks];
  }
  return checks.filter((check) => check.id !== "policy_change_control");
}

export function withPolicyChangeControlUiFlag<T extends object>(
  workspace: T,
  available: boolean,
): T & { policy_change_control_available: boolean } {
  return {
    ...workspace,
    policy_change_control_available: available === true,
  };
}
