# Good Trouble Wix — GitHub install links

Copy sources from branch `cursor/good-trouble-age-security-hardening-5ffe` (or `main` after merge).  
Base repo: [worldlabsprotocol-ux/abraxas-app](https://github.com/worldlabsprotocol-ux/abraxas-app).

## Public (`src/public/`)

| Wix file | GitHub source |
|----------|----------------|
| `abraxasClientConstants.js` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/public/abraxasClientConstants.js |
| `ageGateAccessState.js` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/public/ageGateAccessState.js |
| `ageVerificationPopupLogic.js` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/public/ageVerificationPopupLogic.js |
| `purchaseCallbackLogic.js` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/public/purchaseCallbackLogic.js |
| `purchaseReturnDestination.js` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/public/purchaseReturnDestination.js |
| `purchaseVerificationLogic.js` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/public/purchaseVerificationLogic.js |
| `siteAgeGatePolicy.js` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/public/siteAgeGatePolicy.js |

## Backend (`src/backend/`)

Deploy all modules listed in `examples/good-trouble-wix/WIX_DEPLOYMENT_MANIFEST.md` §A. Key files:

| Wix file | GitHub source |
|----------|----------------|
| `constants.js` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/backend/constants.js |
| `abraxasReceiptValidator.js` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/backend/abraxasReceiptValidator.js |
| `abraxasVerificationService.js` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/backend/abraxasVerificationService.js |
| `abraxasVerification.web.js` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/backend/abraxasVerification.web.js |
| `nonceLifecycle.js` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/backend/nonceLifecycle.js |
| `returnDestinationPath.js` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/backend/returnDestinationPath.js |

## Page / lightbox code

| Wix target | GitHub source |
|------------|----------------|
| Age Verification lightbox | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/pages/AgeVerificationPopup.js |
| `/age-verification-result` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/pages/AgeVerificationResult.js |
| `/browse-verification-result` | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/pages/BrowseVerificationResult.js |
| Purchase Verification Entry (`/purchase-verification` recommended) | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/pages/PurchaseVerificationEntry.js |
| Master Page (site-wide age lightbox suppress) | https://github.com/worldlabsprotocol-ux/abraxas-app/blob/cursor/good-trouble-age-security-hardening-5ffe/examples/good-trouble-wix/pages/GoodTroubleMasterPage.js |

## Post-verification destination

- **The Goods** shop: `https://www.goodtroublecanna.com/goods` (slug **`/goods`**, confirmed via live sitemap).
- Default fallback when no safe origin was captured at flow start: **`/goods`**.

## Wix page configuration

| Page | Slug | Element ID | Label / behavior |
|------|------|------------|------------------|
| Age Verification | *(lightbox)* | `yesButton` | Traditional 21+ self-attestation |
| Age Verification | *(lightbox)* | `noButton` | Exit |
| Age Verification | *(lightbox)* | `abraxasButton` | Browse L0 Abraxas start |
| Age Verification | *(lightbox)* | `abraxasStatusText` | Status |
| Age Verification Result | `age-verification-result` | `abraxasStatusText` | Checking verification… |
| Age Verification Result | `age-verification-result` | `restartAbraxasButton` | Optional restart → `/` |
| Browse Verification Result | `browse-verification-result` | `abraxasStatusText` | Browse callback status |
| Purchase Verification Entry | `purchase-verification` | `purchaseAbraxasButton` | Hosted purchase / 21+ sandbox flow |
| Purchase Verification Entry | `purchase-verification` | `purchaseStatusText` | Start status (optional) |

Operator docs: `docs/GOOD_TROUBLE_WIX_SEEKER_HANDOFF.md`, `examples/good-trouble-wix/WIX_DEPLOYMENT_MANIFEST.md`.

## Mobile acceptance (Solana Seeker)

After publishing Wix changes, verify at **360–430px** width (normal mobile browser, not Desktop Site):

1. Purchase flow → Abraxas hosted attestation → Return → **Checking verification** → lands on **`/goods`** without horizontal page scroll on Wix pages you control.
2. Refresh **`/goods`** — sandbox yes/no lightbox does not reopen while server-bound purchase UI state is valid.
3. New private session — age gate returns for unverified visitors.
4. **`/purchase-verification`** — verified users redirect to **`/goods`** without looping through entry.
5. Invalid/missing PKCE on callback — error + restart; no shop access from query string alone.
