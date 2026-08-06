// FILE: scripts/verify-wallet-binding-schema.ts
// Read-only wallet_binding_challenges schema check for operators.

import {
  evaluateWalletBindingSchema,
  probeWalletBindingSchema,
  WALLET_BINDING_SCHEMA_MIGRATION,
} from "@/lib/walletBinding/schemaPreflight";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const offline = evaluateWalletBindingSchema(["id", "wallet_address", "message", "expires_at"]);
    console.log("Wallet binding schema preflight (offline mode — no Supabase credentials)");
    console.log(`Status: ${offline.status}`);
    console.log(`Compatible: ${offline.compatible}`);
    console.log(`Migration if needed: ${WALLET_BINDING_SCHEMA_MIGRATION}`);
    console.log(offline.operatorMessage);
    console.log("\nSet NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for a live probe.");
    process.exit(offline.compatible ? 0 : 1);
  }

  const sb = requireSupabaseAdmin();
  const result = await probeWalletBindingSchema(sb);
  console.log("Wallet binding schema preflight (live)");
  console.log(`Status: ${result.status}`);
  console.log(`Compatible: ${result.compatible}`);
  if (result.missingColumns.length) {
    console.log(`Missing columns: ${result.missingColumns.join(", ")}`);
  }
  console.log(result.operatorMessage);
  if (!result.compatible) {
    console.log(`\nApply: supabase/migrations/${result.migration}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
