# Creditcoin hackathon deployment evidence

Complete this record from the JSON printed by the deployment scripts. Do not replace a value until the linked explorer confirms it.

## Source chain

- Network: Sepolia
- Registry address: `0x214C13C5131875B2212bFa7cEfB58ce030f141C9`
- Deployment transaction: `0x0077c77fe4efe904a8d36698c9fa6039af43031fb679fe649ee09f5ad5afc545`
- Example eligibility transaction: `0xbb36cec40a99e691ea325694e69afe0f5aa06842f8e7ca0691fa0d9b48ce49ef`
- Creditcoin source chain key: `1`

## Creditcoin

- Network: Creditcoin Testnet, chain ID 102031
- Native verifier: `0x0000000000000000000000000000000000000FD2`
- Abraxas USC address: `0xD64562a3F0858eB3b42fEf46895aD851EF2d2c91`
- Deployment transaction: `0xe9bb4e44a0b044f1972930d8a24851eb6e0df356d47e2014a88d828ba29acc77`
- Successful `verifyAndRecord` transaction: `0x854fe91372b93d634e2711176be453b3112648ce330b79253e584b008545dcaa`

## Acceptance evidence

- [x] Source registry deployment is visible in the Sepolia explorer.
- [x] Eligibility event contains hashes and the policy result only.
- [x] Attestcoin attestors have reached the required source height.
- [x] The proof builder returns a Merkle proof and continuity proof.
- [x] `verifyAndRecord` succeeds on Creditcoin.
- [ ] A second call with the same source transaction reverts.
- [x] `isEligible` returns true only for the matching unexpired policy.
