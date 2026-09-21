# Abraxas EVM eligibility verifier (reference)

Partner-owned Solidity verifier for EIP-712 chain eligibility attestations.

Abraxas does not deploy this contract to Arc, Ethereum, or any live chain.
Copy the source into your repository and deploy your own instance.

```
forge test -vv
```

The contract verifies a trusted signer, typed-data domain, expiry, one-time nonce,
and partner/policy/action/scope hashes. It cannot transfer tokens or execute partner actions.
