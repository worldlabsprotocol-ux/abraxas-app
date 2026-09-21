// FILE: lib/product/publicRouteManifest.ts
// Lightweight public-product route contract. DEMO hosting does not hide these surfaces.

export const PUBLIC_PRODUCT_ROUTES = [
  "/",
  "/passport",
  "/verification",
  "/verify",
  "/developers",
  "/developers/integration-studio",
  "/developers/launchpad",
  "/docs",
  "/docs/partner-flow",
  "/docs/policy-packs",
  "/docs/reusable-eligibility",
  "/docs/multichain-mainnet-readiness",
  "/docs/trading-venue",
  "/docs/trading-venue-profiles",
  "/docs/payment-authorization",
  "/docs/portable-action-contract",
  "/docs/chain-verifiable-attestations",
  "/docs/solana-onchain-eligibility-gate",
  "/docs/evm-onchain-eligibility-gate",
  "/docs/onchain-gate-deployments",
  "/docs/chain-attestation-signer-lifecycle",
  "/docs/reclaim-private-attestations",
  "/docs/eligibility-presentation-protocol",
  "/docs/cross-chain-protocol-access",
  "/docs/selective-disclosure",
  "/docs/hosted-partner-flow-handoff",
  "/docs/receipt-lifecycle-events",
  "/docs/wallet-standard-binding",
  "/docs/starter-kit",
  "/examples/trading-venue",
  "/examples/payment-authorization",
  "/good-trouble",
  "/flagship",
  "/case-studies/chickasaw-project",
] as const;

export type PublicProductRoute = (typeof PUBLIC_PRODUCT_ROUTES)[number];

export const PUBLIC_PRODUCT_ERROR_SURFACES = [
  "app/error.tsx",
  "app/global-error.tsx",
] as const;

export function publicPageFile(route: PublicProductRoute): string {
  if (route === "/") return "app/page.tsx";
  return `app${route}/page.tsx`;
}
