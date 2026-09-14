// FILE: app/api/wallet/binding/confirm/route.ts
// Legacy Sui L3 binding — disabled (insecure, unauthenticated).

import { legacyWalletBindingDisabledResponse } from "@/lib/auth/legacyAuthRoutes";

export async function POST() {
  return legacyWalletBindingDisabledResponse();
}
