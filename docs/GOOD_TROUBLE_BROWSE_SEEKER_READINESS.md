# Good Trouble browse-first Seeker demo — readiness report

Branch: `cursor/good-trouble-browse-seeker-demo-5ffe`  
PR: https://github.com/worldlabsprotocol-ux/abraxas-app/pull/608

## Root causes addressed

1. **gtb loss on Abraxas redirects** — HttpOnly `gtb` binding cookie + partner-flow attach on evaluate/continue (mirrors purchase `gtv`).
2. **Browse callback trusted sessionStorage alone for PKCE** — Mobile/WebView context loss left callbacks without verifier proof. Browse now uses the same **CMS-sealed verifier escrow** as purchase (`ownershipProofHash`, `verifierSealed`, `GOOD_TROUBLE_PKCE_ESCROW_PEPPER`) plus a **separate** first-party cookie `gt_browse_pkce_flow_own` (`flowId|ownershipSecret`). Recovery requires matching ownership + escrow; **never** `gtb` or receipt id alone.
3. **Infinite “Checking verification”** — Browse callback arms `BROWSE_CALLBACK_COMPLETION_TIMEOUT_MS` (90s) with bounded transient retries; failures show persistent copy + `#restartAbraxasButton`.
4. **Age-gate loop after browse** — Successful browse calls `persistBrowseVerifiedState` (scoped, expiring L0 browse access — not checkout authority).
5. **Browse/purchase lifecycle bleed** — Prefix guards (`gtb_` vs `gtf_`), separate cookies, popup clears purchase session keys before browse start; purchase completion rejects `gtb_` at `invalid_flow_id`.

## Remaining limitations

- **Cross-browser / cross-device recovery** intentionally fails closed (no verifier in URL; ownership cookie is same-site only).
- **Physical Seeker E2E** not executed in CI — requires published Wix + Abraxas preview/production deploy and real OAuth/Passport on device.
- **Wix Secrets Manager** must be configured in the published site; missing pepper fails browse start with `pkce_escrow_secret_unavailable`.
- L0 browse receipt does **not** authorize regulated checkout (`purchaseEligibilityAuthorization` unchanged).

## Deployment consistency

| Surface | Requirement |
|---------|-------------|
| **Abraxas (Vercel)** | Deploy branch `cursor/good-trouble-browse-seeker-demo-5ffe` (or merge target) to the Good Trouble partner-flow environment used for Seeker demos — must include gtb cookie attach + browse Seeker demo entry on `/good-trouble`. |
| **Wix** | Publish site after copying **all** files in `docs/GOOD_TROUBLE_WIX_INSTALL_LINKS.md` and `examples/good-trouble-wix/WIX_DEPLOYMENT_MANIFEST.md` §A. |
| **CMS** | Collection `AbraxasVerificationNonces` with `ownershipProofHash`, `verifierSealed` fields (text). |
| **Secrets** | `GOOD_TROUBLE_PKCE_ESCROW_PEPPER` in Wix Secrets Manager (shared pepper, separate browse/purchase client ownership cookies). |

## Physical Seeker testing checklist

1. Real homepage age gate → **Verify with Abraxas (browse)** (not test-only URL).
2. Complete Abraxas hosted flow including **Google / Passport** resume; confirm return lands on `/browse-verification-result?gtb=…`.
3. See **Verification confirmed**, then auto-navigate to **`/goods`** within a few seconds.
4. Rotate to private tab mid-flow (or clear session storage via devtools) but keep same browser — callback should still complete if `gt_browse_pkce_flow_own` cookie present.
5. New browser profile — callback must **fail closed** with restart (no shop access from URL params alone).
6. Refresh `/goods` — legacy yes/no lightbox should **not** immediately reopen (browse suppress window).
7. **`/purchase-verification`** — browse L0 must **not** skip regulated purchase verification.
8. 360–430px width: no horizontal scroll on Wix-controlled callback pages.

## Install manifest

Full file list with GitHub links: **`docs/GOOD_TROUBLE_WIX_INSTALL_LINKS.md`**.  
Operator element IDs and CMS fields: **`examples/good-trouble-wix/WIX_DEPLOYMENT_MANIFEST.md`**.
