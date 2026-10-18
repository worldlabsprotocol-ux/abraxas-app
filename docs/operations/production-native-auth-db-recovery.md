# Production native auth DB recovery (144 + 145)

**Project:** `bztwutzprwsdrtqdpymf` only. **Not** staging `ocntwbxarpjeixdnzide`.

Operator authorization required before SQL apply. After merge of operational gate (Phase A code), Connect falls back to `/passport` while schema is missing even if the Vercel flag remains `true`.

## Apply

1. Confirm Supabase backup / PITR on `bztwutzprwsdrtqdpymf`.
2. Run `supabase/migrations/144_native_account_webauthn.sql`.
3. Run `supabase/migrations/145_abraxas_webauthn_hardening.sql`.
4. Run `scripts/operations/native-auth-post-migration-validation.sql` (add script if missing from branch).
5. Verify `GET https://abraxasworld.xyz/api/auth/native/enabled` → `operational: true`, `schema.ok: true`.
6. Verify `POST .../passkey/authenticate/options` → **200**.

## Optional Phase B on Vercel (after schema green)

Set `ABRAXAS_NATIVE_ACCOUNT_PG=1` and `ABRAXAS_NATIVE_ACCOUNT_DATABASE_URL` (direct Postgres pooler URL to the same database). Redeploy. Native path then uses `pg` instead of PostgREST SDK.
