# Token-2022 remittance assignment — engineering report

## Status: **near GO** (public + confidential lifecycle green in ProgramTest; CPI Guard optional ignored)

## Module location

`solana/abraxas-eligibility-gate/remittance-assignment/`

## Implemented

| Area | Status |
|------|--------|
| Public remittance mint extensions | Green |
| Epoch fee calculation + `transfer_checked_with_fee` | Green |
| Default frozen + simulated KYC thaw | Green |
| Privacy mint (PermanentDelegate + CT mint + CT fee when public fee present) | Green |
| PermanentDelegate public-balance transfer | Green |
| Confidential configure / approve / deposit / apply / ZK transfer / withdraw | Green (lifecycle mint without public `TransferFeeConfig`; see README) |
| Confidential + public transfer fee in one mint | **Documented gap** (split proof context required on modern clusters) |
| CPI Guard optional challenge | **Ignored** stub |

## Test command

```bash
npm run test:remittance-assignment
# or
cd solana/abraxas-eligibility-gate && cargo test -p token2022-remittance-assignment
```

**Pass/fail (latest run):** 8 passed, 1 ignored (optional CPI guard).

## Privacy vs seizure finding

`PermanentDelegate` moves **public** balances via `TransferChecked`. After deposit into confidential balance, public amount is zero and delegate `TransferChecked` **fails** — encrypted balances are not recoverable via delegate authority alone.

## Abraxas separation

No changes to entitlement consumer, proof continuity mint semantics, Launchpad, or production env.