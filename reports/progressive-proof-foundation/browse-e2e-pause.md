# Pause — human Google sign-in required (PR #293)

**Preview:** https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app  
**Deployed SHA:** `b9a12655` (CI green; includes DEMO reference-partner browse callback)

## Exact action (one human step)

1. Open the Good Trouble **browse** partner verify URL below (Abraxas DEMO callback — not Good Trouble Wix):

   https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app/partner/verify?partner_id=good-trouble-cannabis&policy_id=good-trouble-browse-v1&purpose=browse&return_url=https%3A%2F%2Fabraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app%2Fdemo%2Freference-partner%2Fbrowse-callback

2. If Vercel Deployment Protection appears, authenticate with your team SSO (one time).

3. Click **Continue with Google** and complete Google OAuth with a test account. Do **not** upload documents or start Veriff at this step.

4. Reply **“signed in”** so the agent can run phase 2 (`--resume`): DOB self-attest → signed browse receipt → DEMO callback → `valid_for_purchase: false` + retail denial proof.

**DEMO callback (receipt lands here):**  
`https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app/demo/reference-partner/browse-callback`
