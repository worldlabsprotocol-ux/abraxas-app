# Security — institutional verification SDK

- **No Supabase trust root** — verification uses institution-pinned registry JSON or digest-pinned fetch only.
- **Fail closed** — missing revocation evidence, stale portable checkpoints, or replay store gaps block authorization.
- **Inspect ≠ authorize** — `inspectSignedDecisionReceipt` and `inspectHolderTrustPresentation` never set `authorize: true`.
- **No private keys** in the package artifact; synthetic fixtures are labeled non-production.
- **Revocation feeds** must come from institution-operated adapters with freshness guarantees; arbitrary JSON is not issuer evidence.

Bundled artifact excludes optional on-chain conformance vectors; chain attestation verification is not included in the default SDK bundle.
