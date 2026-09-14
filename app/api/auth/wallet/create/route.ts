// FILE: app/api/auth/wallet/create/route.ts
// Legacy unauthenticated Solana wallet creation — disabled.

import { legacyAuthRouteDisabledResponse } from "@/lib/auth/legacyAuthRoutes";

export async function POST() {
  return legacyAuthRouteDisabledResponse();
}
