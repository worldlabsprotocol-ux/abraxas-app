# Build #830 — External developer integration (HTTP)

## 1. Defect

`START_HERE.md` showed `import { AbraxasPartnerKit } from "@/lib/partner/integrationKit"` — an internal Next.js alias. External developers cannot copy that into their own repository.

Partner Kit remains valuable **inside** the Abraxas monorepo; the **public contract** for hosted handoff is already `POST /api/v1/partner-handoff` (see `hostedHandoffHttpExamples`).

## 2. Approach

**Minimum surface:** HTTPS + `@abraxas/independent-verifier` only.

No new SDK. No Supabase. No `@/lib` in the consumer app.

## 3. Executable example

`examples/external-node-partner/` — copy-ready Node app:

- `npm start` → `/verify` creates handoff, redirects holder, `/callback` fetches portable bundle and enforces permit/deny/indeterminate.

## 4. START_HERE

Rewritten for external developers — run the example first; HTTP details in `HTTP_API.md`.

## 5. Clean execution

```bash
npm run test:build-830-external-http-integration
./scripts/build830/prove-external-copy.sh
```

## 6. Developer setup steps (measured)

| Step | Action |
|------|--------|
| 1 | Copy `examples/external-node-partner` |
| 2 | `cp .env.example .env` + secure credentials |
| 3 | Copy trust anchor JSON |
| 4 | `npm install` |
| 5 | Allowlist callback URL |
| 6 | `npm start` → verify flow |

Independent verify after receipt: **4** verifier inputs (unchanged from #821).

## 7. Remaining blockers before external invite

- Publish `@abraxas/independent-verifier` to npm (optional; file/tgz install documented).
- Founder secure provisioning (API key, allowlist, anchor).
- Partner allowlists **HTTPS** callback if not using localhost tunnel.

## 8. Boundaries

No Production migrations, infra purchases, or billing activation in this build.
