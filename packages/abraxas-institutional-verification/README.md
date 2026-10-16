# @abraxas/institutional-verification

Institutional offline verification for Abraxas signed decision receipts, holder presentations, and portable revocation checkpoints.

**Distribution status:** Controlled release artifact only — not published to npm until founder authorization. Install from `npm pack` tarball or `file:` path after `npm run build:institutional-sdk` in the Abraxas repository.

## Requirements

- Node.js **20+**
- Institution-pinned trust (`ABRAXAS_RECEIPT_VERIFICATION_REGISTRY` or digest-pinned network fetch)
- **Digest v2** pins for `ABRAXAS_RECEIPT_KEY_DOCUMENT_DIGEST`

## Install (local artifact)

```bash
# From abraxas-app repository root
npm run pack:institutional-sdk
# Produces packages/abraxas-institutional-verification/abraxas-institutional-verification-0.1.0.tgz

npm install /path/to/abraxas-institutional-verification-0.1.0.tgz
```

## Public API

See `DISTRIBUTION.md` for version policy, replay semantics, and migration notes.

```typescript
import {
  resolveInstitutionalTrustEnv,
  inspectSignedDecisionReceipt,
  verifySignedDecisionReceipt,
  RECEIPT_TRUST_DIGEST_VERSION,
} from "@abraxas/institutional-verification";
import { FileReceiptConsumptionStore } from "@abraxas/institutional-verification/consumption";
```

## Security

Inspect-only calls never grant access. Authorization requires durable replay storage and authenticated revocation evidence. See `SECURITY.md`.
