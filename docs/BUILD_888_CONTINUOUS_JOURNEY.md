# Build 888 — One Continuous Product Journey

## Root causes (founder Production walkthrough)

| Failure class | Root cause | Fix |
| --- | --- | --- |
| `unknown_field` | Launchpad `POST …/starter-kit` merged `binding_id` into the body passed to `validateStarterKitInput`, which only allows generator keys. | `prepareLaunchpadStarterKitBody()` strips `binding_id` before validation. |
| Competing entry | Public header showed **Sign in** while hero and sandbox section showed **Start building**. | Header uses **Start building** for wallet authorization entry; sandbox step uses **Continue with wallet**. |
| Lost continuity after auth | Homepage left an extra **Open test workspace** step after ephemeral session was already valid. | Auto `router.replace("/developers/ephemeral-sandbox")` when session is ready; wallet success navigates directly. |
| Unclear test outcome | Harness only logged to inspector rail. | **Run test** shows emblem status plus permit/deny headline from authoritative harness result. |
| Pricing ambiguity | USDC plans rendered inline in configuration stage. | Collapsed under **Optional upgrade** disclosure; homepage states sandbox is free through first verification. |

## Founder acceptance (minimum path)

1. Homepage → **Start building** (header or hero).
2. **Continue with wallet** → Phantom approve → land in ephemeral sandbox (no second open workspace click on homepage when already signed in).
3. Wallet control proof → **Check your proof** → create test app with persisted `wallet_control` handoff query.
4. Launchpad → connect platform → **Generate integration files** (Wix Velo repro) succeeds.
5. Integration Studio → **Run test** → **Your test worked.** with receipt id.
6. No payment required to complete steps 1–5.

## Tests

```bash
npm run validate:typescript
./node_modules/.bin/vitest run lib/partner/starterKit/prepareLaunchpadStarterKitBody.test.ts lib/partner/launchpad/formatHarnessResultForBuilder.test.ts
npm run check:homepage-guard
```
