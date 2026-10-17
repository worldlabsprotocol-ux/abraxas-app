# Build #730 staging acceptance (operator)

See **`docs/build-730-staging-acceptance-report.md`** for the latest automated agent results.

## Quick checklist

1. **Database:** `ocntwbxarpjeixdnzide` (`abraxas-partner-demo`) — migrations **144** and **145** applied.
2. **Preview env:** native auth flag, account session secret, WebAuthn RP ID, Supabase URL + service role → same project ref.
3. **Access:** `vercel curl` or browser SSO to PR preview (not production).
4. **Tests:** `NATIVE_AUTH_BASE_URL=<preview> NATIVE_AUTH_SKIP_WEBSERVER=1 npx playwright test -c playwright.native-auth.config.ts`
5. **Sandbox:** `/welcome` → passkey → Start sandbox → Launchpad → create app → sign out → return.

Never set `ABRAXAS_NATIVE_ACCOUNT_MEMORY` on staging or production.
