# BUILD #979 — Token-2022 receipt-backed entitlements

Local/sandbox only.

## Architecture

Evidence and authority stay in **proof-continuity** (`ReceiptCommitment`, issuer-signed updates). Token-2022 is an optional **usable right**: possession does not imply current validity; consumption re-reads receipt state.

```
Verify proof → Mint non-transferable entitlement → Relying party consumes (re-checks receipt)
```

## Programs

| Program | Role |
|---------|------|
| `abraxas_proof_continuity` | NonTransferable mint init, verified mint, `verify_receipt_backed_entitlement` |
| `abraxas_proof_entitlement_consumer` | `consume_verified_entitlement` + on-chain consumption ledger |

## NonTransferable

Mint account size includes `ExtensionType::NonTransferable`. Initialization order: `initialize_non_transferable_mint` then `initialize_mint2`.

## Tests

`npm run test:build-979` → `tokenization_entitlement.rs` (12 cases): mint adversarials, NT extension + transfer rejection, mint→consume→revoke→deny, duplicate consumption.

## Trust boundary

Consumer requires proof-continuity-owned accounts, holder-signed consumption, and shared verifier (token + issuance + **live** commitment status).