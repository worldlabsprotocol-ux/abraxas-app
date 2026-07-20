// FILE: lib/internalRoutes.ts
// Routes that must not be indexed or reachable in production (internal memo, outreach, etc.).

export const INTERNAL_ROUTE_PREFIXES = [
  "/investors/strategy",
  "/investors/updates",
  "/integrations/outreach",
] as const;

export function isInternalRoute(pathname: string): boolean {
  const p = pathname.split("?")[0] ?? pathname;
  return INTERNAL_ROUTE_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  );
}
