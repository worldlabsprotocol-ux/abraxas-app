# Build 872 — Unified workspace and real integration handoff

## Journey audit (root causes)

| Symptom | Root cause | Fix |
| --- | --- | --- |
| Competing header CTAs (language, Sign in, Start building, Launch App) | `RedesignNav` rendered four peer actions with similar weight | Single primary CTA via `PublicNavPrimaryActionLink`; Sign in secondary; Launch App moved to mobile Product drawer + existing Product menu |
| Authenticated user sees another “Start building” gate | `EphemeralSandboxWorkspaceClient` stopped in `ready` until manual `enterWorkspace()` | Auto-enter on authenticated `ready`; manual retry only when enter API returns recoverable `ready` |
| Sign-in restarts onboarding | `finishSuccess()` always routed to workspace root | `postAuthResume` sessionStorage restores `/developers/*` path |
| Language badge without trustworthy translation | Google Translate beta presented like native locale | `publicLocaleOptions` labels non-English as **Auto-translate (beta)**; English remains source |
| Verification complete but adoption unclear | Completion UI stopped at proof check / generic Studio link | `applicationHandoff` block (“Put it in your app”) with staged Studio path tied to policy |

## Reused components and endpoints

- Developer Workspace: `EphemeralSandboxWorkspaceClient`, `TrustExecutionTrace`, wallet action auth APIs
- Completion: `buildEphemeralSandboxCompletionView`, `EphemeralSandboxVerificationCompletion`
- Integration handoff: `buildIntegrationStudioHandoffUrl`, Integration Studio sandbox create flow
- Nav session probes: `/api/auth/native/enabled`, `/api/auth/wallet/session`
- Sandbox enter: `POST /api/auth/wallet/sandbox/enter`

## Protocol boundaries preserved

- Wallet connection, account session, sandbox authorization, and partner authorization remain separate
- No changes to independent verifier semantics (Build 870 remains separate)

## Verification

- Unit: `lib/nav/publicNavPrimaryAction.test.ts`, `lib/nav/postAuthResume.test.ts`, `lib/developers/ephemeralWorkspaceCompletion.test.ts`, `lib/design/publicSurface.test.ts`
- Playwright (staging): `tests/staging/homepage-mobile-nav.spec.ts` (primary CTA hierarchy)
- Deployed desktop/mobile journey + integration execution: run on Demo after merge (founder gate for 9/10 experience score)

## Remaining blockers

- First-time unaided completion rate ≥80% requires live cohort measurement on production/Demo
- Full Playwright wallet-sign journey needs deployed environment with operational wallet auth
