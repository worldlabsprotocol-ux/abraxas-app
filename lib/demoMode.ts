// FILE: lib/demoMode.ts
// Demo / sandbox surfaces are gated — never expose internal accounts in production.

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function isProductionDeploy(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

/** Server / isomorphic — hide sandbox UI in production unless DEMO_MODE. */
export function showPublicDemoSurfaces(): boolean {
  if (isDemoMode()) return true;
  return !isProductionDeploy();
}

/** Client-safe check (uses only NEXT_PUBLIC_* and NODE_ENV). */
export function showPublicDemoSurfacesClient(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return true;
  return process.env.NODE_ENV !== "production";
}
