# 092 Wallet Standard action bindings

Migration: `supabase/migrations/092_wallet_standard_action_bindings.sql`

This public Wallet Standard binding and Trading Venue nonce consume feature **requires 092 on Production** before go-live. It is also required on isolated DEMO. There is no in-process fallback in DEMO or Production.

Do not put secrets, service-role keys, HMAC keys, wallet addresses, signatures, or seed phrases in this document or in apply tickets.

## Security model

- Tenant-scoped tables: `wallet_standard_challenges`, `wallet_standard_bindings`, `partner_venue_action_nonces`
- Service-role only. RLS enabled. `anon` and `authenticated` have no grants
- Persist HMAC-SHA256 hashes and opaque `binding_ref` values only
- Never persist raw public keys, addresses, signatures, seed phrases, balances, trading history, or transactions
- Atomic consume RPCs enforce expiry, one-time challenge consume, one-time binding consume, one-time venue nonce consume, and binding revocation
- Unique indexes prevent nonce and message replay inside a tenant

## DEMO apply

1. Confirm the target is the isolated DEMO project, not Production.
2. Open the DEMO SQL editor.
3. Paste the full contents of `092_wallet_standard_action_bindings.sql`.
4. Run once. The script is idempotent.
5. Confirm the three tables exist and RLS is enabled.

## Production apply

1. Apply only after DEMO apply succeeded and this feature is approved for Production.
2. Open the Production SQL editor. Do not reuse DEMO connection strings.
3. Paste the same 092 file and run once.
4. Reload the PostgREST schema cache.
5. Missing 092 must fail closed with `store_unavailable`.

Do not auto-apply from Vercel.
