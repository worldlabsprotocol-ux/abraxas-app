# Abraxas Passport — Solana Mobile (Clock In Hackathon MVP)

**Thesis:** Applications should receive proofs, not profiles.

Native Android app (Kotlin + Jetpack Compose + Mobile Wallet Adapter) demonstrating reusable Abraxas Passport claims and consent-based selective disclosure.

## Mock vs production

| Component | This MVP | Production |
|-----------|----------|------------|
| Wallet | MWA + sandbox fallback (`DEMO_MODE=true`) | MWA + Solana wallet binding API |
| Claims | `DemoSeed` local data | `GET /api/credentials/claims` |
| Proof signing | `SandboxSigner` in-app | Server `ABRAXAS_SIGNING_KEY` |
| Partner | In-app demo button | Good Trouble / partner verify flow |

**No DOB is stored.** Purchase authorization never accepts L0 browse receipts, URL flags, or session UI flags.

## Prerequisites

- JDK 17+
- Android SDK 34 (`ANDROID_HOME`)
- Physical Android device (Seeker recommended) or emulator API 26+
- Optional: Seed Vault, Phantom Mobile, or Solflare with MWA support

## Build & install

```bash
cd apps/abraxas-passport-android

# Generate wrapper if missing (first time only)
gradle wrapper --gradle-version 8.7

./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

APK path: `app/build/outputs/apk/debug/app-debug.apk`

## Run tests

```bash
# JVM unit tests (validators — no device)
./gradlew :app:testDebugUnitTest

# Monorepo security contract (CI)
cd ../..
npx vitest run lib/solanaMobile/mobileProofBoundary.test.ts
```

## Demo flow (3 minutes)

See [DEMO_SCRIPT.md](./DEMO_SCRIPT.md).

## Architecture

See [docs/SOLANA_MOBILE_CLOCK_IN_PLAN.md](../../docs/SOLANA_MOBILE_CLOCK_IN_PLAN.md).

## Environment

Copy [.env.example](./.env.example). Sandbox demo requires **no secrets**.

## Submission

See [SUBMISSION_CHECKLIST.md](./SUBMISSION_CHECKLIST.md).
