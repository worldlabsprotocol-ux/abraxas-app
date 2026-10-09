// FILE: examples/good-trouble-wix/backend/pkceEscrowPepperWix.js
// Production Wix Secrets Manager binding — import only from backend service modules.

import { getSecret } from "wix-secrets-backend";
import { fetchPkceEscrowPepper } from "./pkceEscrowPepper.js";

/** Load escrow pepper via Wix Secrets Manager (fail closed on missing/invalid). */
export function loadPkceEscrowPepperFromWixSecrets() {
  return fetchPkceEscrowPepper({ getSecret });
}
