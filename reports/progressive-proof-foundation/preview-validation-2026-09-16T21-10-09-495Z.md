# PR #293 Preview Validation

- **Preview:** https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app
- **Deployed SHA:** `d09c89c8`
- **Bypass configured:** no
- **Timestamp:** 2026-09-16T21:10:09.495Z

## Results

- PASS **policy: browse L0 claim satisfies browse policy**: decision=approved
- PASS **policy: browse receipt cannot satisfy retail**: decision=denied; missing=identity_verified,liveness_passed,wallet_binding_confirmed,residency_country
- PASS **policy: browse claim cannot satisfy Stocklana-like policy**: decision=denied
- PASS **policy: expired browse claim fails closed**: decision=denied
- PASS **policy: revoked browse claim fails closed**: decision=denied
- PASS **policy: wrong-policy browse claim fails closed**: decision=denied
- FAIL **api: preview API checks**: skipped — bypass secret not configured
- FAIL **browser: preview UI checks**: skipped — bypass secret not configured

## First failure

- **api: preview API checks**: skipped — bypass secret not configured

Screenshots: `/opt/cursor/artifacts/screenshots/pr293-validation`