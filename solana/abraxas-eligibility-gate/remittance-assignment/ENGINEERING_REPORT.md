# Token-2022 remittance assignment — engineering report

## Status: **GO** (mandatory path; CPI Guard optional still ignored)

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Combined mint extensions | ✅ `inspect_combined_privacy_mint_extensions` |
| 2 | Confidential transfer **with fee** on combined mint | ✅ context-state `VerifyTransferWithFee` + `inner_transfer_with_fee` |
| 3 | PermanentDelegate seizure limit | ✅ lifecycle + delegate tests |
| 4 | Adversarial cases | ✅ wrong fee params; decryptable/proof mismatch |
| 5 | README + reproducible tests | ✅ |
| 6 | CPI Guard optional | ⏸ ignored |

## Combined mint extensions (verified via `StateWithExtensions`)

`TransferFeeConfig`, `MetadataPointer`, `DefaultAccountState`, `MintCloseAuthority`, `PermanentDelegate`, `ConfidentialTransferMint` (manual approval), `ConfidentialTransferFeeConfig`.

## Confidential fee path

- Epoch fee parameters read from mint for proof generation (`get_epoch_fee`).
- Proof pre-verification transaction → context state account owned by `ZkTokenProof1111...`.
- Transfer transaction references context account (`proof_instruction_offset = 0`).

## Tests

```bash
npm run test:remittance-assignment
```

**Latest:** 10 passed, 1 ignored.

## Seizure limitation

Delegate `TransferChecked` succeeds on public balances only. Post-confidential-deposit, delegate transfer fails; encrypted state is not accessible via PermanentDelegate.

## Submission decision

**GO** for class submission on mandatory requirements. CPI Guard remains optional/out of scope unless explicitly requested post-review.