# Build #740 — Public legacy auth removal inventory

## Removed from public experience

| Item | Location | Notes |
|------|-----------|--------|
| Passport (legacy) nav link | `PublicNavConnectButton` unavailable menu | Deleted |
| Passport (legacy) workspace link | `HomeSandboxSessionEntry` | Deleted |
| Holder `NavProfileMenu` on public header | `PublicNavConnectButton` | No Google/zkLogin profile on homepage nav |
| Retry sign-in in header unavailable menu | `PublicNavConnectButton` | Single Explore path instead |
| `PUBLIC_CONNECT_PASSPORT_LEGACY_HREF` | `publicNavConnectBehavior.ts` | Removed export |
| Legacy holder session driving nav phase | `resolvePublicNavConnectPhase` | Replaced by `resolvePublicNavSignInPhase` |

## Retained (not public onboarding)

- `/passport` routes and holder verification flows (policy/evidence/receipt paths)
- `NavProfileMenu`, zkLogin chooser, Google hooks — internal/legacy surfaces not linked from new public header
- Passport wallet auth APIs (`passportWalletAuth`) for explicit server-verified wallet challenges
- Native passkey account stack (`lib/auth/nativeAccount/*`)

## Added

- `PublicNavWalletButton` — Wallet Standard Sui connect (optional, not account auth)
- `PublicNavExploreLink` — Integration Studio without sign-in
- Sign in label for passkey (was ambiguous “Connect”)
