// FILE: lib/product/publicRouteManifest.ts
// Lightweight public-product route contract. DEMO hosting does not hide these surfaces.

export const PUBLIC_PRODUCT_ROUTES = [
  "/",
  "/passport",
  "/developers",
  "/developers/integration-studio",
  "/docs/trading-venue",
  "/docs/payment-authorization",
  "/docs/portable-action-contract",
  "/docs/wallet-standard-binding",
  "/docs/starter-kit",
  "/examples/trading-venue",
  "/examples/payment-authorization",
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
