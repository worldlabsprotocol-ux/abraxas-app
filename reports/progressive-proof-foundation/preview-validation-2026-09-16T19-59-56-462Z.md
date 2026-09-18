# PR #293 Preview Validation

- **Preview:** https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app
- **Deployed SHA:** `6ce7562e`
- **Bypass configured:** no
- **Timestamp:** 2026-09-16T19:59:56.462Z

## Results

- PASS **policy: browse L0 claim satisfies browse policy**: decision=approved
- PASS **policy: browse receipt cannot satisfy retail**: decision=denied; missing=identity_verified,liveness_passed,wallet_binding_confirmed,residency_country
- PASS **policy: browse claim cannot satisfy Stocklana-like policy**: decision=denied
- PASS **policy: expired browse claim fails closed**: decision=denied
- PASS **policy: revoked browse claim fails closed**: decision=denied
- PASS **policy: wrong-policy browse claim fails closed**: decision=denied
- FAIL **api: invalid browse receipt rejected**: status=401
- FAIL **api: protocol status reachable**: 302 https://vercel.com/sso-api?url=https%3A%2F%2Fabraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app%2Fapi%2Fprotocol%2Fstatus&nonce=9a471bbf57e81d2d3ca3d69be9a09ddbc82eeca0df557c00e9ff9ce39202557f
- FAIL **redirect: /api/health chain**: 302→https://vercel.com/sso-api?url=https%3A%2F%2Fabraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app%2Fapi%2Fhealth&nonce=913ad191835cecf4b26e532396001e47dd11adf26e66ca2b481f8ba9c3de5e97
- FAIL **preview bypass**: VERCEL_PROTECTION_BYPASS or VERCEL_AUTOMATION_BYPASS_SECRET required

## First failure

- **api: invalid browse receipt rejected**: status=401

Screenshots: `/opt/cursor/artifacts/screenshots/pr293-validation`