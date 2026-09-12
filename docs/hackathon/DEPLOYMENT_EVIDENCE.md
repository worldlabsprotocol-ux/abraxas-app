# Creditcoin hackathon deployment evidence

Complete this record from the JSON printed by the deployment scripts. Do not replace a value until the linked explorer confirms it.

## Source chain

- Network: Sepolia
- Registry address: `0x214C13C5131875B2212bFa7cEfB58ce030f141C9`
- Deployment transaction: `0x0077c77fe4efe904a8d36698c9fa6039af43031fb679fe649ee09f5ad5afc545`
- Example eligibility transaction: `PENDING_END_TO_END_PROOF`
- Creditcoin source chain key: `1`

## Creditcoin

- Network: Creditcoin Testnet, chain ID 102031
- Native verifier: `0x0000000000000000000000000000000000000FD2`
- Abraxas USC address: `PENDING_TESTNET_DEPLOYMENT`
- Deployment transaction: `PENDING_TESTNET_DEPLOYMENT`
- Successful `verifyAndRecord` transaction: `PENDING_END_TO_END_PROOF`

## Acceptance evidence

- [x] Source registry deployment is visible in the Sepolia explorer.
- [ ] Eligibility event contains hashes and the policy result only.
- [ ] Attestcoin attestors have reached the required source height.
- [ ] The proof builder returns a Merkle proof and continuity proof.
- [ ] `verifyAndRecord` succeeds on Creditcoin.
- [ ] A second call with the same source transaction reverts.
- [ ] `isEligible` returns true only for the matching unexpired policy.
