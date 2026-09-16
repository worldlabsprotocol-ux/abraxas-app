# Pause — human Google sign-in required (PR #293)

**Preview:** https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app  
**Deployed SHA (at pause):** `d09c89c8` (CI green); bypass fix on `cb5cf4a9`

## Exact action

1. Open the Good Trouble **browse** partner verify URL (no bypass token in the URL):

   https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app/partner/verify?partner_id=good-trouble-cannabis&policy_id=good-trouble-browse-v1&purpose=browse&return_url=https%3A%2F%2Fwww.goodtroublecanna.com%2Fbrowse-callback

2. If Vercel Deployment Protection appears, authenticate with your team SSO (one time).

3. Click **Continue with Google** (retail path) or **Create or open my Passport** (browse DOB-first path after auth).

4. Complete Google OAuth with a test Google account. Do **not** upload documents or start Veriff at this step.

5. Reply **“signed in”** so the agent can run phase 2:

   ```bash
   PREVIEW_URL=https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app \
   VERCEL_PROTECTION_BYPASS=<your-secret> \
   DEPLOYED_SHA=cb5cf4a9 \
   npm run walkthrough:progressive-proof:browse-e2e -- --resume
   ```

## Phase 2 (after sign-in)

- Submit DOB self-attestation (over-21 test DOB)
- Capture `browse_receipt` on partner return URL
- Verify receipt is L0 / `valid_for_purchase: false`
- Confirm browse receipt **cannot** verify against `good-trouble-retail-v1`
