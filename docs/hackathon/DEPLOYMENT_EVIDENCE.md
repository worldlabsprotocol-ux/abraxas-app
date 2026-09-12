# Creditcoin hackathon deployment evidence

Complete this record from the JSON printed by the deployment scripts. Do not replace a value until the linked explorer confirms it.

## Source chain

- Network: Sepolia
- Registry address: `PENDING_TESTNET_DEPLOYMENT`
- Deployment transaction: `PENDING_TESTNET_DEPLOYMENT`
- Example eligibility transaction: `PENDING_END_TO_END_PROOF`
- Creditcoin source chain key: `PENDING_CHAININFO_LOOKUP`

## Creditcoin

- Network: USC testnet, chain ID 102033
- Native verifier: `0x0000000000000000000000000000000000000FD2`
- Abraxas USC address: `PENDING_TESTNET_DEPLOYMENT`
- Deployment transaction: `PENDING_TESTNET_DEPLOYMENT`
- Successful `verifyAndRecord` transaction: `PENDING_END_TO_END_PROOF`

## Acceptance evidence

- [ ] Source registry deployment is visible in the Sepolia explorer.
- [ ] Eligibility event contains hashes and the policy result only.
- [ ] Attestcoin attestors have reached the required source height.
- [ ] The proof builder returns a Merkle proof and continuity proof.
- [ ] `verifyAndRecord` succeeds on Creditcoin.
- [ ] A second call with the same source transaction reverts.
- [ ] `isEligible` returns true only for the matching unexpired policy.
