# Interactive audit stop — zklogin register failed (PR #293)

**PR:** [#293](https://github.com/worldlabsprotocol-ux/abraxas-app/pull/293) — **unmerged**  
**Required register result:** HTTP 2xx success  
**Observed:** `Failed to save identity` on **Production origin** `abraxasworld.xyz`  
**MAIN / Production:** not modified. MAIN Supabase not queried.

## Step evidence

| Step | Result | Evidence |
|------|--------|----------|
| Google sign-in (human) | Completed into a session that landed off Preview | Desktop Chrome after sign-in |
| `POST /api/auth/zklogin/register` | **FAIL — stopped** | `/passport?sign_in_error=Failed%20to%20save%20identity` |
| Register origin | **Production, not Preview** | Address bar host `abraxasworld.xyz` |
| DEMO `ocntwbxarpjeixdnzide` | No register upsert observed in DEMO logs for the walkthrough window | Edge/postgres logs: health `HEAD .../sui_zklogin_identities?select=id` only (13:21–13:27Z). No POST/PATCH identity save around sign-in. |
| DOB self-attestation | **NOT RUN** | No DOB form |
| DEMO callback + browse receipt | **NOT RUN** | Blocked |
| `valid_for_purchase=false` | **NOT RUN** | Blocked |
| Retail denial | **NOT RUN** | Blocked |

## Trace

1. Fresh Preview walkthrough opened `accounts.google.com/v3/signin/identifier` with Preview `redirect_uri` (`…git-cursor-pr-296681…/auth/zklogin/callback`) at ~13:27Z.
2. Playwright `waitForFunction` for post-Google Preview UI **timed out at 30 minutes**. The automated session exited before this follow-up.
3. After “signed in”, Desktop Chrome is on **`https://abraxasworld.xyz/passport?sign_in_error=Failed%20to%20save%20identity`**.
4. Callback maps register failure to that query (`app/auth/zklogin/callback/page.tsx` → `completeGoogleZkLogin` → `POST /api/auth/zklogin/register`). `router.replace("/passport?sign_in_error=…")` is **same-origin**, so register ran on **Production**.
5. Production register emits HTTP 500 `Failed to save identity` when the `sui_zklogin_identities` upsert errors (`app/api/auth/zklogin/register/route.ts`). That is the same user-visible string as the earlier Preview-bound-to-MAIN 42501 failure. Preview DEMO-bound register would have been 2xx or 503 `preview_supabase_not_demo_bound`.
6. DEMO logs did not show an identity upsert for this sign-in. MAIN was not queried.

## Why this is not the Preview DEMO path

Preview binding probe still reports all three refs = `ocntwbxarpjeixdnzide`. This failure did not use that Preview origin. Retrying Google on `abraxasworld.xyz` would hit Production again and is **out of scope**.

Next Preview retry must start from the Preview browse URL in a new Desktop Chromium session (not this Production passport tab), with a wait that outlasts human Google.

## Safety

- Did not merge PR #293
- Did not change Production env or MAIN Supabase
- Did not continue DOB / receipt / retail on Production
