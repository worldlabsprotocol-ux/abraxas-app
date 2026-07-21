// FILE: lib/notify/legacyEmail.ts
// Optional legacy email — disabled by default. On-chain proof is primary.

import { sendAdminEmail, type AdminEmailInput } from "./adminResend";

export async function maybeLegacyAdminEmail(input: AdminEmailInput) {
  if (process.env.LEGACY_EMAIL_NOTIFY !== "true") {
    return { ok: true, skipped: true, reason: "on_chain_primary" };
  }
  return sendAdminEmail(input);
}
