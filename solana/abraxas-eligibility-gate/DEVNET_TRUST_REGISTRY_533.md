# Devnet Trust Registry Deployment (Build #533) — OPERATOR RUNBOOK

**Status:** BLOCKED in CI/agent — requires operator wallet and explicit approval.

## Prerequisites

1. Solana CLI + Anchor 0.30.1 (match `Anchor.toml`)
2. Devnet SOL on governance, publisher, and revoker keypairs
3. Program keypair JSON for `878ysq3VvDKT5HNWWDFP5SvVJPqa5R4PktCbfiSksPJT` (or update `declare_id!` + TS constant together)
4. Upgrade authority custody documented

## Build (local)

```bash
cd solana/abraxas-eligibility-gate
anchor build -p abraxas_trust_registry
cargo test --workspace --offline
```

## Deploy (manual)

```bash
anchor deploy -p abraxas_trust_registry --provider.cluster devnet
```

## Rollback

- Deploy prior program artifact digest (see evidence JSON)
- Freeze registry: governance `set_policy_active(false)` for affected policies
- Rotate revoker/publisher tables via governance instructions

## Signer inventory (template)

| Role | Pubkey | Custody |
|------|--------|---------|
| Governance authority | _operator fills_ | HSM / multisig |
| Upgrade authority | _operator fills_ | Governance |
| Commitment publisher | _operator fills_ | Abraxas ops |
| Revoker | _operator fills_ | Abraxas ops |
