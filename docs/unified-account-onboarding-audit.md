# Unified account onboarding — identity relationship map

## Root cause (disconnected experience)

- **Holder plane:** `abraxas_browser_session` (HttpOnly JWT) via zkLogin/Google and wallet binding. Powers Passport, holder APIs, and `/account` wallet summary.
- **Partner plane:** `abraxas_partner_console_session` (HttpOnly JWT) issued only after `authenticatePartner()` validates a **server API key** (`POST /api/launchpad/auth/session`). Powers Launchpad, Integration Studio provisioning, and partner-scoped routes.
- **No authoritative mapping** from holder `subjectId` / wallet to `partner_id` without presenting a valid API key or operator provisioning. Email and wallet matches are intentionally not used for tenant linking.

## Existing relationships

| From | To | Mechanism |
|------|-----|-----------|
| Holder session | Passport, credentials, IDV | `requireBrowserSession` / `resolveAuthenticatedHolderSession` |
| API key | Partner console session | `issuePartnerConsoleSessionToken` |
| Partner session | Sandbox applications | Partner-scoped Launchpad APIs |
| Holder subject | Partner flow continuations | Policy-bound rows (`sui_address`, `holder_subject_id`) for **holder** journeys — not Launchpad operator auth |
| Design partner program | Partner records | Operator-reviewed tables (`partner_design_partner_program`) — not wallet-linked console auth |

## Missing infrastructure (for automatic linking)

- Durable **operator membership** table binding holder subject → partner_id with server-enforced roles.
- OAuth-style **delegated Launchpad access** without API key presentation (not implemented; would require new authorization contract and migration).

## Implemented UX (this PR)

- Unified `/account` hub with use-case navigation and session transparency.
- Profile menu destinations: Account, Passport, Applications, Organizations, Credentials, Settings.
- `/api/account/overview` read-only dual-session status (never merged).
- Secure operator session attach via existing key POST (password field, HttpOnly cookie only).

## Migration risks

- **Wallet / Passport:** Unchanged; no new wallets on account hub visit.
- **Partner tenants:** No silent merge; recovery remains API-key-based.
- **Future linking:** Any holder→org mapping must fail closed until backend contract exists.
