# Independent SIAS verifier (Build #818)

Third-party relying-party example that verifies Abraxas receipts using **only** the standalone `@abraxas/independent-verifier` package.

It does **not** import Abraxas application verification modules or Supabase credentials.

## Trust model

1. **Pin** `trust-anchor-bundle.json` out-of-band (integrator security review).
2. Obtain a **signed issuer authority statement** (SIAS) through your own channel; HTTPS alone does not establish trust.
3. Supply **fresh status evidence** from your institution-operated adapter for current acceptability.

## Usage

```bash
npm ci
npx tsx examples/independent-sias-verifier/verify.ts \
  ./signed-receipt.json \
  ./trust-anchor-bundle.json \
  ./issuer-authority-statement.json \
  ./status-evidence.json
```

Environment:

- `RP_PARTNER_ID`, `RP_POLICY_ID` — audience binding
- `RP_ENVIRONMENT` — `production` or `demo`

Exit `0` only when cryptographic authenticity, issuer authorization, and current acceptability (with evidence) succeed.
