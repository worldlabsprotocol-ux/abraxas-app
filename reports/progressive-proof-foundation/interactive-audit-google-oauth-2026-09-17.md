# Interactive audit stop — Google `redirect_uri_mismatch` (PR #293)

**PR:** [#293](https://github.com/worldlabsprotocol-ux/abraxas-app/pull/293) — **unmerged**  
**Preview origin (OAuth):** `https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app`  
**Target SHA:** `7f5f9e1c` (unique deploy still live). Branch alias currently serves a later docs/script SHA; **app register/browse routes are unchanged vs `7f5f9e1c`**.  
**DEMO:** `ocntwbxarpjeixdnzide` — binding probe still PASS; MAIN/Production not touched.

## Step evidence

| Step | Result | Evidence |
|------|--------|----------|
| 1. Open Good Trouble browse in Desktop Chromium | **PASS** | `/partner/verify?partner_id=good-trouble-cannabis&policy_id=good-trouble-browse-v1&purpose=browse` — CTA **Create or open my Passport** |
| 2. Google sign-in | **FAIL — stopped** | Google `Error 400: redirect_uri_mismatch`. No account picker, no credentials entered. |
| 3. `POST /api/auth/zklogin/register` | **NOT REACHED** | Playwright monitor: no register request |
| 4. DOB self-attestation | **NOT RUN** | Blocked at step 2 |
| 5. DEMO callback + signed browse receipt | **NOT RUN** | Blocked at step 2 |
| 6. `valid_for_purchase=false` | **NOT RUN** | Blocked at step 2 |
| 7. Retail denial | **NOT RUN** | Blocked at step 2 |

## Live Google failure (traced)

**Client:** `540205907410-tua09ir2rv9serjhvlo50j7peom1i7tp.apps.googleusercontent.com`  
**Requested `redirect_uri` (exact):**

`https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app/auth/zklogin/callback`

This is same-origin (`window.location.origin` + `/auth/zklogin/callback`). Google rejected it as not registered on that OAuth client.

Repo setup doc still lists a **different** preview origin (`git-cursor-su-6b45a9-…`), plus production `https://abraxas-app.vercel.app/auth/zklogin/callback`.

**Fix (Google Cloud Console only — not Vercel Production / not MAIN Supabase):** add the exact Preview redirect URI (and JS origin) above to this OAuth client. Then retry Desktop sign-in in the same Chromium window.

Do **not** pin `NEXT_PUBLIC_ZKLOGIN_REDIRECT_URI` to production for this audit (that would land Preview sessions on Production after Google).

## Safety

- PR #293 not merged
- MAIN Supabase (`bztwutzprwsdrtqdpymf`) not queried or modified
- Production env / `abraxas-app.vercel.app` not changed
