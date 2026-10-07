# PartnerKit distribution (@abraxas/partner-kit)

## Publication status

| Channel | Status |
|---------|--------|
| **Monorepo workspace** | Available: `"@abraxas/partner-kit": "workspace:*"` |
| **Versioned tarball** | Built via `npm run partner-kit:pack` → `dist/partner-kit-release/abraxas-partner-kit-0.1.0.tgz` |
| **Public npm** | **Not published** — package is `UNLICENSED`; public registry publication requires an explicit licensing decision |

Public npm install (`npm install @abraxas/partner-kit`) is **not** available today. Do not document it as live until publication occurs.

## Install from versioned tarball (external teams)

1. Obtain `abraxas-partner-kit-0.1.0.tgz` and matching `.sha256` checksum from your Abraxas contact or a tagged GitHub Release artifact.
2. Verify checksum: `sha256sum -c abraxas-partner-kit-0.1.0.tgz.sha256`
3. Install in your server project:

```bash
npm install ./abraxas-partner-kit-0.1.0.tgz
```

4. Import (server-side only):

```typescript
import { AbraxasPartnerKit, permitProtocolAction } from "@abraxas/partner-kit";
import { evaluatePublicReceiptTrust } from "@abraxas/partner-kit/trust";
import { verifyPartnerWebhookEvent } from "@abraxas/partner-kit/webhooks";
```

## Build artifact (maintainers)

```bash
npm run partner-kit:pack
```

Outputs:

- `dist/partner-kit-release/abraxas-partner-kit-0.1.0.tgz`
- `dist/partner-kit-release/abraxas-partner-kit-0.1.0.tgz.sha256`

To attach to a GitHub Release: upload both files; external partners install from the release asset.

## Server-side credential warning

Store `abx_test_*` and `abx_live_*` credentials in server environment variables only. Never embed in browser or mobile client code. Callbacks and webhooks are completion signals — call `verifyForAction` before granting access.

## Related

- [External integration handoff](./EXTERNAL_INTEGRATION_HANDOFF.md)
- [PartnerKit usage](./PARTNER_KIT.md)
- [Integration Kit docs](https://abraxasworld.xyz/docs/integration-kit)
