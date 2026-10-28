# Build 883 — Continuous trust | Production evidence and institutional authority

Three parallel tracks with explicit evidence tiers. **No 9/10 score claim** without founder Production wallet completion and live mandate issuer proof.

## Track A | Production execution evidence

**Automated (Preview / Production shell):**

```bash
LAUNCHPAD_STAGING_URL=https://abraxasworld.xyz npm run test:build-883-playwright
```

**Full orchestrator:**

```bash
BUILD883_WALLET_HOST=https://abraxasworld.xyz npm run build883:continuous-trust-evidence
```

**Manual checkpoint (required for Track A completion):** one browser session on Production — wallet control → **Check your proof** (real validate) → create test app → policy → callback → partner request → portable verify. Record redacted artifacts; do not merge with Demo-only partner legs.

## Track B | Institutional mandate verification

**Synthetic relying-party gate:** `lib/institutional/transactionMandateEnforcement.ts`

- Proves transaction-specific scope (actor, amount, destination, tenant, policy, expiry, revocation)
- **Wallet control receipt does not satisfy mandate** (`walletControlReceiptSatisfiesMandate()`)

```bash
npm run test:build-883-mandate
```

Not claimed: external custody co-signer integration or live institutional issuer feed.

## Track C | Deployed security operations

Reuses Build 874 drill catalog (simulated CI). Production disruptive drills **blocked** without operator authorization.

```bash
npm run build874:security-operations-drills
```

## Artifacts

- `/opt/cursor/artifacts/build-883/continuous-trust-evidence.json`
- `/opt/cursor/artifacts/build-883/playwright/` (when Playwright runs)

## Reused endpoints (no new protocol)

- `/api/auth/wallet/sandbox/*` — wallet workspace
- `/api/v1/partner-handoff` — partner requests
- Portable bundle + `@abraxas/independent-verifier`
- Build 874 adversarial vitest suites
