# BUILD #981 — Independent partner acceptance

Local ProgramTest / sandbox only.

## Partner example

`examples/independent-solana-entitlement-partner/` — README, `run-acceptance.sh`, artifacts from executed journeys.

## Independent verification

- Library: `solana/abraxas-eligibility-gate/integration-tests/src/entitlement_partner.rs`
- CLI: `cargo run --bin partner-verify authorized|revoked`
- Uses `verify_receipt_backed_entitlement` + on-chain account decode (no hosted UI)

## Acceptance matrix

| # | Scenario | Status | Evidence |
|---|----------|--------|----------|
| 1 | Valid trusted partner consumes | PASS | `partner_complete_authorized_journey` |
| 2 | Wrong partner policy | PASS | `tokenization_entitlement::build980_caller_selected_policy_rejected` |
| 3 | Foreign registry | PASS | `build980_foreign_registry_consumption_rejected` |
| 4 | Wrong application | PASS | `build980_untrusted_application_hash_rejected` |
| 5 | Wrong holder | PASS | `partner_wrong_holder_consume_rejected` |
| 6 | Fake / substituted receipt | PASS | `build980_substituted_commitment_rejected` |
| 7 | Invalid issuer proof | PASS | `partner_unauthorized_issuer_commit_rejected` |
| 8 | Expired receipt | PASS | `partner_expired_receipt_consume_denied`, `expired_proof_entitlement_mint_rejected` |
| 9 | Revoked receipt | PASS | `partner_revoke_then_deny_while_token_remains`, `build980_revoked_*` |
| 10 | Duplicate issuance | PASS | `duplicate_entitlement_mint_rejected` |
| 11 | Duplicate consumption | PASS | `duplicate_relying_party_consumption_rejected` |
| 12 | Wrong mint | PASS | `wrong_policy_registry_entitlement_mint_rejected` (registry-bound mint) |
| 13 | Unauthorized direct mint | PASS | `unauthorized_direct_token_mint_rejected` |
| 14 | Non-transferable transfer | PASS | `non_transferable_token_transfer_rejected` |
| 15 | Unauthorized config change | PASS | `build980_unauthorized_config_update_rejected` |
| 16 | Stale / replay authorization | PASS | `proof_continuity::duplicate_version_replay_rejected` |
| 17 | Verify without hosted UI | PASS | `partner_independent_verification_without_hosted_ui`, `partner-verify` CLI |

## Commands

```bash
npm run test:build-981
bash examples/independent-solana-entitlement-partner/run-acceptance.sh
cd solana/abraxas-eligibility-gate && cargo test --workspace
```

## Limitations

- Artifacts reflect **BanksClient** execution IDs, not public-cluster transaction signatures.
- Partner admin key compromise can rotate trusted config (by design).
- No mainnet program deployment in this build.