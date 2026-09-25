# Isolated Solana reference workspace

The reviewed V2 eligibility-gate binary is deployed on **Solana devnet** at
`4hf3cY57ciPakr4omyTSbksAfW672iGrdo6fiDVQAD4K`. The deployment transaction
`51Xhh2Zuj57B4C1kJmH7XVM222u7pmHoTX9YU7iwcBmdA3kTU6rAQW2Z7hkcFUSu9BEg9moLSDZLUJ4bg7CDFvSL`
finalized at slot `502739924`. The on-chain dump matched the reviewed r2 ELF hashes.

The GateConfig PDA `53wiHMzFX9GttuVFQyQTvJGw9XvQmBbTcsGbwXQyk3D6` was
initialized with reviewed config digest
`0xdccb2101a22ce8affbcde3b5923cea06ffe6225ceb72f368e83ff796cc1c6103`.
The protocol-access consumer is deployed at
`3B9eE1WtrtZQwJrkhFSKxxaZrefRJ73P53xHBBP3Bv1j` and its config PDA
`BPYeZySvW4k5GKoUnuXi5cPYhq8J3AcZB9tA8mLsbyYL` passed the exact
postcheck. The sandbox deployment is registered in DEMO Launchpad as
`verified_sandbox` and requires institutional V2 attestations.

Registration and configuration do not prove a completed holder-to-consumer
transaction. An on-chain authorize, consume, replay-denial, and expiry sequence
still needs a public devnet demonstration. There is no Mainnet deployment or
funds-execution path.

