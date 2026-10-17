# Build #730 staging acceptance (operator)

See **`docs/build-730-staging-acceptance-report.md`** for the latest automated agent results.

## Quick checklist

1. **Database:** `ocntwbxarpjeixdnzide` (`abraxas-partner-demo`) — migrations **144** and **145** applied.
2. **Preview env:** native auth flag, account session secret, WebAuthn RP ID, Supabase URL + service role → same project ref.
3. **Access:** `vercel curl`, **`VERCEL_PROTECTION_BYPASS`** header, or Vercel SSO in browser (not production).
4. **Probe:** `VERCEL_PROTECTION_BYPASS=... ./scripts/build-730/preview-readiness-curl.sh <preview-url>` — expect `enabled: true` after Preview env is set.
5. **Tests:** `NATIVE_AUTH_BASE_URL=<preview> VERCEL_PROTECTION_BYPASS=... NATIVE_AUTH_SKIP_WEBSERVER=1 ./node_modules/.bin/playwright test -c playwright.native-auth.config.ts`
6. **Sandbox:** `/welcome` → passkey → Start sandbox → Launchpad → create app → sign out → return.

Never set `ABRAXAS_NATIVE_ACCOUNT_MEMORY` on staging or production.
