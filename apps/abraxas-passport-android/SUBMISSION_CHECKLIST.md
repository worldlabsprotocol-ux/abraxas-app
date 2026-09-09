# Clock In submission checklist — Abraxas Passport

## Required artifacts

- [ ] **Android APK** — `app/build/outputs/apk/debug/app-debug.apk` (release optional)
- [ ] **GitHub repo** — branch `cursor/solana-mobile-passport-mvp-d541`
- [ ] **Demo video** (~3 min) — follow [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)
- [ ] **Pitch deck / brief** — thesis: proofs not profiles

## Technical requirements

- [ ] Integrates **Solana Mobile Stack** / **Mobile Wallet Adapter**
- [ ] Meaningful **mobile-native** UI (Compose, not WebView)
- [ ] Interacts with Solana wallet (MWA or documented sandbox fallback)
- [ ] **No weakening** of Abraxas web/Wix authorization controls

## Security demo points

- [ ] L0 browse proof **rejected** for L2+ purchase
- [ ] URL / session flags **not** shown as purchase authority
- [ ] No DOB / ID in logs or partner payload
- [ ] Automated tests: `lib/solanaMobile/mobileProofBoundary.test.ts` + `ProofValidatorTest.kt`

## Disclosure

- [ ] README states **mocked vs production** components
- [ ] No production secrets in repo
- [ ] No Production deploy or Supabase changes without approval

## Pre-submit verification

```bash
./gradlew :app:assembleDebug :app:testDebugUnitTest
cd ../.. && npx vitest run lib/solanaMobile/mobileProofBoundary.test.ts
```
