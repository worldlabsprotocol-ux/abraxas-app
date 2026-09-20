// FILE: lib/partner/evmWalletBinding/migrationPlan.ts

export const EVM_WALLET_MIGRATION_PLAN = {
  file: "094_evm_wallet_control_bindings.sql",
  required_on_production_for_this_feature: true,
  required_on_demo_for_this_feature: true,
  never_auto_apply_from_vercel: true,
  apply_demo_then_production: true,
  demo_steps: [
    "Confirm you are targeting the isolated DEMO project, not Production.",
    "Open the DEMO SQL editor and paste the full contents of supabase/migrations/094_evm_wallet_control_bindings.sql.",
    "Run the script once. It is idempotent.",
    "Confirm tables evm_wallet_challenges and evm_wallet_bindings exist.",
    "Confirm RLS is enabled and anon/authenticated have no grants.",
    "Do not paste service-role keys, HMAC secrets, addresses, or signatures into tickets or docs.",
  ],
  production_steps: [
    "Apply 094 only after DEMO apply succeeded and this feature is approved for Production.",
    "Open the Production SQL editor and paste the same 094 file. Do not reuse DEMO connection strings.",
    "Run the script once. It is idempotent.",
    "Reload the PostgREST schema cache.",
    "Missing 094 must fail closed with store_unavailable. There is no memory fallback.",
  ],
  stores_only:
    "HMAC-SHA256 hashes of origin, policy, action, network, nonce, message, and normalized address plus opaque binding_ref, expiry, revocation, and reason_class. Never signatures, raw addresses, message text, RPC data, balances, or transactions.",
} as const;
