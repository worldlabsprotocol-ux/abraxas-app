// FILE: lib/design/routeAccent.ts
// Maps route prefixes to AbxTabAccent for consistent shell styling.

import type { AbxTabAccent } from "./abraxasDesignSystem";

const PREFIX_ACCENTS: Array<{ prefix: string; accent: AbxTabAccent }> = [
  { prefix: "/passport", accent: "passport" },
  { prefix: "/partner", accent: "partner" },
  { prefix: "/good-trouble", accent: "partner" },
  { prefix: "/verify", accent: "verify" },
  { prefix: "/admin", accent: "admin" },
  { prefix: "/docs", accent: "developer" },
  { prefix: "/developers", accent: "developer" },
  { prefix: "/integrate", accent: "developer" },
  { prefix: "/integrations", accent: "developer" },
  { prefix: "/design-partner", accent: "developer" },
  { prefix: "/examples", accent: "developer" },
  { prefix: "/demo", accent: "developer" },
  { prefix: "/legal", accent: "legal" },
  { prefix: "/auth", accent: "passport" },
  { prefix: "/account", accent: "passport" },
  { prefix: "/api/auth", accent: "passport" },
  { prefix: "/connect", accent: "passport" },
  { prefix: "/payment", accent: "partner" },
  { prefix: "/cielo", accent: "home" },
  { prefix: "/marketplace", accent: "home" },
  { prefix: "/vault", accent: "home" },
  { prefix: "/build", accent: "home" },
  { prefix: "/swap", accent: "home" },
  { prefix: "/investors", accent: "home" },
  { prefix: "/security", accent: "home" },
];

export function accentForPath(pathname: string): AbxTabAccent {
  const path = pathname.split("?")[0] ?? "/";
  if (path === "/" || path === "/terminal") return "home";
  for (const { prefix, accent } of PREFIX_ACCENTS) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return accent;
  }
  return "neutral";
}

export function maxWidthForPath(pathname: string): number {
  const path = pathname.split("?")[0] ?? "/";
  if (path.startsWith("/docs") || path.startsWith("/admin")) return 980;
  if (path.startsWith("/partner") || path.startsWith("/auth")) return 560;
  if (path.startsWith("/passport")) return 720;
  return 900;
}
