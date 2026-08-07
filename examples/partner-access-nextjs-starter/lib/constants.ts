// FILE: examples/partner-access-nextjs-starter/lib/constants.ts
// Paths and labels for the reference Next.js partner access starter.

export const STARTER_BASE_PATH = "/examples/partner-access-starter";

export const STARTER_ROUTES = {
  entry: STARTER_BASE_PATH,
  callback: `${STARTER_BASE_PATH}/callback`,
  protected: `${STARTER_BASE_PATH}/protected`,
  verifyApi: "/api/examples/partner-access-starter/session",
  logoutApi: "/api/examples/partner-access-starter/logout",
} as const;

export const STARTER_SESSION_COOKIE = "abraxas_partner_access_starter";

export const STARTER_LABEL =
  "REFERENCE STARTER — Abraxas Partner Access (x402-agnostic). Not production.";
