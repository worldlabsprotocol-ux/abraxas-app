# Trust architecture audit (Build #529)

Machine-readable graph: run `npm run evidence:protocol-sovereignty-529`.

## Guarantee classes

| Class | Meaning |
|-------|---------|
| `protocol_cryptography` | Ed25519 receipts, policy binding, validity — verifiable without Abraxas DB |
| `blockchain_enforced` | Solana gate + receipt commitment digests — independently observable |
| `abraxas_operated_infrastructure` | API auth, replay RPC, consume orchestration |
| `optional_internal_storage` | Supabase persistence — swappable via ports in `lib/protocol/trust/persistence/` |

## DB-only risk nodes

Replay reservation, partner API credentials, and raw audit persistence currently require Abraxas-operated Postgres. Cryptographic permit decisions do **not** rely on DB alone when chain assurance tier is `chain_required`.

## Partner independence

Relying parties integrate via HTTPS + `InstitutionalReferenceClient`. Verification uses signed receipts and optional public chain data — not Supabase credentials or internal table schemas.
