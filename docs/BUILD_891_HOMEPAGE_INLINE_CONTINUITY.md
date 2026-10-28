# Build 891 — Homepage inline workspace continuity (P0)

## Root cause (Production, Oct 28 2026)

Build 888 intentionally redirected authenticated ephemeral sessions with `router.replace("/developers/ephemeral-sandbox")` in `HomeSandboxSessionEntry` and `PublicNavConnectButton.finishSuccess()`. That re-mounted the **legacy six-stage** `UnifiedWorkspaceJourneyBar` developer route, which felt like a second onboarding flow after **Start building** on the homepage.

Production at merge **890** (`b7a31ae0`) still contained this redirect behavior.

## Fix

| Layer | Change |
| --- | --- |
| Homepage entry | When `ephemeral_sandbox_ready`, mount `HomeInlineSandboxWorkspace` → real `EphemeralSandboxWorkspaceClient` with `surface="homepage"`. |
| Navigation | Post-wallet success on `/` focuses `#start-sandbox`; no push to `/developers/ephemeral-sandbox`. |
| Resume | `postAuthResume` treats `/` as resumable. |
| Workspace client | Homepage surface hides journey bar + route URL sync; uses Abraxas emblem processing state. |

Advanced routes (`/developers/ephemeral-sandbox`, Integration Studio, Launchpad) unchanged for power users.

## Duplicate header CTA (same release)

`RedesignNav` rendered both `PublicNavConnectButton` (dark secondary) and `PublicNavPrimaryActionLink` (white). Consolidated to a single `PublicNavConnectButton headerPrimary` using the white `rd-nav-primary-action` styling and `resolvePublicNavPrimaryAction` for session-aware labels on `/`.

## Verify

```bash
npm run validate:typescript
./node_modules/.bin/vitest run lib/nav/postAuthResume.test.ts
npx playwright test tests/staging/homepage-inline-workspace-continuity.spec.ts
```

Manual: `https://abraxasworld.xyz/#start-sandbox` → wallet → remain on homepage document through next authorized task.

## Founder journey correction (Oct 28 follow-up)

| Issue | Root cause | Fix |
| --- | --- | --- |
| Compressed policy column | Nested `max-width: 36rem` / `42rem` on homepage panel + embedded studio grid beside inspector inside a narrow shell | Full-width homepage panel (`72rem` cap), homepage studio single-column layout, readable pack chips |
| New tab / route on Create your test app | `buildEphemeralSandboxCompletionView` primary action was a `Link` to `/developers/ephemeral-sandbox?integration=1…` | `inline_integrate` button on homepage; `applyHomepageInlineIntegrationSearch` keeps `/` + `#start-sandbox`; studio unlock is one task at a time |
| Wallet before integration context | Wallet auth was the first visible step | `HomeBuilderDiscovery` (platform + policy pack) in sessionStorage before wallet panels |
| Generic sign-in loader | Solana sign-in modal used green orbit placeholder | Official emblem via `AbraxasProcessingEmblem` |

```bash
npx playwright test tests/staging/homepage-founder-journey.spec.ts
npx playwright test tests/staging/homepage-inline-workspace-continuity.spec.ts
```
