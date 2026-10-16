/** Minimal policy pack inference for receipt views — avoids Launchpad catalog in SDK bundle. */
export function inferPolicyPackFromPolicyId(policyId: string): { id: string } | null {
  if (policyId.includes("wallet")) return { id: "wallet_control" };
  return null;
}
