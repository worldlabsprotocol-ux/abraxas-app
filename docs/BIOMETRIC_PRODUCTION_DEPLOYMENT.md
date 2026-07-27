# Abraxas Verify — Production Deployment Report

Generated for merge of **#67** (infrastructure) + **#72** (biometric engine) → `main`.

> **Living report:** See [`PRODUCTION_READINESS_REPORT.md`](./PRODUCTION_READINESS_REPORT.md) for current launch status, health checks, and blockers.

## Completed work

| Area | Status |
|------|--------|
| Merge #72 into #67 branch | Done (fast-forward) |
| Abraxas Verify default (`IDV_PROVIDER=manual`) | Done |
| Veriff opt-in only (`IDV_PROVIDER=veriff`) | Done |
| Biometric engine v1 (face, liveness, doc quality, aspect) | Done |
| Decision engine (reject / human_review / auto_approve) | Done |
| Auto-approve **disabled** by default | Done |
| Capture session auth (httpOnly cookie) | Done |
| Client preflight (browser quality checks) | Done |
| Admin review queue with engine scores | Done |
| L2 credential + `abraxas_capture` claims | Done |
| On-chain passport provision hook | Done |
| Migrations `036_identity_capture_metadata.sql`, `037_biometric_assessments.sql` | In repo |
| Health endpoints | Done |
| Rate limiting (5/hour/wallet, configurable) | Done |
| Structured audit logging (Vercel log drain) | Done |
| Retention policy constants | Done |
| Pipeline + guard tests | Done |

## Production readiness score

| Layer | Score | Notes |
|-------|-------|-------|
| **Infrastructure** | 9/10 | Capture, admin, issuance, health APIs |
| **Biometric engine** | 6/10 | v1 heuristics — human review backs it |
| **Security** | 8/10 | Session auth, rate limit, private storage |
| **Ops / monitoring** | 7/10 | JSON logs + health endpoints; no APM yet |
| **Mainnet on-chain** | 4/10 | Devnet ready; mainnet package not deployed |
| **Overall biometric deploy** | **8/10** | Ready for pilot with human review |

## Remaining blockers

### Before Vercel deploy
1. **Merge PR #67** (now includes #72) into `main`
2. **Run Supabase migrations** in SQL editor:
   - `036_identity_capture_metadata.sql`
   - `037_biometric_assessments.sql`
3. **Set Vercel env** (see below)
4. Verify: `npm run biometric:verify-migrations` (with Supabase env)
5. Verify: `npm run biometric:health` (against production URL)

### Before Sui mainnet
1. Move Passport audit published (gate #2)
2. `CONFIRM_MAINNET=1 npm run sui:deploy:mainnet`
3. `npm run sui:mint-cap -- mainnet`
4. Flip `SUI_NETWORK=mainnet` in Vercel

### Before enabling auto-approve
1. Process 50+ real captures through human review
2. Tune thresholds from production score distribution
3. Only then set `ABRAXAS_BIOMETRIC_AUTO_APPROVE=1`

## Security concerns

| Risk | Severity | Mitigation |
|------|----------|------------|
| v1 face match is correlation-based, not ML | Medium | Human review on all captures (production default) |
| Single-frame liveness heuristics | Medium | Reject obvious failures; admin confirms edge cases |
| Rate limit uses DB counts (not Redis) | Low | Sufficient for pilot; upgrade for high traffic |
| Document images in Supabase | Medium | Private bucket; 90-day retention policy documented |
| Admin approve is single PIN | Medium | Restrict `/admin` access; rotate `ADMIN` credentials |
| No formal penetration test | Medium | Gate #4 credential API review planned |

## Production env (Vercel)

```env
IDV_PROVIDER=manual
ABRAXAS_SIGNING_KEY={...Ed25519 JWK...}
ABRAXAS_BROWSER_SESSION_SECRET=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUI_NETWORK=devnet
SUI_SPONSOR_SECRET_KEY=suiprivkey1...
SUI_ISSUANCE_CAP_OBJECT_ID=0x...

# Production biometric policy — human review only
# Do NOT set ABRAXAS_BIOMETRIC_AUTO_APPROVE

# Optional tuning
ABRAXAS_CAPTURE_RATE_LIMIT_PER_HOUR=5
ABRAXAS_BIOMETRIC_DOC_RETENTION_DAYS=90
ABRAXAS_BIOMETRIC_ASSESSMENT_RETENTION_DAYS=365
```

## Identity flow verification checklist

1. `/passport` → Sign in (Google zkLogin)
2. Abraxas Verify capture → name + ID + selfie
3. `POST /api/identity/documents/capture` → engine runs → `human_review` queue
4. `/admin/identity` → preview + Approve L2
5. Credential issued → `/api/identity/status` → `earned`
6. On-chain passport → sponsor provisions stamps (devnet)

## Health endpoints

| Endpoint | Expected |
|----------|----------|
| `GET /api/idv/independent/status` | `abraxas_independent: true`, `status: live` or `partial` |
| `GET /api/idv/biometric/status` | `production_policy: human_review_only` |
| `GET /api/verify/layer` | Independent biometric item present |
| `GET /api/mainnet/readiness` | Gate 1 done; gates 2–7 pending |

## Recommended next steps toward Sui mainnet

1. Ship biometric branch to production (this report)
2. Run Good Trouble pilot with human review queue
3. Complete verification layer PRs (proof persistence E2E)
4. Publish Move audit
5. Deploy package to Sui mainnet
6. First unaffiliated relying party production check
7. Re-evaluate auto-approve after production biometric data
