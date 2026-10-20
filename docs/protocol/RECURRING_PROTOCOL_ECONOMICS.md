# Recurring protocol economics — code-grounded assessment

**Status:** Architecture and business-model assessment only. No production billing UI, token issuance, or hidden charges are authorized by this document.

## Shipped capabilities (today)

| Capability | Location | Economic relevance |
| --- | --- | --- |
| Policy evaluation + decision receipts | Partner flows, sandbox test verify, institutional verification packages | Core meterable trust service when invoked by relying parties |
| Independent receipt validation | `mapReceiptValidationOutcome`, institutional verification SDK/registry | Value is **verifiability without Abraxas API dependency** — must not be paywalled |
| Integration Studio + developer surfaces | `/developers/integration-studio`, `/developers` | Onboarding and configuration; natural place for **entitlement** messaging (not implemented as usage billing) |
| Institutional SDK distribution entitlement | `lib/institutionalVerification/sdkDistributionEntitlement.ts` | Operator-controlled allowlist (`INSTITUTIONAL_SDK_DISTRIBUTION_ENTITLEMENTS`) — **access gate**, not metered usage |
| Partner auth scopes | `lib/partner/partnerAuth.ts` includes `metering:read` | Suggests planned/read-side usage observability, not a live settlement layer in app UI |
| Solana wallet auth + sandbox workspace | `lib/auth/ephemeralWallet/*` | Native auth and test infrastructure; no on-chain fee collection in these paths |
| Trust boundary inventory | `lib/infrastructure/trustBoundaryInventory.ts` references partner webhooks and metering | Documentation of boundaries, not a billing product |

Verification contract language explicitly preserves independence from billing (`lib/institutionalVerification/verificationContractDocument.ts`).

## Operations that legitimately create recurring value

Ranked by viability given current code:

1. **Institution-paid policy evaluations** — Each eligibility decision (production partner flow, institutional operator paths) consumes evaluation, signing, and audit infrastructure. Metering partner API calls or evaluated decisions aligns with delivered trust service.
2. **Verified integration / SDK entitlement** — Extend existing SDK entitlement pattern to tiered partner programs (design partner, production go-live). Already partially implemented as allowlist gate.
3. **Usage-based verification services** — Webhook delivery health, replay tooling, staging certification, and operator review workflows (`lib/partner/*`, institutional certification modules) support a **service fee** model without custodial identity storage.
4. **Partner integration support** — Integration Studio configuration, starter kits, and sandbox certification are sellable services adjacent to open verification semantics.

## Lower viability / higher risk without new product proof

- **Per-wallet or per-sign-in fees** — Conflicts with user ownership narrative and wallet UX; not present in codebase as a product direction.
- **Mandatory Abraxas API for cryptographic verification** — Would undermine `standalone_cryptographic_verification` and institutional SDK goals; explicitly avoided in validation copy and contracts.
- **Token-only settlement** — No production token fee or settlement pipeline is shipped in this repository; Solana paths focus on auth, receipts, and optional on-chain gates in partner/institutional modules, not protocol revenue capture.

## Solana primitives and metering (feasibility)

**Existing:** Wallet message signing for auth and scoped actions; devnet/testnet gate and trust-registry related modules in institutional/partner trees; receipt verification keys and registry concepts in `@abraxas-institutional-verification`.

**Not shipped as protocol revenue:** SPL transfer fees, program-enforced micropayments, or on-chain usage counters tied to Abraxas billing.

**Technically investigatable (future, not authorized here):**

- Solana **transaction memo** or program log hooks for audit (off-chain billing reconciliation).
- **Tokenized settlement** only if it reduces partner reconciliation cost or enables enforceable multi-party settlement — would require explicit payer/payee, replay-safe payment intent, refund semantics, and independence of receipt verification from payment status.

## Design principles (founder)

- Capture value from **repeated, legitimate trust services** (evaluation, issuance orchestration, integration operations).
- Preserve **independently verifiable** outcomes and user control of evidence.
- No misleading wallet prompts, forced token purchases, or fees on ordinary product discovery.

## Proposed additions (not implemented)

- Usage accounting API backed by existing partner identity and evaluation logs (read scopes such as `metering:read`).
- Commercial terms surfaced in Launchpad / partner contract flows, separate from sandbox Developer Workspace.
- Optional Solana settlement research doc / spike — **not** merged into production UI without explicit authorization.
