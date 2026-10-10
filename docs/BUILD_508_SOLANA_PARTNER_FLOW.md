# Build #508 — Solana-native hosted partner flow

## PR stack

1. **#618** → `cursor/web3-native-wallet-auth-505-ffe` (open)
2. **#619** → `cursor/solana-native-protocol-506-5ffe`
3. **#620** → `cursor/solana-native-passport-idv-gt-507-5ffe`
4. **#508 PR** → `cursor/solana-native-partner-flow-508-5ffe` (base: **#620 branch**)

## Core modules

| Module | Role |
|--------|------|
| `lib/partner/partnerFlowHolderContext.ts` | `requirePartnerFlowHolder` — session + wallet binding gate |
| `lib/partner/solanaNativePartnerPolicyRouting.ts` | Legacy → Solana successor policy routing (Cielo, Good Trouble) |
| `lib/auth/ensurePartnerHolderSession.ts` | Client session probe (Phantom vs zkLogin) |

## API routes migrated off `requireBrowserSession`

- `/api/v1/partner-flow/evaluate|complete|refresh|purchase-return|agent/inspect`
- `/api/v1/verification-requests/[id]` (+ consent, decline)
- `/api/v1/partner-verify/continue-binding|method-qualification|resume/activate|good-trouble/dob-prequal`

Holder subject for receipts and verification requests is the **claims subject key** (never client-supplied).

## Policy routing (Phase 4)

When holder mode is `solana_native`:

| Requested policy | Effective policy |
|------------------|------------------|
| `cielo-verified-guest-v1` | `cielo-verified-guest-solana-v1` |
| `good-trouble-age_21_retail-v1` | `good-trouble-age_21_retail-solana-v1` |

Unauthorized substitution returns `403 policy_substitution_denied`.

Solana holders are blocked from Good Trouble **DOB prequal** (`identity_evidence_required`).

## Holder UX

- `PartnerVerifyClient` + `PartnerVerifyShell`: Phantom-primary when `NEXT_PUBLIC_ABRAXAS_SOLANA_NATIVE`
- `PartnerContinueClient`: wallet session + `HolderSignInPanel` on continue path
- `hostedHolderEligibility`: Cielo + Solana Good Trouble purchase policies

## Partner platform notes

Integration Studio / Launchpad: partners pin policy ids as today; Solana routing applies at **evaluate/consent** for Phantom holders. Starter kits should document Solana successor policy ids for new integrations.

## Demo rollout

Same flags as #507 + wallet-first (#618). No new migrations in #508.

## Rollback

Disable Solana-native flags → legacy zkLogin partner flow resumes. Route changes are flag- and session-mode-gated.

## E2E status

Integration tests cover holder auth gates and policy routing. Live Phantom → receipt → partner verify requires demo deployment + qualified evidence (not fabricated in CI).
