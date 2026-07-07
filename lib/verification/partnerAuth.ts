// FILE: lib/verification/partnerAuth.ts
// Lightweight partner API key check for v1 verifier routes.

export function authenticatePartner(req: Request): { partnerId: string } | { error: string } {
  const headerKey = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const configured = process.env.PARTNER_API_KEY ?? process.env.ABRAXAS_PARTNER_API_KEY;
  const partnerId = process.env.PARTNER_ID ?? "abraxas";

  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      return { error: "Partner API not configured" };
    }
    return { partnerId };
  }

  if (!headerKey || headerKey !== configured) {
    return { error: "Invalid API key" };
  }

  return { partnerId };
}
