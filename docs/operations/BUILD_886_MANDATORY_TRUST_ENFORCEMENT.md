# Build 886 — Mandatory trust enforcement

## Objective

Close enforcement bypass gaps from Build 885 review: mandatory receipt modes, cryptographically established issuer authority, and immutable protected transaction context.

## Entrypoint

`enforceProtectedInstitutionalAction()` in `lib/institutional/mandate/enforceInstitutionalAction.ts`

### Trusted inputs (not caller flags)

| Input | Source |
|-------|--------|
| `trustedEnforcementPolicy` | Relying-party trusted config (`mandate_only` vs `mandate_and_abraxas_receipt`) |
| `trustedExecution` | Server-sealed transaction + `context_digest` |
| `signedIssuerAuthority` + `trustAnchorPublicJwk` | Pinned out-of-band trust material |
| `independentReceipt` | Required when policy mode is `mandate_and_abraxas_receipt` (with evidence commitment binding) |

### Bypass fixes (Track A)

- Removed reliance on optional `requireIndependentReceipt` for protected actions — mode comes from trusted policy only.
- `mandate_and_abraxas_receipt` requires receipt + mandate binding (evidence commitment).
- Transaction fields must match sealed `context_digest` (prevents valid mandate/receipt with swapped transaction).

## Verification

```bash
npm run test:build-886-mandatory-trust-enforcement
npm run build886:mandatory-trust-enforcement-evidence
npx tsx scripts/build-886/external-relying-party-execution.ts
```

## PR #885 CI (merged)

GitHub CI on PR #885: **green** (typescript, eslint, build, Vercel preview).

## Not claimed

- Live external institutional issuer
- Production wallet journey completion
- 9/10 scorecard increase
