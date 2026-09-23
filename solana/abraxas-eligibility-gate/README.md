# Isolated Solana reference workspace

The reviewed V2 eligibility-gate binary is deployed on **Solana devnet** at
`4hf3cY57ciPakr4omyTSbksAfW672iGrdo6fiDVQAD4K`. The deployment transaction
`51Xhh2Zuj57B4C1kJmH7XVM222u7pmHoTX9YU7iwcBmdA3kTU6rAQW2Z7hkcFUSu9BEg9moLSDZLUJ4bg7CDFvSL`
finalized at slot `502739924`. The on-chain dump matched the reviewed r2 ELF hashes.

This is **not an active eligibility gate**. GateConfig has not been initialized,
the reference consumer is not deployed, and no partner deployment is registered
for issuance. Other program IDs in this workspace remain local fixtures. There
is no Mainnet deployment or funds-execution path.
