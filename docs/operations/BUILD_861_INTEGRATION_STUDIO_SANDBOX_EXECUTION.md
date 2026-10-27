# Build 861 — Integration Studio sandbox execution

## Implemented

- Sandbox stage title **Create your sandbox**; primary action **Create sandbox** (no duplicated “Create · …” heading).
- Selected policy pack shown on sandbox stage; create blocked until Step 1 pack is chosen.
- Client fail-closed when provisioned `policy_template_id` does not match selected pack.
- Callback field copy clarifies integration return URL vs marketing site.
- After successful create, hash advances to **#configuration**; primary CTAs **Run test verification** and **Review configuration**.
- Production upgrade de-emphasized (collapsed details).

## Reused endpoints

- `POST /api/developers/integration-studio` → `createStudioSandbox` → `provisionLaunchpadSandbox`
- Existing Launchpad session cookie attach on one-time API key
- Request/configuration stages unchanged (harness + independent verify)

## Tests

- `lib/partner/integrationStudio/integrationStudioSandboxStage.test.ts`
- Updated staging Playwright selectors for **Create sandbox**
- `lib/partner/integrationStudio/integrationStudio.test.ts` (CTA strings)

## Not in scope / remaining

- Full receipt adversarial matrix on staging (requires Launchpad-connected deployment).
- Production callback allowlist enforcement unchanged (existing `validateLaunchpadReturnUrl`).
