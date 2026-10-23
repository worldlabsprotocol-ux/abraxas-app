# Abraxas — Production First Operating Standard

Repository: [worldlabsprotocol-ux/abraxas-app](https://github.com/worldlabsprotocol-ux/abraxas-app)

| Surface | URL |
| --- | --- |
| Production | https://abraxasworld.xyz |
| Demo | https://demo.abraxasworld.xyz |

## Principles

- **Production** is the primary customer experience and release destination.
- **Demo** validates new authentication, adversarial cases, and migrations before Production enablement.
- **GitHub `main`** is the authoritative release baseline. Feature-branch deployments may target Demo for testing; they are not official Production releases.
- **Acceptance** requires real wallet signatures, verified sessions, working callbacks, and independently verifiable decisions—not green CI alone.

## Release gates (every material release)

1. Exercise the actual user journey on the target surface.
2. Confirm secure authentication and authorization.
3. Validate callback and receipt integrity where applicable.
4. Confirm deployment SHA matches merged `main` (or documented hotfix commit).
5. Verify frontend states, error recovery, desktop and mobile usability.
6. Run read-only Production regression checks without creating unauthorized users, credentials, or trust decisions.

## Controlled boundaries (separate releases)

- Production database migrations for native accounts and partner metering.
- Native authentication activation on Production.
- Privileged grants (partner membership recovery, admin approvals).
- Customer billing until verification receipts reconcile with durable usage records.

## Founder release summary template

For each material release, report:

1. **What shipped** (commits, PR, deployment IDs).
2. **What works in Production** (evidence: journey, session cookie, receipt IDs).
3. **What remains disabled** (flags, schema, env).
4. **Acceptance evidence** (tests, screenshots, logs—no simulated signatures).
5. **What requires authorization** (migrations, grants, billing).

Keep internal diagnostics off customer-facing pages.
