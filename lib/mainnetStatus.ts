// FILE: lib/mainnetStatus.ts
// Honest mainnet rollout signals for the landing status card.

export type GateStatus = "live" | "in_progress" | "planned";

export interface MainnetGate {
  id: string;
  label: string;
  status: GateStatus;
}

export const MAINNET_GATES: MainnetGate[] = [
  { id: "verify", label: "Public verify + registry", status: "live" },
  { id: "passport", label: "Passport + policy engine", status: "live" },
  { id: "proof", label: "Cryptographic proof loop", status: "in_progress" },
  { id: "monitoring", label: "Asset monitoring worker", status: "in_progress" },
  { id: "sui-mainnet", label: "Sui Passport mainnet", status: "planned" },
  { id: "external-rp", label: "External relying party", status: "planned" },
  { id: "self-serve", label: "Self-serve integrate path", status: "planned" },
];

export function mainnetGateProgress(): { done: number; total: number } {
  const done = MAINNET_GATES.filter((g) => g.status === "live").length;
  return { done, total: MAINNET_GATES.length };
}

export const HOMEPAGE_STATUS_LEAD =
  "Live today — verification, Passport, and public registry checks are in production. Full mainnet rollout is staged gate-by-gate.";

export const HOMEPAGE_STATUS_ITEMS: { label: string; status: GateStatus }[] = [
  { label: "Verification + Passport", status: "live" },
  { label: "Cielo reference loop", status: "live" },
  { label: "Cryptographic proofs", status: "in_progress" },
  { label: "Sui mainnet deploy", status: "in_progress" },
];
