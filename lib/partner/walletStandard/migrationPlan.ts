// FILE: lib/partner/walletStandard/migrationPlan.ts
// Operator apply order. No secrets. Required before this public feature is live.

export const WALLET_STANDARD_MIGRATION_PLAN = {
  file: "092_wallet_standard_action_bindings.sql",
  required_on_production_for_this_feature: true,
  required_on_demo_for_this_feature: true,
  never_auto_apply_from_vercel: true,
  apply_demo_then_production: true,
  demo_steps: [
    "Confirm you are targeting the isolated DEMO project, not Production.",
    "Open the DEMO SQL editor and paste the full contents of supabase/migrations/092_wallet_standard_action_bindings.sql.",
    "Run the script once. It is idempotent.",
    "Confirm tables wallet_standard_challenges, wallet_standard_bindings, and partner_venue_action_nonces exist.",
    "Confirm RLS is enabled and anon/authenticated have no grants.",
    "Do not paste service-role keys, HMAC secrets, or wallet material into tickets or docs.",
  ],
  production_steps: [
    "Apply 092 only after DEMO apply succeeded and this feature is approved for Production.",
    "Open the Production SQL editor and paste the same 092 file. Do not reuse DEMO connection strings.",
    "Run the script once. It is idempotent.",
    "Reload the PostgREST schema cache.",
    "Missing 092 must fail closed with store_unavailable. There is no memory fallback.",
  ],
  stores_only: "HMAC-SHA256 hashes and opaque binding_ref values. Never signatures, addresses, seed phrases, balances, or transactions.",
} as const;
