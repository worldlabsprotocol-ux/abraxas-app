# Institutional multiparty authorization boundary

Abraxas separates wallet authentication from institutional authority.

## Current model

- **Wallet control** proves address possession for scoped actions.
- **Issuer credentials** prove eligibility outcomes with minimal disclosure.
- **Policy evaluation** binds decisions to partner, policy version, and resource.
- **Signed receipts** let relying parties verify outcomes independently.

Controlling a wallet does not prove company representation, issuer authority, or regulated eligibility.

## Future multiparty approvals

Multiparty institutional approvals can extend the same execution model by requiring multiple independent claim types or approver attestations in `required_claims`, each with its own issuer trust root and freshness rules.

This build does not implement escrow, custody, settlement, or banking workflows.
