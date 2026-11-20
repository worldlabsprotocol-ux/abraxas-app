# Token-2022 remittance assignment — engineering report

## Status: **partial GO** (core public path green; confidential lifecycle pending zk VM)

## Module location

`solana/abraxas-eligibility-gate/remittance-assignment/`

## Implemented

| Area | Status |
|------|--------|
| Public remittance mint extensions | Green |
| Epoch fee calculation + `transfer_checked_with_fee` | Green |
| Default frozen + simulated KYC thaw | Green |
| Privacy mint (PermanentDelegate + CT mint config + CT fee config) | Green init tests |
| PermanentDelegate public-balance seizure demo | Green |
| Full confidential deposit/transfer/withdraw + ZK proofs | **Not run** (ignored; needs zk-elgamal proof program in ProgramTest) |
| CPI Guard optional challenge | **Ignored** |

## Test command

```bash
cd solana/abraxas-eligibility-gate
cargo test -p token2022-remittance-assignment
```

**Pass/fail (2026-11-20 PST):** 6 passed, 2 ignored (confidential lifecycle, CPI guard).

## Abraxas separation

No changes to entitlement consumer, proof continuity mint semantics, Launchpad, or production env. Workspace member only adds isolated crate.

## Privacy vs seizure finding

`PermanentDelegate` successfully moves **public** balances via `TransferChecked`. Confidential balances require confidential-transfer instructions and owner-approved ciphertext state; delegate authority does not substitute for decrypting or moving encrypted pending/available balances.